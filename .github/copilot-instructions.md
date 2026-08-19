# Vidlish Copilot instructions

Read and follow `AGENTS.md` before changing code. Treat it as the cross-agent project contract.

For every change:

- preserve grounding, privacy-safe persistence, ownership/RLS and completion != mastery invariants;
- prefer the smallest end-to-end vertical slice over broad refactors;
- never call production/paid providers during ordinary CI or review;
- do not weaken tests or security constraints to make CI pass;
- keep generated source quotes bounded to canonical permitted transcript segments;
- require real retry/transfer/delayed evidence before stronger learning claims;
- review Next.js client/server boundaries and prevent secrets/service-role logic from entering browser bundles;
- for Supabase changes, inspect migration + RLS/RPC + pgTAP together;
- for learning-flow changes, require Chromium journey evidence;
- use Vietnamese for product-owner explanations and English for code/contracts/commit messages.

When reviewing a PR, prioritize correctness defects, privacy leaks, RLS/ownership drift, race/idempotency failures, answer exposure, fake mastery/retention claims, brittle E2E behavior and production-provider leakage over stylistic suggestions.