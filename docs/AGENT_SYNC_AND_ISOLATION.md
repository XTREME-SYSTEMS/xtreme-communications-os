# Multi-GPT and Base44 collision shield (2026-10-13)

## Source ownership and lanes
This GitHub repository has protected-intent source branch main, one integration/agent-sync-20261013 branch for code convergence, and dedicated agent/role-20261013 branches for parallel GPTs. Ownership scopes are in config/agent-sync.json, enforced by scripts/branch-safety.mjs. Only integration controllers may commit to integration; individual GPTs must commit to their assigned lanes and open a reviewed PR targeting integration. Integration may request main promotion through a separately reviewed PR.

## Deterministic catch-up policy
- Every PR compares exact refs and the real changed file list, including deletions, against approved paths.
- If behind > 10 commits, fail the required branch guard and stop until reconciled.
- Automated six-hour drift watcher is read-only; only starts after this workflow has been reviewed/merged to main. Watchers are one per repository and do not modify deployed apps or live workers.
- Branch ahead=0 and behind>0 can be advanced only by non-force fast-forward with expected original SHA, when no active writer is leasing the branch. The current workflow does not automatically write any refs.
- Diverged branches always require human/Guardian reviewed reconciliation. Never force-push, reset, automatic cherry-pick/merge to main, silent backup replacement or recursive cross-app sync.
- Guard reads its code and allowlists from trusted destination branch for PRs. Main bootstrap requires review because a trusted guard is absent until the first approval.

## Base44 operational hazards
Native Base44 branches have independent preview and chat but SHARE app data, secrets, connectors, automations, workflows, agents and settings. Therefore they are NOT backend sandbox isolation. Base44 apps Eden Skye (6a8ab2c3080538da4dadb3ef) and XTREME Communications OS (6a9b71a5d35335afb9198950) currently only have main; their native branches must be made in Base44 Builder UI, then switched to test data. For backend, carrier, webhook and schema experiments use an independent staging Base44 app/project with separate database and credentials. Source repos cannot be assumed automatically synchronized with Base44 unless an authenticated branch mapping is verified.

## Infrastructure isolation
- Digital Dominance 2.0 is excluded entirely; it must not be modified or used as a Twilio webhook target.
- Supabase staging DB/RLS/storage and tenant IDs distinct from production.
- Railway staging workers/queues/leases distinct from production. No second production supervisor.
- Vercel preview only with environment-scoped credentials and no production domains.
- Twilio/Telnyx synthetic owned test numbers with signed callbacks. Never dial, send SMS/MMS, publish or provision carriers in an automated sync.
- Nonproduction documents and evidence only in approved scoped Drive or GitHub paths.

## Mandatory release gate
Require code owner review, enforced branch rulesets, build, lint, typecheck, unit/integration, secret scan, API auth, tenant isolation, independent smoke/Guardian receipt bound to final SHA and operator production approval. A local pass is not a release. Until required status checks are configured in GitHub, this branch guard is ADVISORY and can be bypassed by direct pushes to main. Keep releases blocked until rulesets are active and independently tested.

## Exact next step
Review integration PR. Configure GitHub settings for main and integration: require PR, one independent reviewer, require passing 'protect' and build checks, block force-push and branch deletion, prevent admin bypass. Create native branches in each Base44 editor (app name at top -> Create new branch) and turn on test data. Do not connect Base44 to unrelated GitHub repos or move databases without an approved migration.
