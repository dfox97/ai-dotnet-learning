# Runnable capstone workspace

The capstone is a disposable .NET 8 automation-worker project. It deliberately combines cancellation, scoped dependencies, persistence, an external-service boundary, idempotency, observability, and one tightly bounded AI-tool decision.

## Generate the learner workspace

From the ReviewLab repository root:

```bash
node scripts/generate-capstone.ts --output ../reviewlab-capstone
cd ../reviewlab-capstone
dotnet test ReviewLab.Capstone.Tests/ReviewLab.Capstone.Tests.csproj
```

The starter test suite is expected to fail. Those failures are the repair brief: inspect the worker and composition root, record your review findings, make the production fixes, then rerun `dotnet test` until the suite passes.

The generator deletes and recreates only the output directory you provide. It does not modify the ReviewLab checkout.

## Maintainer verification

CI generates both variants. It confirms the starter still exposes the intended repair work, then generates the separately maintained expert variant and requires its complete test suite to pass:

```bash
node scripts/generate-capstone.ts --output .tmp/capstone-expert --variant expert
dotnet test .tmp/capstone-expert/ReviewLab.Capstone.Tests/ReviewLab.Capstone.Tests.csproj
```

The expert variant exists for deterministic validation and later learner comparison; it is not part of the default generated learner workspace.
