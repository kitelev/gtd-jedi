/**
 * Performance Benchmark Tests — SLA threshold assertions.
 *
 * Verifies that critical operations complete within defined time budgets:
 * 1. Plugin load (50 prototype files): < 500ms
 * 2. Dashboard queries (1000 task instances): < 200ms
 * 3. Depth-3 materialization: < 50ms
 * 4. Individual file parse: < 10ms
 *
 * Each benchmark runs 10 iterations and asserts on the mean time.
 * Results are written to tests/performance/results.json for CI tracking.
 *
 * SLA rationale:
 * - 500ms = acceptable startup delay for plugin loading
 * - 200ms = responsive UI for dashboard rendering
 * - 50ms  = per-task budget for prototype chain evaluation
 * - 10ms  = individual file parse overhead budget
 */

import { describe, it, expect, afterAll } from 'vitest';
import { resolve } from 'node:path';
import { rmSync } from 'node:fs';
import {
  measureN,
  expectUnder,
  writeResults,
  type BenchmarkResult,
} from '../helpers/benchmark-utils.js';
import {
  loadPlugin,
  findByClass,
  countTriples,
} from '../helpers/plugin-loader.js';
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

const ITERATIONS = 10;
const DEPTH_3_FIXTURE = resolve(import.meta.dirname, '../fixtures/depth-3-chain');
const results: BenchmarkResult[] = [];

/** Record a benchmark result for JSON output */
function recordResult(
  label: string,
  timing: { mean: number; p95: number; min: number; max: number; runs: number[]; iterations: number },
  threshold: number,
): void {
  results.push({
    label,
    timing,
    threshold,
    passed: timing.mean <= threshold,
    timestamp: new Date().toISOString(),
  });
}

describe('Performance Benchmarks', () => {
  const cleanupPaths: string[] = [];

  afterAll(() => {
    // Write results JSON
    writeResults(results);

    // Cleanup temporary directories
    for (const p of cleanupPaths) {
      try {
        rmSync(p, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('SLA: Plugin Load', () => {
    it('loads 50-prototype synthetic plugin in < 500ms (mean of 10 runs)', async () => {
      // Generate a synthetic plugin with 50 prototypes
      const synth = generateSyntheticPlugin({ prototypeCount: 50 });
      cleanupPaths.push(synth.pluginPath);

      expect(synth.fileCount).toBe(51); // 50 prototypes + 1 manifest

      const timing = await measureN(ITERATIONS, () => loadPlugin(synth.pluginPath));

      console.log(
        `[Plugin Load 50] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('plugin-load-50-prototypes', timing, 500);
      expectUnder(timing.mean, 500, 'plugin-load-50-prototypes');
    });
  });

  describe('SLA: Dashboard Queries', () => {
    it('queries 1000 task instances in < 200ms (mean of 10 runs)', async () => {
      // Generate a prototype and 1000 task instances
      const synth = generateSyntheticPlugin({ prototypeCount: 1 });
      cleanupPaths.push(synth.pluginPath);

      const instancesDir = resolve(synth.pluginPath, 'instances');
      generateTaskInstances(
        instancesDir,
        synth.prototypeUids[0],
        'Benchmark Prototype 1',
        1000,
      );

      // Load the full plugin with all instances
      const store = await loadPlugin(synth.pluginPath);
      expect(store.files.length).toBeGreaterThanOrEqual(1000);

      // Benchmark: simulate dashboard queries
      // 1. Filter by class (ems__Task)
      // 2. Filter by status
      // 3. Count triples
      const timing = await measureN(ITERATIONS, () => {
        // Query 1: Find all tasks
        const tasks = findByClass(store, 'ems__Task');

        // Query 2: Filter by status = "doing"
        const doing = tasks.filter(
          (f) => f.frontmatter.ems__Effort_status === 'doing',
        );

        // Query 3: Group by context
        const byContext = new Map<string, number>();
        for (const f of tasks) {
          const ctx = String(f.frontmatter.gtd__context ?? 'none');
          byContext.set(ctx, (byContext.get(ctx) ?? 0) + 1);
        }

        // Query 4: Count total triples
        countTriples(store);

        // Return something to prevent dead-code elimination
        return { taskCount: tasks.length, doingCount: doing.length, contexts: byContext.size };
      });

      console.log(
        `[Dashboard 1000] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('dashboard-1000-tasks', timing, 200);
      expectUnder(timing.mean, 200, 'dashboard-1000-tasks');
    });
  });

  describe('SLA: Depth-3 Materialization', () => {
    it('materializes depth-3 chain in < 50ms (mean of 10 runs)', async () => {
      const files = await parseAllPluginFiles(DEPTH_3_FIXTURE);
      const uidMap = buildUidMap(files);

      // Find the leaf instance
      const userInstance = files.find(
        (f) => f.uid === 'aaaa0004-0004-0004-0004-000000000004',
      );
      expect(userInstance).toBeDefined();

      const timing = await measureN(ITERATIONS, () => {
        return materializeWithDepth(userInstance!, uidMap);
      });

      console.log(
        `[Materialize D3] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('materialization-depth-3', timing, 50);
      expectUnder(timing.mean, 50, 'materialization-depth-3');
    });

    it('materializes all assets in depth-3 fixture in < 50ms', async () => {
      const files = await parseAllPluginFiles(DEPTH_3_FIXTURE);

      const timing = await measureN(ITERATIONS, () => {
        return materializeAll(files);
      });

      console.log(
        `[Materialize All] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('materialization-all-depth-3', timing, 50);
      expectUnder(timing.mean, 50, 'materialization-all-depth-3');
    });
  });

  describe('SLA: Individual File Parse', () => {
    it('parses a single file in < 10ms (mean of 10 runs)', async () => {
      const sampleFile = resolve(DEPTH_3_FIXTURE, 'user-instance.md');

      const timing = await measureN(ITERATIONS, () => {
        return parseFile(sampleFile);
      });

      console.log(
        `[Single Parse] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('single-file-parse', timing, 10);
      expectUnder(timing.mean, 10, 'single-file-parse');
    });
  });

  describe('SLA: Conformance Suite', () => {
    it('runs full conformance parse in < 50ms (mean of 10 runs)', async () => {
      const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');

      const timing = await measureN(ITERATIONS, () => {
        return parseAllPluginFiles(PLUGIN_ROOT);
      });

      console.log(
        `[Conformance Parse] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('conformance-suite-parse', timing, 50);
      expectUnder(timing.mean, 50, 'conformance-suite-parse');
    });
  });

  describe('SLA: Chain Resolution', () => {
    it('resolves prototype chains for all plugin files in < 200ms', async () => {
      const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');
      const store = await loadPlugin(PLUGIN_ROOT);

      const timing = await measureN(ITERATIONS, () => {
        for (const file of store.files) {
          resolveChain(store, file);
        }
      });

      console.log(
        `[Chain Resolution] mean=${timing.mean.toFixed(2)}ms ` +
        `p95=${timing.p95.toFixed(2)}ms ` +
        `min=${timing.min.toFixed(2)}ms max=${timing.max.toFixed(2)}ms`,
      );

      recordResult('chain-resolution-all', timing, 200);
      expectUnder(timing.mean, 200, 'chain-resolution-all');
    });
  });
});

describe('Benchmark Utils Self-Test', () => {
  it('measureN returns correct structure', async () => {
    const result = await measureN(5, () => {
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
      return sum;
    });

    expect(result.iterations).toBe(5);
    expect(result.runs).toHaveLength(5);
    expect(result.mean).toBeGreaterThan(0);
    expect(result.p95).toBeGreaterThanOrEqual(result.mean * 0.5); // p95 >= reasonable fraction of mean
    expect(result.min).toBeLessThanOrEqual(result.mean);
    expect(result.max).toBeGreaterThanOrEqual(result.mean);
  });

  it('expectUnder does not throw when under threshold', () => {
    expect(() => expectUnder(100, 500, 'test-pass')).not.toThrow();
  });

  it('expectUnder throws with descriptive message when over threshold', () => {
    expect(() => expectUnder(600, 500, 'test-fail')).toThrow(
      /SLA violation.*test-fail.*600.*500/,
    );
  });
});
