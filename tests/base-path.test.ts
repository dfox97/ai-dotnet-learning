import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDeploymentBasePath, stripDeploymentBasePath } from '../src/base-path.ts';

test('keeps root deployments unchanged', () => {
  assert.equal(applyDeploymentBasePath('/lessons/async-reliability', '/'), '/lessons/async-reliability');
  assert.equal(stripDeploymentBasePath('/lessons/async-reliability', '/'), '/lessons/async-reliability');
});

test('round-trips ReviewLab routes under the GitHub Pages repository path', () => {
  const base = '/ai-dotnet-learning/';
  const routes = ['/', '/lessons/async-reliability', '/diagnostics/baseline-production-review', '/report', '/capstone'];

  for (const route of routes) {
    const deployed = applyDeploymentBasePath(route, base);
    assert.equal(stripDeploymentBasePath(deployed, base), route);
  }
});

test('rejects paths that belong to another deployment base', () => {
  assert.equal(stripDeploymentBasePath('/another-app/lessons/example', '/ai-dotnet-learning/'), null);
});
