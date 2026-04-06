/**
 * Dashboard query helpers for BDD tests.
 * Simulates the filtering logic from the GTD dashboards
 * using the MockExocortexApi in-memory store.
 *
 * Queries are modeled after the SPARQL in:
 *   - dashboards/93fc4924 (GTD Main Dashboard)
 *   - dashboards/6ed50956 (GTD Weekly Review Dashboard)
 */

import { MockExocortexApi, type Asset } from './mock-exocortex-api.js';

/**
 * Context Filter — filters NextAction items by context and/or energy.
 * Models the "GTD: Context Filter" command behavior.
 *
 * @param api - MockExocortexApi instance
 * @param context - Context class to filter by (e.g., 'gtd__AtComputer'), or undefined for Any
 * @param energy - Energy class to filter by (e.g., 'gtd__HighEnergy'), or undefined for Any
 * @returns Filtered array of assets
 */
export function contextFilter(
  api: MockExocortexApi,
  context?: string,
  energy?: string,
): Asset[] {
  // Start with all NextAction items
  let results = api.queryByClass('gtd__NextAction');

  // Filter by context if specified
  if (context) {
    results = results.filter(a => a.classes.includes(context));
  }

  // Filter by energy if specified
  if (energy) {
    results = results.filter(a => a.classes.includes(energy));
  }

  return results;
}

/**
 * Jedi Ratio query — counts Proactive vs Reactive tasks.
 * Models the SPARQL from GTD Main Dashboard "Jedi Ratio" section.
 *
 * Ratio = Proactive / (Proactive + Reactive), min 0, max 1.
 * Returns counts and ratio for assertions.
 */
export function jediRatio(api: MockExocortexApi): {
  proactiveCount: number;
  reactiveCount: number;
  ratio: number;
} {
  const proactiveCount = api.queryByClass('gtd__Proactive').length;
  const reactiveCount = api.queryByClass('gtd__Reactive').length;
  const total = proactiveCount + reactiveCount;
  const ratio = total === 0 ? 0 : proactiveCount / total;

  return { proactiveCount, reactiveCount, ratio };
}
