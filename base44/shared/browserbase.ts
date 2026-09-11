// ── Browserbase Cloud Browser Integration ──────────────────────────
// Real browser automation: navigate, fill forms, click, operate websites.
// Uses Browserbase Agents API — one natural-language prompt, one API call.
// The agent handles navigation, form filling, clicking, and data extraction.
//
// Usage:
//   import { runAgent, isConfigured } from '../../shared/browserbase.ts';
//   const result = await runAgent("Go to example.com and fill out the contact form with name John Doe");

import { secrets } from 'base44:runtime';

const BB_BASE = 'https://api.browserbase.com/v1';

export function getApiKey(): string {
  const key = secrets.get('BROWSERBASE_API_KEY');
  if (!key) throw new Error('BROWSERBASE_API_KEY not configured');
  return key;
}

export function getProjectId(): string | undefined {
  return secrets.get('BROWSERBASE_PROJECT_ID') || undefined;
}

export function isConfigured(): boolean {
  try { return !!getApiKey(); } catch { return false; }
}

function headers(): Record<string, string> {
  return { 'X-BB-API-Key': getApiKey(), 'Content-Type': 'application/json' };
}

// ── Run a browser agent with a natural language task ──
// This is the primary entry point. Send a task like:
//   "Go to https://example.com/contact, fill the form with name 'John', email 'john@test.com', and submit"
// Browserbase handles navigation, form filling, clicking, and returns the result.
export async function runAgent(task: string, options?: {
  projectId?: string;
  browserSettings?: any;
}): Promise<any> {
  const body: any = { task };
  const projectId = options?.projectId || getProjectId();
  if (projectId) body.projectId = projectId;
  if (options?.browserSettings) body.browserSettings = options.browserSettings;

  const res = await fetch(`${BB_BASE}/agents/runs`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Browserbase agent error ${res.status}: ${errText}`);
  }
  return await res.json();
}

// ── Get agent run status/result ──
export async function getAgentRun(runId: string): Promise<any> {
  const res = await fetch(`${BB_BASE}/agents/runs/${runId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Browserbase get run error ${res.status}: ${await res.text()}`);
  return await res.json();
}

// ── Poll agent run until complete (or timeout) ──
export async function pollAgentRun(runId: string, timeoutMs = 120000, intervalMs = 3000): Promise<any> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await getAgentRun(runId);
    const status = run.status?.toUpperCase();
    if (status === 'COMPLETED' || status === 'COMPLETE' || status === 'DONE' || status === 'SUCCEEDED') return run;
    if (status === 'ERROR' || status === 'FAILED' || status === 'TIMED_OUT') throw new Error(`Agent run failed: ${status} — ${JSON.stringify(run)}`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  throw new Error(`Agent run timed out after ${timeoutMs / 1000}s`);
}

// ── Create a raw browser session (for manual control) ──
export async function createSession(options?: { projectId?: string; keepAlive?: boolean; timeout?: number }): Promise<any> {
  const body: any = {};
  const projectId = options?.projectId || getProjectId();
  if (projectId) body.projectId = projectId;
  if (options?.keepAlive !== undefined) body.keepAlive = options.keepAlive;
  if (options?.timeout) body.timeout = options.timeout;

  const res = await fetch(`${BB_BASE}/sessions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Browserbase session error ${res.status}: ${await res.text()}`);
  return await res.json();
}

// ── Get session status ──
export async function getSession(sessionId: string): Promise<any> {
  const res = await fetch(`${BB_BASE}/sessions/${sessionId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Browserbase session error ${res.status}: ${await res.text()}`);
  return await res.json();
}

// ── End a session ──
export async function endSession(sessionId: string): Promise<any> {
  const res = await fetch(`${BB_BASE}/sessions/${sessionId}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ status: 'REQUEST_RELEASE' }),
  });
  try { return await res.json(); } catch { return { ended: res.ok }; }
}

// ── List sessions ──
export async function listSessions(): Promise<any> {
  const res = await fetch(`${BB_BASE}/sessions`, { headers: headers() });
  if (!res.ok) throw new Error(`Browserbase list error ${res.status}: ${await res.text()}`);
  return await res.json();
}