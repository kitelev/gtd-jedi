/**
 * Benchmark Utilities — timing measurement and SLA assertion helpers.
 *
 * Provides:
 * - measureN(): runs a function N times, returns mean + p95 timings
 * - expectUnder(): asserts that a timing is below a threshold with a descriptive label
 * - writeResults(): writes benchmark results to JSON for CI trend tracking
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface TimingResult {
  /** Mean execution time in milliseconds */
  mean: number;
  /** 95th percentile execution time in milliseconds */
  p95: number;
  /** Minimum execution time in milliseconds */
  min: number;
  /** Maximum execution time in milliseconds */
  max: number;
  /** All individual run times in milliseconds */
  runs: number[];
  /** Number of iterations */
  iterations: number;
}

export interface BenchmarkResult {
  label: string;
  timing: TimingResult;
  threshold: number;
  passed: boolean;
  timestamp: string;
}

/**
 * Run a function N times and collect timing statistics.
 * Uses performance.now() for high-resolution timing.
 *
 * @param iterations Number of times to run the function
 * @param fn The function to benchmark (can be sync or async)
 * @returns Timing statistics including mean and p95
 */
export async function measureN(
  iterations: number,
  fn: () => unknown | Promise<unknown>,
): Promise<TimingResult> {
  const runs: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const elapsed = performance.now() - start;
    runs.push(elapsed);
  }

  // Sort for percentile calculation
  const sorted = [...runs].sort((a, b) => a - b);
  const mean = runs.reduce((sum, t) => sum + t, 0) / runs.length;
  const p95Index = Math.ceil(sorted.length * 0.95) - 1;
  const p95 = sorted[p95Index];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return { mean, p95, min, max, runs, iterations };
}

/**
 * Assert that a measured time is under a threshold.
 * Throws a descriptive error if the threshold is exceeded.
 *
 * @param actualMs The measured time in milliseconds
 * @param thresholdMs The maximum allowed time in milliseconds
 * @param label A human-readable label for the benchmark
 */
export function expectUnder(actualMs: number, thresholdMs: number, label: string): void {
  if (actualMs > thresholdMs) {
    throw new Error(
      `SLA violation: "${label}" took ${actualMs.toFixed(2)}ms, ` +
      `exceeds threshold of ${thresholdMs}ms`,
    );
  }
}

/**
 * Write benchmark results to a JSON file for CI trend tracking.
 *
 * @param results Array of benchmark results
 * @param outputPath Optional output file path (defaults to tests/performance/results.json)
 */
export function writeResults(
  results: BenchmarkResult[],
  outputPath?: string,
): void {
  const filePath = outputPath ?? resolve(
    import.meta.dirname, '..', 'performance', 'results.json',
  );

  const output = {
    timestamp: new Date().toISOString(),
    benchmarks: results,
    summary: {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length,
    },
  };

  writeFileSync(filePath, JSON.stringify(output, null, 2) + '\n');
}
