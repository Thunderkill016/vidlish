# Tasks — Separate beginner dictation evidence

- [ ] Extend beginner word evidence with separate dictation fields.
- [ ] Change the challenge write contract to carry successful + independent verdicts.
- [ ] Make the fake repository branch evidence by server-owned challenge kind.
- [ ] Add fake-repository regression tests proving dictation does not promote known words.
- [ ] Add a migration with separate dictation state and a kind-aware challenge RPC.
- [ ] Update the Supabase adapter for the new RPC/result shape.
- [ ] Update the beginner attempt route to pass successful and independent separately.
- [ ] Replace the pgTAP assertion that currently treats independent dictation as productive-known evidence.
- [ ] Preserve owner, expiry, replay and browser-privilege boundaries in pgTAP.
- [ ] Run the repository full verification gate on the exact PR head before merge.
