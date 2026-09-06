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