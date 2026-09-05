import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// System memory / doctrine anchor — the single source of truth the AI assistant reverts to
// on every turn. The "ideal state" doctrine is loaded at conversation start so the assistant
// always returns to the correct persona, guardrails, and operating protocols.
//   action="get"  → returns the active doctrine bundle (the memory anchor)
//   action="set" → upserts a doctrine row by key
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const action = body.action || "get";

    if (action === "get") {
      const rows = await base44.asServiceRole.entities.SystemMemory.filter({ active: true }, "-priority", 100);
      const doctrine = rows.map((r) => `## ${r.key}\n${r.value}`).join("\n\n");
      return Response.json({ anchor: "IDEAL_STATE", count: rows.length, doctrine });
    }

    if (action === "set") {
      if (!body.key || !body.value) return Response.json({ error: "key and value required" }, { status: 400 });
      const existing = await base44.asServiceRole.entities.SystemMemory.filter({ key: body.key }, "-created_date", 1);
      if (existing.length) {
        const updated = await base44.asServiceRole.entities.SystemMemory.update(existing[0].id, {
          value: body.value,
          category: body.category || existing[0].category,
          priority: body.priority ?? existing[0].priority,
          active: true,
        });
        return Response.json({ upserted: true, id: updated.id, key: body.key });
      }
      const created = await base44.asServiceRole.entities.SystemMemory.create({
        key: body.key,
        value: body.value,
        category: body.category || "doctrine",
        priority: body.priority || 0,
        active: true,
      });
      return Response.json({ upserted: true, id: created.id, key: body.key });
    }

    return Response.json({ error: "unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}