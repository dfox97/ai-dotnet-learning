# ReviewLab

ReviewLab helps TypeScript and Node automation engineers learn production .NET by reviewing and correcting realistic AI-generated code.

The project is currently a personal alpha. The learner journey, diagnostics, exercises, and capstone will continue to evolve while the repository foundations are stabilised.

## Development

Use Node.js 24.

Install dependencies from the committed lockfile:

```bash
npm ci
```

Start the local development server:

```bash
npm run dev
```

## Quality checks

Run the same checks used by CI before opening or updating a pull request:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

- `npm run lint` performs lightweight repository source hygiene checks.
- `npm run typecheck` runs the TypeScript project build in type-check-only mode.
- `npm test` runs the baseline Node test harness, including learner-visible syntax highlighting behaviour.
- `npm run build` produces the production Vite build.

## Contribution workflow

Create a focused branch from the latest intended base, make the smallest coherent change, run all quality checks locally, and open a pull request describing the behaviour changed and how it was verified. Keep generated output and dependency directories out of version control.

## Licensing

Application code, configuration, tests, and capstone code are licensed under the MIT License in `LICENSE`.

Authored educational material is licensed under CC BY 4.0 as described in `LICENSE-CONTENT`. This includes lesson text, explanations, review scenarios, and other original learning content. Third-party material remains subject to its own licence.
