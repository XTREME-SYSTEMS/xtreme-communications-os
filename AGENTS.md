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

1. Installs npm deps (`--legacy-peer-deps` needed for react-leaflet@4 + React 18)
   and the `base44` CLI.
2. Writes `base44/.app.jsonc` from the `B44_APP_ID` env var (linking the project).
3. Runs `base44 dev` — starts a local Deno backend (port 4400, in-memory data)
   and a Vite dev server (port 5173, mapped to host 3000).

### Required Secrets

- `B44_APP_ID` — the Base44 app ID (from the Builder URL). Required at boot.
- `BASE44_API_KEY` — workspace API key (starts with `b44k_`). Used by the CLI
  for authentication. If it doesn't start with `b44k_`, the CLI falls back to
  device-code login (one-time, persisted via `base44-cli-auth` volume).
- `VITE_BASE44_API_KEY` — same API key with `VITE_` prefix so Vite exposes it
  to client-side code for SDK authentication.

All delivered via `/run/base44/app.env` (platform-managed, last in `env_file:`).
Placeholders in `.env.base44-defaults` allow boot before real secrets are set.

### CLI Authentication

The `base44` CLI requires authentication to run `base44 dev`. If `BASE44_API_KEY`
starts with `b44k_`, the CLI uses it automatically. Otherwise, it generates a
device code that must be confirmed at https://app.base44.com/login/device.
Auth tokens are persisted in a named Docker volume (`base44-cli-auth`) so they
survive container restarts.

### Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client (passes `api_key` header).
- `src/lib/app-params.js`: reads `VITE_BASE44_API_KEY` from env.
- `vite.config.mjs`: Vite config (ESM, `.mjs` extension required because
  `@base44/vite-plugin` is ESM-only). Has `server.host: 0.0.0.0`,
  `server.allowedHosts: true`, and polling watch for container compatibility.
  The `@base44/vite-plugin` sets up the `/api` proxy to the local backend.
- `base44/config.jsonc`: project config (`site.serveCommand: npm run dev`).
- `Dockerfile.base44`: Node 22 + Deno image.
- `docker-compose.base44.yml`: dev compose with `--legacy-peer-deps` and
  persistent CLI auth volume.
- `.env.base44-defaults`: placeholder env values (overridden by `/run/base44/app.env`).

### Known Quirks

- `vite.config.js` must be `vite.config.mjs` — `@base44/vite-plugin` is ESM-only
  and cannot be loaded by `require()`. The project's `postcss.config.js` and
  `tailwind.config.js` use CJS (`module.exports`), so `"type": "module"` cannot
  be added to `package.json`.
- `react-leaflet` must be pinned to v4 (`^4.2.1`) — v5 requires React 19, but
  the project uses React 18. `npm install --legacy-peer-deps` handles remaining
  peer conflicts.
- `base44/agent-skills/autonomous_build.md` was renamed to `.bak` because the
  CLI rejected its frontmatter (skill name validation). Restore with proper
  YAML frontmatter (`name: lowercase-hyphenated`, `description: ...`) if needed.
- `base44 dev` rejects `BASE44_APP_ID` env var — use `base44/.app.jsonc` instead.

### How to Verify

- `docker compose -f docker-compose.base44.yml up -d --build`
- `docker compose -f docker-compose.base44.yml ps`
- `curl -sI http://localhost:3000` should return 200.
- The Vite dev server proxies `/api` to the local Deno backend on port 4400.

## Working Notes

- Use `base44 dev` as the default local development command when you need the
  local Base44 backend. It runs the backend and frontend together.
- The local backend uses in-memory data (wiped on restart). Auth and public
  settings are proxied to the hosted Base44 platform.
- Entity data is **in-memory only**, wiped when `base44 dev` restarts.
- Prefer the existing SDK client and Vite plugin patterns before adding new
  Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
