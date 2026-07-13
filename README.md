# PMP Academy v3.1 — Progress Reset and Data Cleanup

This update fixes persistent legacy progress and corrupted score data.

## Fixes

- Uses one storage namespace: `pmpAcademy`
- Removes all older version keys automatically
- Reset deletes:
  - Session history
  - Best score
  - Readiness
  - Topic statistics
  - Review and flagged questions
  - Lesson completion
  - Flashcard mastery
  - Daily goal and streak
  - Achievements
  - Previous-version data
- Removes cached PMP Academy app data during reset where supported
- Filters invalid historical sessions, including:
  - Scores above 100%
  - Correct counts greater than question totals
  - Negative or malformed scores
- Caps readiness and accuracy between 0% and 100%
- Preserves the fixed one-answer-per-question practice engine from Version 3.0

Upload and replace every file in the GitHub repository root, including the `icons` folder.
