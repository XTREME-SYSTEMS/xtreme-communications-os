import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sends an email summary of a completed voice session, including AI-generated
// task lists and conversation notes, so the user can review without logging in.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const { voice_session_id, recipient_email, call_from, call_to, call_duration } = body;
    if (!recipient_email) return Response.json({ error: "recipient_email required" }, { status: 400 });

    let transcripts = [];
    let tasks = [];
    let session = {};

    if (voice_session_id) {
      try { session = await base44.entities.AiVoiceSession.get(voice_session_id) || {}; } catch (_) {}
      try { transcripts = await base44.entities.SpeechTranscript.filter({ voice_session_id }) || []; } catch (_) {}
      try { tasks = await base44.entities.TaskAssignment.filter({ voice_session_id }) || []; } catch (_) {}
    }

    const conversationText = transcripts.length > 0
      ? transcripts.sort((a, b) => (a.turn_index || 0) - (b.turn_index || 0)).map(t => `${t.role}: ${t.content}`).join("\n")
      : `Call from ${call_from || 'unknown'} to ${call_to || 'unknown'}, duration: ${call_duration || 'N/A'} seconds.`;

    const llmResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze this voice call conversation and provide a structured summary for a business owner.

Conversation:
${conversationText}

Provide:
1. A concise summary (2-3 sentences)
2. Key discussion points (bullet list)
3. Action items / tasks identified (bullet list)
4. Overall sentiment (one word)
5. Follow-up recommendations`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          key_points: { type: "array", items: { type: "string" } },
          action_items: { type: "array", items: { type: "string" } },
          sentiment: { type: "string" },
          follow_up: { type: "string" }
        },
        required: ["summary", "key_points", "action_items", "sentiment"]
      }
    });

    const summary = llmResult.summary || "No summary available.";
    const keyPoints = llmResult.key_points || [];
    const actionItems = llmResult.action_items || [];
    const sentiment = llmResult.sentiment || "neutral";
    const followUp = llmResult.follow_up || "None identified.";

    const taskList = tasks.length > 0
      ? tasks.map(t => `• ${t.title || t.description || 'Task'} — ${t.status || 'pending'}${t.priority ? ` (${t.priority})` : ''}`).join("\n")
      : actionItems.length > 0
        ? actionItems.map(a => `• ${a}`).join("\n")
        : "No tasks identified.";

    const emailBody = `STRATEGIC MINDS AI — VOICE SESSION SUMMARY
═══════════════════════════════════════════

Call: ${call_from || 'N/A'} → ${call_to || 'N/A'}
Duration: ${call_duration ? Math.round(call_duration / 60) + ' min' : 'N/A'}
Sentiment: ${sentiment}

SUMMARY
${summary}

KEY DISCUSSION POINTS
${keyPoints.map(p => `• ${p}`).join("\n")}

TASKS & ACTION ITEMS
${taskList}

FOLLOW-UP RECOMMENDATIONS
${followUp}

═══════════════════════════════════════════
Generated automatically by Strategic Minds AI
Intelligence In Motion`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: recipient_email,
      subject: `SMAI Voice Session Summary — ${new Date().toLocaleDateString()}`,
      body: emailBody,
      from_name: "Strategic Minds AI"
    });

    return Response.json({
      ok: true,
      sent_to: recipient_email,
      summary,
      task_count: tasks.length || actionItems.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}