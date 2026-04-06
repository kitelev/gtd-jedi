/**
 * Integration Test: Plugin Load
 *
 * Verifies that the gtd-jedi plugin loads successfully, producing sufficient
 * triples, with all workflow-classes and prototypes discoverable.
 *
 * Expected plugin contents:
 *   - 12 workflow-classes (in workflow-classes/ directory):
 *       gtd__HighEnergy, gtd__LowEnergy, gtd__AtComputer, gtd__AtOffice,
 *       gtd__AtPhone, gtd__InboxItem, gtd__NextAction, gtd__WaitingFor,
 *       gtd__SomedayMaybe, gtd__Reference, gtd__Proactive, gtd__Reactive
 *   - 6 prototypes (in prototypes/ directory):
 *       GTD Task Prototype, GTD Daily Review Prototype,
 *       GTD Weekly Review Prototype, GTD Inbox Processing Prototype,
 *       GTD Project Planning Prototype, GTD Area Prototype
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { loadPlugin, countTriples, findByDirectory, type PluginStore } from '../helpers/plugin-loader.js';
import { isChainResolvable } from '../helpers/chain-resolver.js';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');

describe('Plugin Load Integration', () => {
  let store: PluginStore;

  beforeAll(async () => {
    store = await loadPlugin(PLUGIN_ROOT);
    // Log load time for #14 performance baseline
    console.log(`Plugin loaded in ${store.loadTimeMs.toFixed(2)}ms`);
    console.log(`Total files: ${store.files.length}`);
    console.log(`Total triples: ${countTriples(store)}`);
  });

  it('loads more than 30 triples', () => {
    // Each .md file produces multiple triples from its frontmatter.
    // With 38 plugin files, each having 3-8 frontmatter keys,
    // we expect well over 30 triples.
    const count = countTriples(store);
    expect(count).toBeGreaterThan(30);
  });

  it('discovers all 12 workflow-classes', () => {
    const workflowClasses = findByDirectory(store, 'workflow-classes');
    const labels = workflowClasses
      .map((f) => f.frontmatter.exo__Asset_label as string)
      .sort();

    expect(workflowClasses).toHaveLength(12);
    expect(labels).toEqual([
      'gtd__AtComputer',
      'gtd__AtOffice',
      'gtd__AtPhone',
      'gtd__HighEnergy',
      'gtd__InboxItem',
      'gtd__LowEnergy',
      'gtd__NextAction',
      'gtd__Proactive',
      'gtd__Reactive',
      'gtd__Reference',
      'gtd__SomedayMaybe',
      'gtd__WaitingFor',
    ]);
  });

  it('discovers all 6 prototypes with resolvable chains', () => {
    const prototypes = findByDirectory(store, 'prototypes');
    const labels = prototypes
      .map((f) => f.frontmatter.exo__Asset_label as string)
      .sort();

    expect(prototypes).toHaveLength(6);
    expect(labels).toEqual([
      'GTD Area Prototype',
      'GTD Daily Review Prototype',
      'GTD Inbox Processing Prototype',
      'GTD Project Planning Prototype (Natural Planning)',
      'GTD Task Prototype',
      'GTD Weekly Review Prototype',
    ]);

    // Verify every prototype chain is resolvable (no dangling links)
    for (const proto of prototypes) {
      const label = proto.frontmatter.exo__Asset_label;
      expect(
        isChainResolvable(store, proto),
        `Prototype "${label}" has a dangling prototype chain`,
      ).toBe(true);
    }
  });
});
