/**
 * Performance Benchmarks — Vitest bench format.
 *
 * Run with: npx vitest bench
 *
 * These benchmarks use vitest's built-in bench() API for detailed
 * statistical profiling (ops/sec, variance, percentiles).
 *
 * Complements benchmarks.test.ts which uses SLA assertions.
 */

import { bench, describe } from 'vitest';
import { resolve } from 'node:path';
import { rmSync } from 'node:fs';
import { loadPlugin, findByClass, countTriples } from '../helpers/plugin-loader.js';
import {
  generateSyntheticPlugin,
  generateTaskInstances,
} from '../helpers/synthetic-plugin-generator.js';
import { parseAllPluginFiles, parseFile } from '../conformance/structural/parser.js';
import {
  buildUidMap,
  materializeWithDepth,
  materializeAll,
} from '../helpers/materializer.js';
import { resolveChain } from '../helpers/chain-resolver.js';

const DEPTH_3_FIXTURE = resolve(import.meta.dirname, '../fixtures/depth-3-chain');
const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');

describe('Plugin Load', () => {
  let synthPath: string;

  // Generate fixture once before benchmarks
  const synth = generateSyntheticPlugin({ prototypeCount: 50 });
  synthPath = synth.pluginPath;

  bench('load 50-prototype synthetic plugin', async () => {
    await loadPlugin(synthPath);
  }, { iterations: 10, time: 0 });

  bench('load real gtd-jedi plugin', async () => {
    await loadPlugin(PLUGIN_ROOT);
  }, { iterations: 10, time: 0 });
});

describe('Dashboard Queries', () => {
  // Pre-generate and load 1000-task store
  const synth = generateSyntheticPlugin({ prototypeCount: 1 });
  const instancesDir = resolve(synth.pluginPath, 'instances');
  generateTaskInstances(
    instancesDir,
    synth.prototypeUids[0],
    'Benchmark Prototype 1',
    1000,
  );

  let store: Awaited<ReturnType<typeof loadPlugin>>;

  bench('query 1000 tasks: filter + group + count', async () => {
    // Load on first run, reuse after
    if (!store) {
      store = await loadPlugin(synth.pluginPath);
    }

    const tasks = findByClass(store, 'ems__Task');
    const doing = tasks.filter((f) => f.frontmatter.ems__Effort_status === 'doing');
    const byContext = new Map<string, number>();
    for (const f of tasks) {
      const ctx = String(f.frontmatter.gtd__context ?? 'none');
      byContext.set(ctx, (byContext.get(ctx) ?? 0) + 1);
    }
    countTriples(store);
    return { taskCount: tasks.length, doingCount: doing.length };
  }, { iterations: 10, time: 0 });
});

describe('Materialization', () => {
  bench('materialize depth-3 chain (single asset)', async () => {
    const files = await parseAllPluginFiles(DEPTH_3_FIXTURE);
    const uidMap = buildUidMap(files);
    const userInstance = files.find(
      (f) => f.uid === 'aaaa0004-0004-0004-0004-000000000004',
    );
    materializeWithDepth(userInstance!, uidMap);
  }, { iterations: 10, time: 0 });

  bench('materialize all assets in depth-3 fixture', async () => {
    const files = await parseAllPluginFiles(DEPTH_3_FIXTURE);
    materializeAll(files);
  }, { iterations: 10, time: 0 });
});

describe('File Parsing', () => {
  const sampleFile = resolve(DEPTH_3_FIXTURE, 'user-instance.md');

  bench('parse single .md file', () => {
    parseFile(sampleFile);
  }, { iterations: 10, time: 0 });

  bench('parse all plugin files (real plugin)', async () => {
    await parseAllPluginFiles(PLUGIN_ROOT);
  }, { iterations: 10, time: 0 });
});

describe('Chain Resolution', () => {
  bench('resolve chains for all plugin files', async () => {
    const store = await loadPlugin(PLUGIN_ROOT);
    for (const file of store.files) {
      resolveChain(store, file);
    }
  }, { iterations: 10, time: 0 });
});
