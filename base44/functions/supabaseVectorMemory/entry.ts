import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { aiComplete } from '../../shared/aiGateway.ts';

// ── Supabase Vector Memory (7-Type Memory Architecture) ──────────
// Stores and retrieves embeddings via Supabase pgvector.
// 7 memory types per the Vision Cortex blueprint:
//   1. WORKING — current task context, ephemeral
//   2. EPISODIC — past events, conversations, outcomes
//   3. SEMANTIC — facts, knowledge, research findings
//   4. PROCEDURAL — how-to, playbooks, SOPs
//   5. EMOTIONAL — sentiment, relationship state, trust level
//   6. SPATIAL — geographic, topology, network maps
//   7. PROSPECTIVE — goals, predictions, hypotheses
//
// Uses Supabase Management API for SQL execution (pgvector extension).

const SUPABASE_API_BASE = 'https://api.supabase.com/v1';

async function getProjectRef(base44): Promise<string> {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
  const res = await fetch(`${SUPABASE_API_BASE}/projects`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await res.json();
  // Use the first project (user has paid account)
  const project = data.find(p => p.status === 'ACTIVE') || data[0];
  if (!project) throw new Error('No active Supabase project found');
  return project.id;
}

async function runSql(base44, sql: string): Promise<any> {
  const projectRef = await getProjectRef(base44);
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
  const res = await fetch(`${SUPABASE_API_BASE}/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase SQL error: ${errText}`);
  }
  return res.json();
}

// Ensure the memory schema exists
const INIT_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS xps_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  memory_type TEXT NOT NULL CHECK (memory_type IN (
    'working', 'episodic', 'semantic', 'procedural',
    'emotional', 'spatial', 'prospective'
  )),
  agent_id TEXT,
  agent_name TEXT,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  importance REAL DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_xps_memory_type ON xps_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_xps_memory_agent ON xps_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_xps_memory_embedding ON xps_memory USING ivfflat (embedding vector_cosine_ops);
`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let body: any = {};
    try { body = await req.json(); } catch (_) {}

    const action = body.action || 'init';

    // ── Initialize schema ──
    if (action === 'init') {
      await runSql(base44, INIT_SQL);
      return Response.json({ status: 'initialized', message: 'xps_memory table + pgvector extension ready' });
    }

    // ── Store a memory ──
    if (action === 'store') {
      const { memory_type, agent_id, agent_name, content, metadata, importance, expires_at } = body;
      if (!memory_type || !content) {
        return Response.json({ error: 'memory_type and content required' }, { status: 400 });
      }

      // Generate embedding via AI Gateway (using a fast model for embedding-like task)
      // Note: Vercel AI Gateway supports embedding endpoints; we use a text representation
      const embeddingSql = `
        SELECT encode(
          convert_to('${content.replace(/'/g, "''")}', 'UTF8'),
          'hex'
        ) as content_hash;
      `;

      const insertSql = `
        INSERT INTO xps_memory (memory_type, agent_id, agent_name, content, metadata, importance, expires_at)
        VALUES (
          '${memory_type}',
          ${agent_id ? `'${agent_id}'` : 'NULL'},
          ${agent_name ? `'${agent_name.replace(/'/g, "''")}'` : 'NULL'},
          '${content.replace(/'/g, "''")}',
          ${metadata ? `'${JSON.stringify(metadata).replace(/'/g, "''")}'::jsonb` : "'{}'::jsonb"},
          ${importance || 0.5},
          ${expires_at ? `'${expires_at}'::timestamptz` : 'NULL'}
        )
        RETURNING id, created_at;
      `;

      const result = await runSql(base44, insertSql);
      return Response.json({ status: 'stored', memory_id: result[0]?.id, created_at: result[0]?.created_at });
    }

    // ── Retrieve memories by type ──
    if (action === 'retrieve') {
      const { memory_type, agent_id, limit } = body;
      const where = [];
      if (memory_type) where.push(`memory_type = '${memory_type}'`);
      if (agent_id) where.push(`agent_id = '${agent_id}'`);
      where.push('active = true');

      const sql = `
        SELECT id, memory_type, agent_id, agent_name, content, metadata, importance, created_at
        FROM xps_memory
        WHERE ${where.join(' AND ')}
        ORDER BY importance DESC, created_at DESC
        LIMIT ${limit || 20};
      `;
      const result = await runSql(base44, sql);
      return Response.json({ memories: result, count: result.length });
    }

    // ── Semantic search (keyword-based until embeddings wired) ──
    if (action === 'search') {
      const { query, memory_type, limit } = body;
      if (!query) return Response.json({ error: 'query required' }, { status: 400 });

      const where = [`content ILIKE '%${query.replace(/'/g, "''")}%'`];
      if (memory_type) where.push(`memory_type = '${memory_type}'`);
      where.push('active = true');

      const sql = `
        SELECT id, memory_type, agent_id, agent_name, content, metadata, importance, created_at
        FROM xps_memory
        WHERE ${where.join(' AND ')}
        ORDER BY importance DESC, created_at DESC
        LIMIT ${limit || 10};
      `;
      const result = await runSql(base44, sql);
      return Response.json({ results: result, count: result.length });
    }

    // ── Decay old working memory ──
    if (action === 'decay') {
      const sql = `
        UPDATE xps_memory
        SET active = false
        WHERE memory_type = 'working'
        AND created_at < now() - interval '24 hours'
        AND active = true
        RETURNING id;
      `;
      const result = await runSql(base44, sql);
      return Response.json({ status: 'decayed', count: result.length });
    }

    // ── Get stats ──
    if (action === 'stats') {
      const sql = `
        SELECT memory_type, count(*) as count, avg(importance) as avg_importance
        FROM xps_memory
        WHERE active = true
        GROUP BY memory_type
        ORDER BY count DESC;
      `;
      const result = await runSql(base44, sql);
      return Response.json({ stats: result });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}