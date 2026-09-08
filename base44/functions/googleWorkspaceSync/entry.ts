import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, connector_id, target } = body;

    if (!connector_id) return Response.json({ error: 'connector_id required' }, { status: 400 });

    // Status check — try to get the user's connection
    if (action === 'status') {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connector_id);
        return Response.json({ connected: true, email: user.email });
      } catch {
        return Response.json({ connected: false });
      }
    }

    // All other actions require a valid connection
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connector_id);
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
      return Response.json({ summary: `${details.length} messages retrieved from Gmail`, messages: details });
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