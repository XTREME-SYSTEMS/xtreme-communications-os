import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { steps, channel_type, target } = body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return Response.json({ status: 'error', message: 'No steps to test', steps: [] });
    }

    const stepsDescription = steps.map((s, i) =>
      `${i + 1}. ${s.label} (${s.type}) - ${JSON.stringify(s.config || {})}`
    ).join('\n');

    const prompt = `You are testing a ${channel_type} communication workflow. Simulate executing each step and determine if it would succeed or fail based on its configuration. Be strict but fair.

Workflow steps:
${stepsDescription}

Test target: ${target || 'not specified'}

For each step, evaluate:
- agent: Is an agent assigned? (check config.agent_id)
- time_window: Is there a valid time range? (check config.start and config.end)
- day_of_week: Are days selected? (check config.days array)
- delay: Is there a valid duration? (check config.value)
- script/message: Is there text content? (check config.text is non-empty)
- template: Is a template selected? (check config.template_id)
- image: Is an image selected? (check config.asset_id)
- condition: Is there a valid expression? (check config.expression)

Return a JSON object with:
- status: "success" if all steps pass, "error" if any fail
- steps: array of { label, status ("pass" or "fail"), detail } for each step
- message: a summary of the test results`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          status: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                status: { type: "string" },
                detail: { type: "string" }
              }
            }
          },
          message: { type: "string" }
        }
      }
    });

    return Response.json(result);
  } catch (error) {
    console.error('testWorkflowDesign error:', error.message);
    return Response.json({ status: 'error', message: error.message, steps: [] });
  }
}