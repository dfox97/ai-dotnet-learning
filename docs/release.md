# Personal alpha release

ReviewLab publishes as a static GitHub Pages personal alpha. The release intentionally adds no account system, backend, analytics vendor, live AI dependency or browser-hosted .NET execution.

## Release path

1. Changes merge to `main` only after the CI workflow passes lint, typecheck, unit tests, content validation, capstone verification, Playwright and the production build.
2. `Deploy personal alpha` is triggered by the successful main-branch CI run and checks out that exact approved commit SHA.
3. The workflow runs a production Pages build, creates `dist/404.html` from the same app shell for SPA deep-link recovery, and uploads the generated `dist` directory as a Pages artifact. `dist/` remains ignored and is never committed.
4. GitHub Pages deploys the artifact using the `github-pages` environment.
5. A post-deployment smoke job verifies the published entry point plus a lesson deep link, baseline diagnostic, report and capstone guidance document.

## Required repository setting

GitHub Pages must use **Settings → Pages → Source: GitHub Actions**. The deploy workflow detects when Pages has not been enabled and emits a notice rather than pretending a deployment succeeded.

Required workflow permissions are deliberately narrow:

- `contents: read`
- `pages: write`
- `id-token: write`

## Deep links

The Vite Pages build uses the repository base path. Client routing strips that deployment prefix before resolving learning locations. A copied `404.html` supplies the same application shell for direct GitHub Pages requests such as lesson, diagnostic, report and capstone routes, so browser refresh can hand the path back to ReviewLab.

## Failure recovery

- **CI fails:** no Pages workflow deploy occurs. Fix the failing check and merge a new main commit.
- **Pages is disabled:** enable GitHub Actions as the Pages source, then rerun the `Deploy personal alpha` workflow for the latest successful main CI run.
- **Build/upload/deploy fails:** rerun the failed workflow after correcting the cause. The previously published Pages artifact remains the last known release.
- **Post-deploy smoke fails:** treat the release as unhealthy even if upload/deploy succeeded. Inspect the deployment URL and route/base-path behavior, fix on a branch, pass CI, and merge another main commit.
- **Bad main release:** revert the offending main commit or merge a corrective PR. The next successful CI run produces and deploys the replacement artifact.

## Personal-alpha promise

Every published surface carries the label **ReviewLab personal alpha** and the product promise:

> Learn production .NET by reviewing and correcting realistic AI-generated code, using TypeScript experience as a bridge.

The alpha validates the learning workflow for one learner; it does not claim market fit or production SaaS readiness.
