import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Syncs XtremeCrmContact records to HubSpot (bidirectional).
// action: "push" (CRM -> HubSpot) | "pull" (HubSpot -> CRM) | "sync" (both)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, contact_id, contact_data } = body;

    const conn = await base44.asServiceRole.connectors.getConnection('hubspot');
    const token = conn.accessToken;

    const hubspotApi = "https://api.hubapi.com/crm/v3/objects/contacts";
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    if (action === "push" && contact_data) {
      // Push a contact to HubSpot
      const properties = {
        email: contact_data.email || "",
        firstname: (contact_data.full_name || "").split(" ")[0] || "",
        lastname: (contact_data.full_name || "").split(" ").slice(1).join(" ") || "",
        phone: contact_data.phone || "",
        company: contact_data.company || "",
        jobtitle: contact_data.title || "",
        lifecyclestage: contact_data.lifecycle_stage || "lead",
        city: contact_data.location || "",
        industry: contact_data.industry || ""
      };

      // Clean empty values
      Object.keys(properties).forEach(k => { if (!properties[k]) delete properties[k]; });

      const resp = await fetch(hubspotApi, {
        method: "POST",
        headers,
        body: JSON.stringify({ properties })
      });

      if (!resp.ok) {
        const errText = await resp.text();
        // If contact exists (email conflict), try to update
        if (resp.status === 409 && contact_data.email) {
          const searchResp = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contact_data.email}?idProperty=email`, { headers });
          if (searchResp.ok) {
            const existing = await searchResp.json();
            const updateResp = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existing.id}`, {
              method: "PATCH",
              headers,
              body: JSON.stringify({ properties })
            });
            if (updateResp.ok) {
              const updated = await updateResp.json();
              return Response.json({ synced: true, hubspot_contact_id: updated.id, action: "updated" });
            }
          }
        }
        return Response.json({ error: `HubSpot push failed: ${errText}` }, { status: 502 });
      }

      const created = await resp.json();
      return Response.json({ synced: true, hubspot_contact_id: created.id, action: "created" });
    }

    if (action === "pull") {
      // Pull contacts from HubSpot
      const resp = await fetch(`${hubspotApi}?limit=100&properties=email,firstname,lastname,phone,company,jobtitle,city,industry,lifecyclestage`, { headers });
      if (!resp.ok) {
        return Response.json({ error: "HubSpot pull failed" }, { status: 502 });
      }
      const data = await resp.json();
      const contacts = (data.results || []).map(c => ({
        hubspot_contact_id: c.id,
        email: c.properties?.email || "",
        full_name: `${c.properties?.firstname || ""} ${c.properties?.lastname || ""}`.trim(),
        phone: c.properties?.phone || "",
        company: c.properties?.company || "",
        title: c.properties?.jobtitle || "",
        location: c.properties?.city || "",
        industry: c.properties?.industry || "",
        lifecycle_stage: c.properties?.lifecyclestage || "lead"
      }));
      return Response.json({ contacts, synced: true, action: "pulled" });
    }

    return Response.json({ error: "Unknown action. Use push, pull, or sync." }, { status: 400 });
  } catch (error) {
    console.error("syncHubspot error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}