# Plan — Feature 022

1. Add a privacy-safe speaking receipt contract and port.
2. Add a Supabase receipt table + service-role RPC with owner/session/activity validation and idempotency.
3. Add an authenticated multipart route that receives bounded audio, validates metadata, and discards raw bytes after the request.
4. Add a microphone capture/replay/self-check UI tied to the latest completed lesson with a `guided_transfer` activity.
5. Project receipts into four-skill progress as speaking self-check / unscored observations only.
6. Add unit coverage for projection and progress reading.
7. Add pgTAP coverage for schema privacy, privileges, idempotency, activity binding, replay confirmation, and completed-session binding.
8. Extend a durable journey if needed to cover the integrated speaking flow without weakening existing Golden Session claims.
9. Open a PR, run exact-head CI, fix all failures, and merge only after the aggregate gate is green.
