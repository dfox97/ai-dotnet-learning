import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDeploymentBasePath, stripDeploymentBasePath } from '../src/base-path.ts';

test('strips the GitHub Pages repository base path', () => {
  assert.equal(stripDeploymentBasePath('/ai-dotnet-learning/', '/ai-dotnet-learning/'), '/');
  assert.equal(stripDeploymentBasePath('/ai-dotnet-learning/lessons/csharp-foundations', '/ai-dotnet-learning/'), '/lessons/csharp-foundations');
  assert.equal(stripDeploymentBasePath('/other/lessons/csharp-foundations', '/ai-dotnet-learning/'), null);
});

test('applies the deployment base path to generated learning links', () => {
  assert.equal(applyDeploymentBasePath('/', '/ai-dotnet-learning/'), '/ai-dotnet-learning/');
  assert.equal(applyDeploymentBasePath('/report', '/ai-dotnet-learning/'), '/ai-dotnet-learning/report');
  assert.equal(applyDeploymentBasePath('capstone', '/ai-dotnet-learning/'), '/ai-dotnet-learning/capstone');
});

test('root deployments remain unchanged', () => {
  assert.equal(stripDeploymentBasePath('/report', '/'), '/report');
  assert.equal(applyDeploymentBasePath('/report', '/'), '/report');
});
