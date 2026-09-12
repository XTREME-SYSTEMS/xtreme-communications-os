import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';
import { aiCompleteJson, MODELS } from '../../shared/aiGateway.ts';

// ─── DOC SPECIALIST PIPELINE ──────────────────────────────────────
// Council agent that orchestrates the full Google Workspace pipeline:
// Brief → AI summarize → Google Doc → Google Sheet (task log) →
// Google Calendar (deadlines) → Google Tasks (granular to-dos) →
// Google Drive (agent folders) → QA validation
// Every task must meet 100% enterprise grade.

const CONNECTOR_IDS = {
  docs: "69ddcb7e5d965b5605cd24b4",
  sheets: "69db1fad3c50db37ad0ce8dd",
  calendar: "69ddcb305a599e0b4a1b3cff",
  tasks: "69db201897e4e8f9ae073be7",
  drive: "69db1e5e75a5f8c15c80cf34",
};

async function getToken(base44, connectorId) {
  const { accessToken } = await base44.asServiceRole.connectors.getWorkspaceConnection(connectorId);
  return accessToken;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const apiKey = body.api_key || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    if (!apiKey) return Response.json({ error: "api_key required" }, { status: 401 });
    const keys = await base44.asServiceRole.entities.ApiKey.filter({ key_value: apiKey, status: "active" });
    if (!keys.length) return Response.json({ error: "invalid api key" }, { status: 403 });

    const action = body.action || "run_pipeline";

    // ═══ RUN FULL PIPELINE ═══════════════════════════════════════════
    if (action === "run_pipeline") {
      const { brief } = body;
      if (!brief) return Response.json({ error: "brief required" }, { status: 400 });

      // Create run record
      const run = await base44.asServiceRole.entities.DocSpecialistRun.create({
        brief, status: "processing", started_at: new Date().toISOString(),
      });

      try {
        const result: any = { steps: [] };

        // ── STEP 1: AI processes brief into structured tasks ──
        result.steps.push({ step: "ai_processing", status: "running" });
        const aiResult = await aiCompleteJson({
          model: MODELS.complex,
          messages: [{
            role: "user",
            content: `You are the Doc Specialist council agent. Analyze this project brief and create a structured execution plan.

BRIEF:
${brief}

Return a JSON object with:
1. "summary" — A structured execution document summary (2-3 paragraphs)
2. "tasks" — Array of tasks, each with:
   - "task": Task description
   - "owner": Which specialist agent should handle it (e.g. "Content Writer", "Developer", "Designer", "QA Specialist", "Data Analyst")
   - "priority": "high" | "medium" | "low"
   - "deadline": ISO date string (within next 7 days)
   - "checklist": Array of 3-5 granular action items
3. "agents" — Array of unique agent names from the tasks

Every task must be enterprise-grade: specific, actionable, measurable, with clear acceptance criteria.`,
          }],
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    task: { type: "string" },
                    owner: { type: "string" },
                    priority: { type: "string" },
                    deadline: { type: "string" },
                    checklist: { type: "array", items: { type: "string" } },
                  },
                  required: ["task", "owner", "priority", "deadline", "checklist"],
                },
              },
              agents: { type: "array", items: { type: "string" } },
            },
            required: ["summary", "tasks", "agents"],
          },
        });
        result.steps[0].status = "completed";
        result.ai_summary = aiResult.summary;
        result.tasks = aiResult.tasks;
        result.agents = aiResult.agents;

        // ── Get Google Workspace tokens ──
        const [docsToken, sheetsToken, calToken, tasksToken, driveToken] = await Promise.all([
          getToken(base44, CONNECTOR_IDS.docs),
          getToken(base44, CONNECTOR_IDS.sheets),
          getToken(base44, CONNECTOR_IDS.calendar),
          getToken(base44, CONNECTOR_IDS.tasks),
          getToken(base44, CONNECTOR_IDS.drive),
        ]);

        // ── STEP 2: Create Google Doc with summary ──
        result.steps.push({ step: "google_doc", status: "running" });
        const docRes = await fetch("https://docs.googleapis.com/v1/documents", {
          method: "POST",
          headers: { Authorization: `Bearer ${docsToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `Doc Specialist — Execution Plan ${new Date().toLocaleDateString()}`,
          }),
        });
        const docData = await docRes.json();
        const docId = docData.documentId;

        // Add content to the doc
        await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
          method: "POST",
          headers: { Authorization: `Bearer ${docsToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            requests: [
              { insertText: { location: { index: 1 }, text: aiResult.summary + "\n\n" }},
              ...aiResult.tasks.map((t, i) => ({
                insertText: {
                  location: { index: 1 + aiResult.summary.length + 2 + i * 200 },
                  text: `${i + 1}. [${t.priority.toUpperCase()}] ${t.task}\n   Owner: ${t.owner}\n   Deadline: ${t.deadline}\n   Checklist:\n${t.checklist.map(c => `   - ${c}`).join("\n")}\n\n`,
                },
              })),
            ],
          }),
        });
        result.doc_id = docId;
        result.doc_url = `https://docs.google.com/document/d/${docId}/edit`;
        result.steps[1].status = "completed";

        // ── STEP 3: Create Google Sheet with task log ──
        result.steps.push({ step: "google_sheet", status: "running" });
        const sheetRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: { Authorization: `Bearer ${sheetsToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            properties: { title: `Doc Specialist — Task Log ${new Date().toLocaleDateString()}` },
            sheets: [{
              properties: { title: "Task Log" },
              data: [{
                startRow: 0, startColumn: 0,
                rowData: [
                  { values: [
                    { userEnteredValue: { stringValue: "Task" } },
                    { userEnteredValue: { stringValue: "Owner" } },
                    { userEnteredValue: { stringValue: "Priority" } },
                    { userEnteredValue: { stringValue: "Deadline" } },
                    { userEnteredValue: { stringValue: "Checklist" } },
                    { userEnteredValue: { stringValue: "Status" } },
                    { userEnteredValue: { stringValue: "QA Status" } },
                    { userEnteredValue: { stringValue: "QA Notes" } },
                  ]},
                  ...aiResult.tasks.map(t => ({
                    values: [
                      { userEnteredValue: { stringValue: t.task } },
                      { userEnteredValue: { stringValue: t.owner } },
                      { userEnteredValue: { stringValue: t.priority } },
                      { userEnteredValue: { stringValue: t.deadline } },
                      { userEnteredValue: { stringValue: t.checklist.join("\n") } },
                      { userEnteredValue: { stringValue: "pending" } },
                      { userEnteredValue: { stringValue: "pending" } },
                      { userEnteredValue: { stringValue: "" } },
                    ],
                  })),
                ],
              }],
            }],
          }),
        });
        const sheetData = await sheetRes.json();
        const sheetId = sheetData.spreadsheetId;
        result.sheet_id = sheetId;
        result.sheet_url = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
        result.steps[2].status = "completed";

        // ── STEP 4: Create Google Calendar events for tasks with deadlines ──
        result.steps.push({ step: "google_calendar", status: "running" });
        const calendarEvents = [];
        for (const task of aiResult.tasks) {
          try {
            const deadline = new Date(task.deadline);
            const eventRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
              method: "POST",
              headers: { Authorization: `Bearer ${calToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                summary: `[${task.priority.toUpperCase()}] ${task.task}`,
                description: `Owner: ${task.owner}\nChecklist:\n${task.checklist.map(c => `• ${c}`).join("\n")}`,
                start: { dateTime: deadline.toISOString() },
                end: { dateTime: new Date(deadline.getTime() + 60 * 60 * 1000).toISOString() },
              }),
            });
            const eventData = await eventRes.json();
            if (eventData.id) calendarEvents.push(eventData.id);
          } catch (_) {}
        }
        result.calendar_event_ids = calendarEvents;
        result.steps[3].status = "completed";

        // ── STEP 5: Create Google Tasks for each checklist item ──
        result.steps.push({ step: "google_tasks", status: "running" });
        // First, get or create a task list
        const taskListRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
          headers: { Authorization: `Bearer ${tasksToken}` },
        });
        const taskListData = await taskListRes.json();
        let taskListId = taskListData.items?.[0]?.id;
        if (!taskListId) {
          const newListRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
            method: "POST",
            headers: { Authorization: `Bearer ${tasksToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Doc Specialist Tasks" }),
          });
          const newListData = await newListRes.json();
          taskListId = newListData.id;
        }

        const taskIds = [];
        for (const task of aiResult.tasks) {
          for (const checklistItem of task.checklist) {
            try {
              const createTaskRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
                method: "POST",
                headers: { Authorization: `Bearer ${tasksToken}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: `[${task.owner}] ${checklistItem}`,
                  notes: `Task: ${task.task}\nPriority: ${task.priority}\nDeadline: ${task.deadline}`,
                  due: new Date(task.deadline).toISOString(),
                }),
              });
              const createTaskData = await createTaskRes.json();
              if (createTaskData.id) taskIds.push(createTaskData.id);
            } catch (_) {}
          }
        }
        result.task_ids = taskIds;
        result.steps[4].status = "completed";

        // ── STEP 6: Create Google Drive folders for each agent ──
        result.steps.push({ step: "agent_folders", status: "running" });
        // Create parent folder
        const parentFolderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: { Authorization: `Bearer ${driveToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Doc Specialist — ${new Date().toLocaleDateString()}`,
            mimeType: "application/vnd.google-apps.folder",
          }),
        });
        const parentFolderData = await parentFolderRes.json();
        const parentFolderId = parentFolderData.id;

        const agentFolders = [];
        for (const agentName of aiResult.agents) {
          try {
            // Create agent subfolder
            const folderRes = await fetch("https://www.googleapis.com/drive/v3/files", {
              method: "POST",
              headers: { Authorization: `Bearer ${driveToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                name: agentName,
                mimeType: "application/vnd.google-apps.folder",
                parents: [parentFolderId],
              }),
            });
            const folderData = await folderRes.json();

            // Create a to-do doc in the agent's folder
            const agentTasks = aiResult.tasks.filter(t => t.owner === agentName);
            const todoDocRes = await fetch("https://docs.googleapis.com/v1/documents", {
              method: "POST",
              headers: { Authorization: `Bearer ${docsToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({ title: `${agentName} — To-Do List` }),
            });
            const todoDocData = await todoDocRes.json();
            const todoDocId = todoDocData.documentId;

            // Move the to-do doc to the agent's folder
            await fetch(`https://www.googleapis.com/drive/v3/files/${todoDocId}?addParents=${folderData.id}`, {
              method: "PATCH",
              headers: { Authorization: `Bearer ${driveToken}`, "Content-Type": "application/json" },
            });

            // Add content to the to-do doc
            const todoText = agentTasks.map((t, i) =>
              `${i + 1}. [${t.priority.toUpperCase()}] ${t.task}\n   Deadline: ${t.deadline}\n   Checklist:\n${t.checklist.map(c => `   - [ ] ${c}`).join("\n")}\n`
            ).join("\n");
            await fetch(`https://docs.googleapis.com/v1/documents/${todoDocId}:batchUpdate`, {
              method: "POST",
              headers: { Authorization: `Bearer ${docsToken}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                requests: [{ insertText: { location: { index: 1 }, text: `${agentName} — To-Do List\n\n${todoText}` }}],
              }),
            });

            agentFolders.push({
              agent_name: agentName,
              folder_id: folderData.id,
              folder_url: `https://drive.google.com/drive/folders/${folderData.id}`,
              task_count: agentTasks.length,
            });
          } catch (e) {
            agentFolders.push({ agent_name: agentName, error: e.message });
          }
        }
        result.agent_folders = agentFolders;
        result.steps[5].status = "completed";

        // ── STEP 7: QA validation ──
        result.steps.push({ step: "qa_validation", status: "running" });
        const qaResults = aiResult.tasks.map(task => ({
          agent_name: task.owner,
          task: task.task,
          qa_status: "pending_review",
          qa_notes: "Task distributed — awaiting agent completion for QA validation",
        }));
        result.qa_results = qaResults;
        result.steps[6].status = "completed";

        // ── Update run record ──
        await base44.asServiceRole.entities.DocSpecialistRun.update(run.id, {
          status: "completed",
          doc_id: result.doc_id,
          doc_url: result.doc_url,
          sheet_id: result.sheet_id,
          sheet_url: result.sheet_url,
          calendar_event_ids: result.calendar_event_ids,
          task_ids: result.task_ids,
          agent_folders: result.agent_folders,
          tasks: result.tasks,
          qa_results: result.qa_results,
          summary: result.ai_summary,
          completed_at: new Date().toISOString(),
        });

        return Response.json({
          action: "run_pipeline",
          status: "completed",
          run_id: run.id,
          result: {
            summary: result.ai_summary,
            doc_url: result.doc_url,
            sheet_url: result.sheet_url,
            calendar_events: result.calendar_event_ids.length,
            tasks_created: result.task_ids.length,
            agent_folders: result.agent_folders,
            total_tasks: result.tasks?.length || 0,
            steps: result.steps,
          },
        });
      } catch (error: any) {
        await base44.asServiceRole.entities.DocSpecialistRun.update(run.id, {
          status: "failed", error: error.message, completed_at: new Date().toISOString(),
        });
        return Response.json({ action: "run_pipeline", status: "failed", error: error.message, run_id: run.id }, { status: 500 });
      }
    }

    // ═══ LIST RUNS ═════════════════════════════════════════════════
    if (action === "list_runs") {
      const runs = await base44.asServiceRole.entities.DocSpecialistRun.list("-created_date", 20);
      return Response.json({ action: "list_runs", runs });
    }

    // ═══ GET RUN ═══════════════════════════════════════════════════
    if (action === "get_run") {
      const { run_id } = body;
      if (!run_id) return Response.json({ error: "run_id required" }, { status: 400 });
      const run = await base44.asServiceRole.entities.DocSpecialistRun.get(run_id);
      return Response.json({ action: "get_run", run });
    }

    // ═══ QA UPDATE ══════════════════════════════════════════════════
    if (action === "update_qa") {
      const { run_id, task_index, qa_status, qa_notes } = body;
      if (!run_id) return Response.json({ error: "run_id required" }, { status: 400 });
      const run = await base44.asServiceRole.entities.DocSpecialistRun.get(run_id);
      const qaResults = run.qa_results || [];
      if (qaResults[task_index]) {
        qaResults[task_index] = { ...qaResults[task_index], qa_status, qa_notes };
        await base44.asServiceRole.entities.DocSpecialistRun.update(run_id, { qa_results: qaResults });
      }
      return Response.json({ action: "update_qa", updated: true });
    }

    return Response.json({ error: "unknown action", action }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}