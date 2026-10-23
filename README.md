# ReviewLab

ReviewLab helps TypeScript and Node automation engineers learn production .NET by reviewing and correcting realistic AI-generated code.

## Development

Use Node.js 22.12 or newer.

```bash
npm ci
npm run dev
```

## Quality checks

Run the same checks used by CI before opening a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm --prefix e2e ci
npm --prefix e2e exec playwright install chromium
npm --prefix e2e test
npm run build
```

- `npm run lint` runs ESLint across the TypeScript source and test files.
- `npm run typecheck` validates the TypeScript project without emitting output.
- `npm test` runs focused learner-visible behaviour tests with Node's built-in test runner.
- `npm --prefix e2e test` starts ReviewLab and exercises critical learner journeys in a real Chromium browser with Playwright.
- `npm run build` produces the production Vite build.

For browser-test debugging, run `npm --prefix e2e run test:headed` to watch the browser or `npm --prefix e2e run test:debug` to use Playwright's interactive debugger. CI retains the Playwright HTML report when a browser regression fails.

This repository is currently a personal alpha. See the GitHub roadmap for the planned learner journey, diagnostics, and capstone.

## Contributing

Create a focused branch, make the smallest coherent change, run the full quality checks above, and open a pull request describing the behaviour changed and how it was verified. Browser tests should cover cross-component learner journeys and regression-prone workflows; lower-level validation and logic belong in the faster unit/content tests.

When real C# projects are introduced, .NET analyzers/formatting should be configured alongside the JavaScript/TypeScript ESLint checks rather than attempting to lint C# through ESLint.

## Licensing

Application and capstone code are licensed under MIT. Authored educational content is licensed under CC BY 4.0.
## DotNet Learning Lab (first milestone)

Open **DotNet Learning Lab** from the workspace. The first 10–15-minute session covers reference/value semantics through multiple choice, output prediction, bug spotting and a written explanation. Due questions come first; unanswered and weaker concepts take priority within the review queue. Attempts are stored in `server/progress/reference-value-types.md` (ignored by Git), including answers, feedback and scores. The dashboard tracks latest scores, a UTC streak, review dates and mastery requiring consecutive passing attempts on distinct dates. Markdown can be downloaded from the dashboard.

Requires .NET 8 and Node 24. In two terminals from the repository root:

```bash
dotnet run --project server/LearningLab.csproj
npm run dev
```

Vite proxies `/api/lab` to the ASP.NET server at port 5050. Keep both processes running. Progress survives restarts; back up `server/progress` to retain it across machines. Set `LAB_PROGRESS_DIR` to use a different private storage directory. This MVP is a single-user local application. It has no login or multi-user isolation; do not expose it publicly without authentication and deployment work. GitHub Pages only hosts the existing static workspace; it cannot run the learning backend.

AI keys stay on the server. Configure either:

- OpenAI: set `LAB_AI_KEY` (or local `OPENAI_API_KEY`); defaults to `gpt-4.1-mini`.
- Fireworks: set `FIREWORKS_API_KEY`; defaults to its OpenAI-compatible endpoint and `accounts/fireworks/models/llama-v3p3-70b-instruct`.

Set `LAB_AI_MODEL` for another available model and `LAB_AI_ENDPOINT` for an explicit HTTPS chat-completions endpoint. `LAB_AI_KEY` takes priority; avoid mixing provider keys in the same process. In the cloud, add secrets securely in environment settings, never in source or chat. AI requests transmit the submitted answer or tutor message and relevant learning context to the selected provider. Written-answer grading and tutor replies use that provider; objective questions use the deterministic answer key. Provider errors preserve the answer on screen and do not write fabricated scores. Without a key, practice mode provides authored explanations and scores objective answers; written explanations use a guided self-review checklist and are saved as unscored reflections, including self-reported improvement areas. Reflections count as reviewed evidence and toward the learning streak, but never increase the numeric average or establish mastery. Tutor challenges explain the assessment; resubmit a question in a new session to change its recorded score.

Validation: `dotnet build server/LearningLab.csproj`, normal frontend quality checks, and `LAB_E2E=1 npm --prefix e2e test` with both servers running. The Lab browser test is skipped by default so static-only CI remains supported.
