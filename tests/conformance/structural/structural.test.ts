import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseAllPluginFiles } from './parser.js';
import { checkWikilinksResolve } from './check-wikilinks.js';
import { checkNoCircularChains } from './check-prototype-chain.js';
import { checkClassesHaveLabels } from './check-class-labels.js';
import { checkCommandsHaveGrounding } from './check-command-grounding.js';
import { runStructuralConformance } from './structural-validator.js';

const FIXTURES = resolve(import.meta.dirname, '../../fixtures');
const PLUGIN_ROOT = resolve(import.meta.dirname, '../../..');

describe('checkWikilinksResolve', () => {
  it('returns pass for fixture with all valid wikilinks', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'valid-plugin'));
    const result = checkWikilinksResolve(files);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns fail with file path for fixture with broken wikilink', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'broken-wikilink'));
    const result = checkWikilinksResolve(files);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].file).toContain('broken.md');
    expect(result.errors[0].message).toContain('deadbeef-dead-dead-dead-deaddeadbeef');
  });
});

describe('checkNoCircularChains', () => {
  it('returns pass for linear A→B→C chain', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'valid-plugin'));
    const result = checkNoCircularChains(files);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns fail for A→B→A cycle', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'circular-chain'));
    const result = checkNoCircularChains(files);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Circular prototype chain');
  });
});

describe('checkClassesHaveLabels', () => {
  it('returns pass for class with exo__Asset_label', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'valid-plugin'));
    const result = checkClassesHaveLabels(files);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns fail for class missing label', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'missing-label'));
    const result = checkClassesHaveLabels(files);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].file).toContain('no-label.md');
    expect(result.errors[0].message).toContain('missing exo__Asset_label');
  });
});

describe('checkCommandsHaveGrounding', () => {
  it('returns pass for command with ## Grounding section', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'valid-plugin'));
    const result = checkCommandsHaveGrounding(files);
    expect(result.passed).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns fail for command without grounding', async () => {
    const files = await parseAllPluginFiles(resolve(FIXTURES, 'missing-grounding'));
    const result = checkCommandsHaveGrounding(files);
    expect(result.passed).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].file).toContain('no-grounding.md');
    expect(result.errors[0].message).toContain('missing "## Grounding" section');
  });
});

describe('Integration: real gtd-jedi plugin', () => {
  it('all structural conformance tests pass on current plugin', async () => {
    const report = await runStructuralConformance(PLUGIN_ROOT);

    if (!report.wikilinks.passed) {
      console.error('Wikilink errors:', report.wikilinks.errors);
    }
    if (!report.prototypeCycles.passed) {
      console.error('Prototype cycle errors:', report.prototypeCycles.errors);
    }
    if (!report.classLabels.passed) {
      console.error('Class label errors:', report.classLabels.errors);
    }
    if (!report.commandGrounding.passed) {
      console.error('Command grounding errors:', report.commandGrounding.errors);
    }

    expect(report.allPassed).toBe(true);
  });
});
