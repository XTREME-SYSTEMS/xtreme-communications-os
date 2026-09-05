import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Studio-grade neural TTS verdict — produces a production-quality audio summary of the preflight
// score and readiness using the GenerateSpeech integration (neural voice, not browser TTS).
// Proves the audio category at the highest available quality.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const score = body.score ?? 0;
    const pass = body.pass_count ?? 0;
    const fail = body.fail_count ?? 0;
    const total = body.total ?? (pass + fail);

    const verdict = score >= 100
      ? `Preflight complete. Overall score: one hundred out of one hundred. ${pass} of ${total} tests passed. All categories live. XTREME Communications has reached full Twilio parity. Production cutover is cleared.`
      : score >= 75
      ? `Preflight near complete. Overall score: ${score} out of one hundred. ${pass} of ${total} tests passed. ${100 - score} percent gap remains. Healing required before launch.`
      : `Preflight warning. Overall score: ${score} out of one hundred. ${fail} tests failing. Critical gaps detected across the system. Autonomous healing required.`;

    const res = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text: verdict,
      voice: "storm",
    });

    return Response.json({ url: res.url, text: verdict, score });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}