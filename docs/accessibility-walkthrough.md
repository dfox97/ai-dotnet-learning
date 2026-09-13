# Personal-alpha accessibility walkthrough

ReviewLab targets WCAG 2.2 AA fundamentals for the browser learning journey. The executable capstone remains desktop-first because the learner must run a local .NET workspace and terminal commands.

## Automated coverage

The Playwright accessibility regression suite verifies:

- one main landmark and a visible level-one heading on the dashboard and major learning surfaces;
- named buttons, links, inputs, selects and textareas;
- keyboard completion of the core review flow;
- visible keyboard focus and stable focus order;
- reduced-motion behaviour;
- responsive rendering without page-level horizontal overflow at a 390 px viewport;
- diagnostic, practice, report and capstone guidance surfaces.

Run it with:

```bash
npm --prefix e2e test -- tests/accessibility.spec.ts
```

## Manual walkthrough

Run this walkthrough before a personal-alpha release and after meaningful visual/navigation changes.

1. **Keyboard only** — Starting at `/`, use Tab, Shift+Tab, Enter, Space and arrow keys where relevant. Open a lesson, flag a line, enter structured reasoning, submit it, visit a practice activity, open the baseline diagnostic, visit the report and open the capstone. Confirm focus never becomes visually lost and the order follows the reading order.
2. **Headings and landmarks** — On each destination, confirm there is one primary `main` landmark, a meaningful `h1`, and section headings that describe the content rather than presentation.
3. **Labels and announcements** — Confirm every form control has a spoken label. Trigger review feedback, diagnostic results, validation/recovery states and capstone completion; confirm status text is understandable without relying on colour alone.
4. **Contrast and non-colour cues** — Check normal text, buttons, focus rings, selected states, warnings and success states with a WCAG contrast checker. Target at least 4.5:1 for normal text and 3:1 for large text and meaningful UI graphics. Confirm icons/text or shape changes accompany colour-coded states.
5. **Reduced motion** — Enable the operating system/browser reduced-motion preference. Navigation and state changes should not use smooth scrolling or non-essential animation.
6. **Small screen** — At approximately 390 × 844, read the dashboard, a lesson, diagnostic and report without page-level horizontal scrolling. Code regions may scroll internally when necessary.
7. **Capstone requirements** — Confirm the capstone clearly states that local repair requires a desktop environment, Git/Node.js and the .NET 8 SDK, and that ReviewLab does not execute local code in the browser.
8. **Zoom** — Check the primary browser journey at 200% zoom. Text and controls should remain usable without overlapping critical actions.

## Known scope

This is a personal-alpha accessibility bar, not a formal accessibility certification. Automated tests catch regressions in semantics, focus, motion and responsive layout; the manual pass remains necessary for contrast, screen-reader quality and zoom/reflow judgement.
