# AGENTS.md

## Project Context

This is a Base44 app repository ("Xtreme Communications"). It is a Vite + React
frontend that uses `@base44/sdk` and `@base44/vite-plugin`, with a Base44 backend
(entities, functions, agents) defined in `base44/`.

Treat it as user-owned application code, keep changes focused on the user's
request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

## Running in the Base44 Sandbox (Docker)

The app runs via `docker-compose.base44.yml`, which builds from `Dockerfile.base44`
(Node 22 + Deno). The compose service:

1. Installs npm deps and the `base44` CLI.
2. Writes `base44/.app.jsonc` from the `B44_APP_ID` env var (linking the project).
3. Runs `base44 dev` — starts a local Deno backend (port 4400, in-memory data)
   and a Vite dev server (port 5173, mapped to host 3000).

### Required Secrets

- `BASE44_API_KEY` — workspace API key (starts with `b44k_`), used for CLI auth.
- `B44_APP_ID` — the Base44 app ID (from the Builder URL).

Both are delivered via `/run/base44/app.env` (platform-managed).

### Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config with `server.host: 0.0.0.0` and polling watch
  for container compatibility; the `@base44/vite-plugin` sets up the `/api` proxy
  to the local backend when `VITE_BASE44_APP_BASE_URL` is set (done by `base44 dev`).
- `base44/config.jsonc`: project config (`site.serveCommand: npm run dev`).
- `Dockerfile.base44`: Node 22 + Deno image.
- `docker-compose.base44.yml`: dev compose.

### How to Verify

- `docker compose -f docker-compose.base44.yml up -d --build`
- `docker compose -f docker-compose.base44.yml ps`
- `curl -sI http://localhost:3000` should return 200.
- The Vite dev server proxies `/api` to the local Deno backend on port 4400.

## Working Notes

- Use `base44 dev` as the default local development command when you need the
  local Base44 backend. It runs the backend and frontend together.
- `base44 dev` rejects `BASE44_APP_ID` env var — use `base44/.app.jsonc` instead.
- The local backend uses in-memory data (wiped on restart). Auth and public
  settings are proxied to the hosted Base44 platform.
- Entity data is **in-memory only**, wiped when `base44 dev` restarts.
- Prefer the existing SDK client and Vite plugin patterns before adding new
  Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
