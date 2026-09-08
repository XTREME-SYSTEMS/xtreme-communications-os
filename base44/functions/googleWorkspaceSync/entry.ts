import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, service, target } = body;

    const SERVICE_MAP = {
      googledrive: 'googledrive',
      gmail: 'gmail',
      googlecalendar: 'googlecalendar',
      googletasks: 'googletasks',
      googledocs: 'googledocs',
      googlesheets: 'googlesheets',
    };

    const connectorType = SERVICE_MAP[service] || service;

    if (action === 'status') {
      try {
        await base44.asServiceRole.connectors.getConnection(connectorType);
        return Response.json({ connected: true, email: user.email });
      } catch {
        return Response.json({ connected: false });
      }
    }

    let connType = connectorType;
    if (action?.startsWith('sync_')) {
      const actionService = action.replace('sync_', '');
      connType = SERVICE_MAP[actionService] || actionService;
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection(connType);
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    if (action === 'sync_googledrive') {
      const [intel, templates, assets] = await Promise.all([
        base44.entities.IndustryProfile.list().catch(() => []),
        base44.entities.CommunicationTemplate.list().catch(() => []),
        base44.entities.CreativeAsset.list().catch(() => []),
      ]);

      const backup = JSON.stringify({
        exported_at: new Date().toISOString(),
        intelligence: intel,
        templates: templates,
        creative_assets: assets.filter(a => a.content_type === 'text'),
      }, null, 2);

      const boundary = 'xtreme_boundary_' + Date.now();
      const metadata = JSON.stringify({ name: `Xtreme_Intelligence_Backup_${new Date().toISOString().slice(0,10)}.json`, mimeType: 'application/json' });
      const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${backup}\r\n--${boundary}--`;

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartBody,
      });

      const fileData = await uploadRes.json();
      return Response.json({ summary: `Synced ${intel.length} intelligence, ${templates.length} templates, ${assets.length} assets to Drive`, file_id: fileData.id });
    }

    if (action === 'sync_gmail') {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20', { headers: authHeader });
      const data = await res.json();
      const messages = data.messages || [];
      const details = [];
      for (const msg of messages.slice(0, 10)) {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`, { headers: authHeader });
        const msgData = await msgRes.json();
        const headers = msgData.payload?.headers || [];
        details.push({
          id: msg.id,
          subject: headers.find(h => h.name === 'Subject')?.value || 'No subject',
          from: headers.find(h => h.name === 'From')?.value || 'Unknown',
        });
      }

      const memories = await base44.entities.ConversationMemory.filter({ channel: 'email', status: 'new' }).catch(() => []);
      return Response.json({ summary: `${details.length} messages retrieved, ${memories.length} email memories linked`, messages: details });
    }

    if (action === 'sync_googlecalendar') {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&maxResults=50`, { headers: authHeader });
      const data = await res.json();
      const events = data.items || [];

      const memories = await base44.entities.ConversationMemory.filter({ status: 'new' }).catch(() => []);
      let created = 0;
      for (const mem of memories) {
        const items = mem.action_items || [];
        for (const item of items) {
          if (item.due_date && !item.done) {
            await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                summary: `Agent Task: ${item.item}`,
                description: `From: ${mem.agent_name} - ${mem.summary || ''}`,
                start: { dateTime: item.due_date },
                end: { dateTime: new Date(new Date(item.due_date).getTime() + 30 * 60 * 1000).toISOString() },
              }),
            });
            created++;
          }
        }
      }
      return Response.json({ summary: `${events.length} upcoming events, ${created} agent tasks logged to Calendar` });
    }

    if (action === 'sync_googletasks') {
      const listsRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', { headers: authHeader });
      const listsData = await listsRes.json();
      const taskLists = listsData.items || [];
      let listId = taskLists[0]?.id;

      if (!listId) {
        const createListRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Xtreme Agent Tasks' }),
        });
        const newList = await createListRes.json();
        listId = newList.id;
      }

      const memories = await base44.entities.ConversationMemory.filter({ status: 'new' }).catch(() => []);
      let created = 0;
      for (const mem of memories) {
        for (const item of (mem.action_items || [])) {
          if (!item.done) {
            await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${listId}/tasks`, {
              method: 'POST',
              headers: { ...authHeader, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: item.item,
                notes: `From: ${mem.agent_name} - ${mem.summary || ''}`,
                due: item.due_date || undefined,
              }),
            });
            created++;
          }
        }
      }
      return Response.json({ summary: `${created} agent action items synced to Google Tasks` });
    }

    if (action === 'sync_googledocs') {
      const templates = await base44.entities.CommunicationTemplate.list().catch(() => []);
      let created = 0;
      for (const tmpl of templates.slice(0, 20)) {
        const docRes = await fetch('https://docs.googleapis.com/v1/documents', {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: `Xtreme Template: ${tmpl.industry}_${tmpl.channel}_${tmpl.situation}` }),
        });
        const doc = await docRes.json();
        if (doc.documentId) {
          await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
            method: 'POST',
            headers: { ...authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{ insertText: { location: { index: 1 }, text: tmpl.template_body || '' } }],
            }),
          });
          created++;
        }
      }
      return Response.json({ summary: `${created} templates exported to Google Docs` });
    }

    if (action === 'sync_googlesheets') {
      const contacts = await base44.entities.CampaignContact.list().catch(() => []);
      const campaigns = await base44.entities.Campaign.list().catch(() => []);

      const sheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: `Xtreme_Export_${new Date().toISOString().slice(0,10)}` },
          sheets: [{ properties: { title: 'Contacts' } }],
        }),
      });
      const sheet = await sheetRes.json();

      if (contacts.length > 0) {
        const values = contacts.map(c => [c.full_name || '', c.email || '', c.phone || '', c.company || '', c.status || '']);
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet.spreadsheetId}/values/Contacts!A2:append?valueInputOption=RAW`, {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values }),
        });
      }

      return Response.json({ summary: `${contacts.length} contacts and ${campaigns.length} campaigns exported to Google Sheets`, spreadsheet_id: sheet.spreadsheetId });
    }

    if (action === 'sync_intelligence') {
      let data = [];
      if (target === 'agent_memory') data = await base44.entities.ConversationMemory.list().catch(() => []);
      else if (target === 'ai_agents') data = await base44.entities.AgentPersona.list().catch(() => []);
      else if (target === 'templates') data = await base44.entities.CommunicationTemplate.list().catch(() => []);
      else if (target === 'brand_kit') data = await base44.entities.BrandKit.list().catch(() => []);

      const boundary = 'xtreme_boundary_' + Date.now();
      const metadata = JSON.stringify({ name: `Xtreme_${target}_sync.json`, mimeType: 'application/json' });
      const content = JSON.stringify(data, null, 2);
      const multipartBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;

      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': `multipart/related; boundary=${boundary}` },
        body: multipartBody,
      });

      return Response.json({ summary: `${data.length} ${target} records synced to Drive` });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('googleWorkspaceSync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}