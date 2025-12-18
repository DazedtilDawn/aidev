import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { loadProjectModel } from '../src/model/loader.js';

const TEST_DIR = 'C:\\dev\\AIDEV\\tests\\fixtures\\test-project';

describe('Model Loader', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.aidev', 'model', 'components'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads components from .aidev/model/components/', async () => {
    const componentYaml = `
name: auth-service
description: Authentication
paths:
  - src/auth/**
depends_on:
  - database
`;
    writeFileSync(join(TEST_DIR, '.aidev', 'model', 'components', 'auth.yaml'), componentYaml);

    const model = await loadProjectModel(TEST_DIR);
    expect(model.components).toHaveLength(1);
    expect(model.components[0].name).toBe('auth-service');
  });

  it('builds reverse dependency map (dependentsByComponent)', async () => {
    const authYaml = `
name: auth
paths: [src/auth/**]
depends_on: [database]
`;
    const dbYaml = `
name: database
paths: [src/db/**]
depends_on: []
`;
    const apiYaml = `
name: api
paths: [src/api/**]
depends_on: [auth]
`;
    writeFileSync(join(TEST_DIR, '.aidev', 'model', 'components', 'auth.yaml'), authYaml);
    writeFileSync(join(TEST_DIR, '.aidev', 'model', 'components', 'db.yaml'), dbYaml);
    writeFileSync(join(TEST_DIR, '.aidev', 'model', 'components', 'api.yaml'), apiYaml);

    const model = await loadProjectModel(TEST_DIR);

    // database has auth depending on it
    expect(model.dependentsByComponent.get('database')).toContain('auth');
    // auth has api depending on it
    expect(model.dependentsByComponent.get('auth')).toContain('api');
    // api has nothing depending on it
    expect(model.dependentsByComponent.get('api')).toEqual([]);
  });

  it('returns empty model for project without .aidev', async () => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });

    const model = await loadProjectModel(TEST_DIR);
    expect(model.components).toHaveLength(0);
  });
});
