# Plan — Feature 023

1. Add a small client completion handoff next to the existing lesson runtime rather than expanding the large runtime component.
2. Reuse the runtime’s existing v4 localStorage state only to reveal the navigation affordance after completion.
3. Carry the exact stored session ID in the speaking-practice URL.
4. Add a fail-closed pure selector for speaking practice and use it from the server page.
5. Owner-scope and completion-scope explicit session queries; never fall back from an explicit session to another lesson.
6. Keep the no-session speaking route for deliberate manual practice against the latest valid completed lesson.
7. Cover completion visibility/session binding with jsdom unit tests and a Chromium journey.
8. Cover fail-closed explicit-session selection with pure unit tests.
9. Run exact-head CI and merge only after every required job plus aggregate CI gate succeeds.
