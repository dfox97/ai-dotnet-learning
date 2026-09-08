# Publishing the personal alpha

ReviewLab publishes the static personal alpha through GitHub Pages. The deployment workflow is intentionally downstream of CI: it receives the completed `CI` workflow event for `main`, checks out that exact successful commit SHA, builds it in Pages mode, then deploys the generated `dist` artifact.

## Repository setting

In **Settings → Pages**, set the source to **GitHub Actions**. The workflow requires only the repository contents read permission plus the GitHub Pages and OIDC permissions declared in `.github/workflows/pages.yml`. No account, backend, analytics service, secret token, or live AI dependency is required by ReviewLab itself.

## Base path and direct links

The Pages build uses Vite mode `pages`, which emits assets under `/ai-dotnet-learning/`. The deployment also copies `index.html` to `404.html` so GitHub Pages can load the client application for direct SPA links instead of showing its default 404 document.

Application routing must strip `/ai-dotnet-learning/` before parsing a ReviewLab learning location and reapply it when generating a public URL. `src/base-path.ts` contains the tested helpers for this. Production smoke coverage should not be considered complete until lesson, diagnostic, report, and capstone routes are wired through that adapter.

## Failure recovery

If normal CI fails, no deployment is attempted. Fix the failing commit or revert it; the next successful `main` CI run creates the next deployment.

If the Pages build/deploy job itself fails after CI passed, inspect that workflow run first. A transient deployment failure can be rerun from GitHub Actions because the workflow checks out the original CI-approved commit SHA. Do not commit `dist/` or manually copy generated production assets into the repository as a recovery mechanism.

## Release verification

Before calling the personal alpha published, verify the deployed site itself rather than only the build artifact:

- root entry renders and identifies ReviewLab as a personal alpha
- a lesson deep link loads after a direct refresh
- baseline/post diagnostic locations are reachable
- the local learning report route is reachable
- capstone guidance is reachable and clearly states its local .NET SDK/desktop requirements
- the critical journey still works without an account, backend, analytics vendor, or live AI call
