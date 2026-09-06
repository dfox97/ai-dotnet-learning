# Learner progress schema

ReviewLab stores personal-alpha progress locally under `reviewlab-progress`.

Schema version 2 covers lesson completion and reviews, practice activity attempts, baseline/post diagnostics, recommendations, reflections, and capstone state. Older lesson-only and version 1 documents are migrated on load. Future or invalid versions enter recovery mode instead of crashing or silently discarding learner data.

Exports use the same validated schema and can be parsed before replacement so a later UI can preview import impact before confirmation.
