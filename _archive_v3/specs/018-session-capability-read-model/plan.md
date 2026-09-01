# Plan — Feature 018

1. Reuse the existing owner-scoped Supabase session measurement reader because it already hydrates the immutable blueprint and durable session evidence.
2. Hydrate full privacy-safe support events rather than reducing them before capability projection.
3. Project each durable attempt through `projectLessonActivityCapabilityEvidence()` and expose the resulting observations in the authenticated measurement response.
4. Keep `summariseLearningProductMeasurement()` unchanged so product telemetry does not become a capability authority.
5. Extend the response contract to require capability observations while leaving the base telemetry contract backward-compatible for existing Gate 5 study payloads.
6. Add reader coverage proving an objective lexical-reading attempt becomes reading evidence without leaking the selected option.
7. Add compatibility coverage proving Gate 5 accepts a full measurement response with privacy-safe capability evidence while still rejecting arbitrary free-form moderator data.
8. Run exact-head full CI and merge only after typecheck, unit, build, Supabase, Chromium, durable Golden Session and aggregate gate are green.
