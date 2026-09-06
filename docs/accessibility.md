# Accessibility verification

ReviewLab treats accessibility as part of the learning workflow, not a final visual-polish pass.

CI covers regressions that are practical to automate with the existing Playwright stack:

- one main landmark and a visible level-one heading on the dashboard
- no unnamed buttons, links or form controls
- no duplicate DOM ids on the dashboard
- the core open-lesson → flag-line → submit-review journey works by keyboard
- repeated Tab navigation lands on visible focusable elements rather than losing focus to the document body

Before a personal-alpha release, also verify manually at desktop and narrow/mobile widths:

- visible focus indication is easy to locate against the surrounding background
- sidebar/mobile navigation can be opened, used and dismissed without a pointer
- focus order follows the visual/read order and does not become trapped in navigation or feedback panels
- heading hierarchy describes each learning surface rather than being chosen for visual size
- instructions do not rely on colour, icon shape or pointer position alone
- selected code lines and review feedback expose their state in text/accessible names
- zoom to 200% does not hide required controls or force two-dimensional scrolling for normal reading
- reduced-motion preferences do not block or obscure learning interactions
- text and interactive-control contrast is checked with an appropriate contrast tool

Automated browser checks are regression protection, not a WCAG conformance claim. Any issue found during keyboard, zoom, screen-reader or contrast review should become a reproducible test where practical.
