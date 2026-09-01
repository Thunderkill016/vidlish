# Plan: Beginner listen-before-text integrity

1. Make the standalone first-word UI enter an explicit listening phase before any text is rendered.
2. Reuse the existing support flag when the learner requests text.
3. Use the saved response `known` field to give accurate first-word feedback.
4. Hide the new target in later sentence headers until text support or post-attempt feedback.
5. Extend Chromium coverage for independent and supported first-word paths plus later-sentence text hiding.
6. Review the diff for persistence/scoring drift.
7. Run exact-head full CI and squash merge only the green head.
