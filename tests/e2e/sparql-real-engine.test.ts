/**
 * E2E: Real SPARQL Engine — validates plugin via exocortex-cli
 *
 * Runs actual SPARQL queries against the real Exocortex triple store.
 * No mocks, no custom parsers — the same engine that runs in Obsidian.
 *
 * Requires: @kitelev/exocortex-cli (npx)
 *
 * Performance note: each CLI call takes ~10s (npx startup + vault load).
 * We minimize calls by fetching all data in 2 big queries.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { sparqlQuery, unquote } from './helpers/cli-runner.js';

const PREFIX = 'PREFIX exo: <https://exocortex.my/ontology/exo#>';

// Filter to only plugin-defined assets (exclude test fixtures)
const PLUGIN_FILTER = 'FILTER(CONTAINS(STR(?definedBy), "!gtd-jedi"))';

interface PluginAsset {
  label: string;
  classes: string[];
  uid: string;
  hasPrototype: boolean;
}

describe('E2E: Real SPARQL Engine (exocortex-cli)', { timeout: 120_000 }, () => {
  let allAssets: PluginAsset[];
  let tripleCount: number;

  beforeAll(() => {
    // Query 1: get all plugin assets with their classes in one call
    const results = sparqlQuery(`
      ${PREFIX}
      SELECT ?uid ?label ?cls WHERE {
        ?s exo:Asset_isDefinedBy ?definedBy .
        ?s exo:Asset_uid ?uid .
        ?s exo:Asset_label ?label .
        ?s exo:Instance_class ?cls .
        ${PLUGIN_FILTER}
      } ORDER BY ?label
    `);

    // Group by uid (assets can have multiple classes)
    const assetMap = new Map<string, PluginAsset>();
    for (const r of results) {
      const uid = unquote(r.uid);
      if (!assetMap.has(uid)) {
        assetMap.set(uid, { uid, label: unquote(r.label), classes: [], hasPrototype: false });
      }
      assetMap.get(uid)!.classes.push(unquote(r.cls));
    }
    allAssets = [...assetMap.values()];

    // Query 2: triple count
    const countResult = sparqlQuery(`
      ${PREFIX}
      SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o }
    `);
    tripleCount = parseInt(unquote(countResult[0].count));
  });

  // ── Triple store health ──

  it('loads plugin with 500+ triples', () => {
    expect(tripleCount).toBeGreaterThan(500);
  });

  // ── Commands (RFC-009) ──

  it('discovers all GTD commands (5 workflow + 5 button commands)', () => {
    const commands = allAssets.filter(a =>
      a.classes.some(c => c.includes('exocmd__Command'))
      && !a.classes.some(c => c.includes('exocmd__CommandBinding')),
    );
    const labels = commands.map(a => a.label).sort();

    expect(labels).toEqual([
      'Complete Review',
      'Defer',
      'Delegate',
      'GTD: Context Filter',
      'GTD: Process Inbox',
      'GTD: Quick Capture',
      'GTD: Quick Start',
      'GTD: Weekly Review',
      'Next Action',
      'Someday/Maybe',
    ]);
  });

  // ── Workflow Classes ──

  it('discovers all 14 classes (12 workflow + 2 ontology)', () => {
    const classes = allAssets.filter(a =>
      a.classes.some(c => c.includes('exo__Class')),
    );
    const labels = classes.map(a => a.label).sort();

    // 12 workflow classes + gtd__Context + gtd__Review = 14
    expect(labels).toHaveLength(14);
    expect(labels).toContain('gtd__InboxItem');
    expect(labels).toContain('gtd__NextAction');
    expect(labels).toContain('gtd__WaitingFor');
    expect(labels).toContain('gtd__SomedayMaybe');
    expect(labels).toContain('gtd__Proactive');
    expect(labels).toContain('gtd__Reactive');
    expect(labels).toContain('gtd__HighEnergy');
    expect(labels).toContain('gtd__LowEnergy');
    expect(labels).toContain('gtd__AtComputer');
    expect(labels).toContain('gtd__AtPhone');
    expect(labels).toContain('gtd__AtOffice');
    expect(labels).toContain('gtd__Reference');
    // Ontology classes also have exo__Class
    expect(labels).toContain('gtd__Context');
    expect(labels).toContain('gtd__Review');
  });

  // ── Prototypes ──

  it('discovers all 6 prototypes', () => {
    const prototypes = allAssets.filter(a =>
      a.classes.some(c => c.includes('exo__Prototype')),
    );
    const labels = prototypes.map(a => a.label).sort();

    expect(labels).toHaveLength(6);
    expect(labels).toContain('GTD Task Prototype');
    expect(labels).toContain('GTD Weekly Review Prototype');
    expect(labels).toContain('GTD Daily Review Prototype');
    expect(labels).toContain('GTD Area Prototype');
    expect(labels).toContain('GTD Inbox Processing Prototype');
    expect(labels).toContain('GTD Project Planning Prototype (Natural Planning)');
  });

  // ── Dashboards ──

  it('discovers 2 dashboards', () => {
    const dashboards = allAssets.filter(a =>
      a.classes.some(c => c.includes('exo-ui__Dashboard')),
    );
    const labels = dashboards.map(a => a.label).sort();

    expect(labels).toEqual([
      'GTD Main Dashboard',
      'GTD Weekly Review Dashboard',
    ]);
  });

  // ── Ontology ──

  it('discovers 4 ontology properties', () => {
    const properties = allAssets.filter(a =>
      a.classes.some(c =>
        c.includes('DatatypeProperty') || c.includes('ObjectProperty'),
      ),
    );
    const propLabels = properties.map(a => a.label).sort();
    expect(propLabels).toHaveLength(4);
    expect(propLabels).toContain('gtd__Effort_delegatee');
    expect(propLabels).toContain('gtd__Effort_duration');
    expect(propLabels).toContain('gtd__Effort_energy');
    expect(propLabels).toContain('gtd__Effort_context');
  });

  // ── Prototype chain ──

  it('GTD Task Prototype has prototype chain to ems__TaskPrototype', () => {
    // May return >1 result if e2e-ui test-vault has copies of prototype files
    const results = sparqlQuery(`
      ${PREFIX}
      SELECT ?proto WHERE {
        ?s exo:Asset_label "GTD Task Prototype" .
        ?s exo:Asset_prototype ?proto .
      } LIMIT 1
    `);

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(unquote(results[0].proto)).toContain('ems__TaskPrototype');
  });

  // ── Total asset count ──

  it('plugin defines 36+ assets with isDefinedBy + Instance_class', () => {
    // Some assets (like !gtd-jedi.md manifest) don't have Instance_class
    // in the same triple pattern, so the join returns fewer than 38 total files
    expect(allAssets.length).toBeGreaterThanOrEqual(36);
  });
});
