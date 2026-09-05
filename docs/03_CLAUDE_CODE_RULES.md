# 03 — Claude Code Rules

1. Inspect the repository before coding.
2. Implement one roadmap phase/task at a time.
3. Do not rewrite unrelated modules.
4. Keep platform camera/sensor code behind adapters.
5. Geometry and calibrated observations determine physical dimensions; generative AI never guesses them.
6. Store measurement method, uncertainty, calibration and provenance.
7. Preserve original machine results after manual edits.
8. Bad observations produce guidance/failure, not confident-looking dimensions.
9. Core capture/records work offline.
10. Core MVP cannot require LiDAR or proprietary hardware.
11. Detect capabilities at runtime.
12. Verify current Apple/Google API documentation before implementation.
13. Use stable IDs and explicit migrations.
14. Add tests for domain/measurement changes.
15. Ask before adding paid services or major dependencies.
16. Do not map an entire warehouse unless explicitly requested by the user.
17. Treat Spot and Bin as distinct entities.
18. Code, variables, APIs and schemas use English.
19. UI strings must use localization resources, never scattered hard-coded text.
20. English + Spanish (`es-419`) UI support starts with the first user-facing screen.
21. Update the relevant canonical Markdown file when an approved architecture decision changes.

## Completion report
Every task ends with:
- files changed;
- implementation summary;
- tests/results;
- limitations;
- next recommended task.
