import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Closed-loop AI-to-AI test system.
// Generates a multi-turn conversation between two AI personas, optionally with TTS audio.
// Logs the test as a CommsEvent so it appears in the live dispatcher.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}

    const personaA = body.persona_a || { name: "Agent A", system_prompt: "", tone: "professional", personality_traits: [], voice_id: "river", gender: "female" };
    const personaB = body.persona_b || { name: "Agent B", system_prompt: "", tone: "friendly", personality_traits: [], voice_id: "sunny", gender: "female" };
    const channel = body.channel || "voice";
    const scenario = body.scenario || "sales inquiry call";
    const maxTurns = Math.min(body.max_turns || 6, 12);
    const generateAudio = channel === "voice" && body.generate_audio !== false;
    const fromNumber = body.from_number || "test-agent-a";
    const toNumber = body.to_number || "test-agent-b";

    // ── Generate conversation via LLM ──
    const convRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Create a realistic ${channel} conversation between two AI agents for a closed-loop test.

AGENT A (Caller/Sender): ${personaA.name}
- Role: ${personaA.assigned_context || "initiator"}
- Tone: ${personaA.tone || "professional"}
- Personality: ${(personaA.personality_traits || []).join(", ") || "professional, clear"}
- Instructions: ${personaA.system_prompt || "Be natural, human, and conversational."}

AGENT B (Receiver): ${personaB.name}
- Role: ${personaB.assigned_context || "responder"}
- Tone: ${personaB.tone || "friendly"}
- Personality: ${(personaB.personality_traits || []).join(", ") || "friendly, helpful"}
- Instructions: ${personaB.system_prompt || "Be natural, human, and conversational."}

SCENARIO: ${scenario}
CHANNEL: ${channel}
MAXIMUM TURNS: ${maxTurns}

Rules:
- Agent A initiates the conversation.
- Alternate turns between A and B.
- ${channel === "voice" ? "Use natural spoken language — contractions, filler words, natural rhythm, empathy." : "Use natural texting language — concise, casual, with appropriate abbreviations."}
- Make it sound like a real ${channel} exchange, not a script.
- Each turn should be realistic length for the channel.
- End naturally (don't force a close if it doesn't fit).

Return a JSON object with a "turns" array. Each turn: { role: "a"|"b", speaker_name, text }.`,
      response_json_schema: {
        type: "object",
        properties: {
          turns: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string", enum: ["a", "b"] },
                speaker_name: { type: "string" },
                text: { type: "string" }
              },
              required: ["role", "speaker_name", "text"]
            }
          },
          summary: { type: "string" },
          outcome: { type: "string" }
        },
        required: ["turns"]
      }
    });

    const turns = convRes.turns || [];

    // ── Generate TTS audio for voice tests ──
    if (generateAudio && turns.length > 0) {
      const voiceMap = { river: "river", honey: "honey", sunny: "sunny", storm: "storm", spark: "spark" };
      const audioPromises = turns.map(turn => {
        const voice = turn.role === "a"
          ? (voiceMap[personaA.voice_id] || "river")
          : (voiceMap[personaB.voice_id] || "sunny");
        return base44.asServiceRole.integrations.Core.GenerateSpeech({
          text: turn.text.slice(0, 5000),
          voice,
          language_code: "en"
        });
      });
      const audioResults = await Promise.all(audioPromises);
      turns.forEach((turn, i) => {
        turn.audio_url = audioResults[i]?.url || null;
      });
    }

    // ── Log as CommsEvent ──
    await base44.asServiceRole.entities.CommsEvent.create({
      channel,
      direction: "outbound",
      from_addr: fromNumber,
      to_addr: toNumber,
      status: "completed",
      classification: "SANDBOX",
      summary: `Closed-loop test: ${personaA.name} → ${personaB.name} — ${scenario}`,
      duration_sec: channel === "voice" ? turns.length * 8 : 0,
    });

    return Response.json({
      channel,
      scenario,
      turns,
      summary: convRes.summary || "",
      outcome: convRes.outcome || "",
      persona_a: personaA.name,
      persona_b: personaB.name,
      from_number: fromNumber,
      to_number: toNumber,
      audio_generated: generateAudio,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}