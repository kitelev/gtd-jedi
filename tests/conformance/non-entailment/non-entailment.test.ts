import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseAllPluginFiles } from '../structural/parser.js';
import { loadConformanceTestCases } from '../../helpers/conformance-parser.js';
import {
  buildUidMap,
  materializeAsset,
  NON_INHERITABLE_PROPERTIES,
} from '../../helpers/materializer.js';
import {
  NON_INHERITABLE_PROPERTIES as REGISTRY,
  isNonInheritable,
} from '../../../src/constants/non-inheritable-properties.js';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../../..');
const CASES_DIR = resolve(import.meta.dirname, 'cases');

describe('Non-entailment conformance test case parsing', () => {
  it('loads all non-entailment test cases from cases/ directory', async () => {
    const cases = await loadConformanceTestCases(CASES_DIR, 'non-entailment');
    expect(cases.length).toBeGreaterThanOrEqual(4);
    for (const tc of cases) {
      expect(tc.testType).toBe('non-entailment');
      expect(tc.testId).toMatch(/^NENT-\d{3}$/);
      expect(tc.description).toBeTruthy();
      expect(tc.result).toBe(false);
    }
  });
});

describe('NonInheritable property registry', () => {
  it('registry contains exo__Asset_uid', () => {
    expect(REGISTRY).toContain('exo__Asset_uid');
  });

  it('registry contains exo__Asset_label', () => {
    expect(REGISTRY).toContain('exo__Asset_label');
  });

  it('registry contains ems__Effort_status', () => {
    expect(REGISTRY).toContain('ems__Effort_status');
  });

  it('registry contains exo__Asset_description', () => {
    expect(REGISTRY).toContain('exo__Asset_description');
  });

  it('registry contains exo__Asset_isDefinedBy', () => {
    expect(REGISTRY).toContain('exo__Asset_isDefinedBy');
  });

  it('registry contains aliases', () => {
    expect(REGISTRY).toContain('aliases');
  });

  it('isNonInheritable returns true for registry members', () => {
    expect(isNonInheritable('exo__Asset_uid')).toBe(true);
    expect(isNonInheritable('exo__Asset_label')).toBe(true);
    expect(isNonInheritable('ems__Effort_status')).toBe(true);
  });

  it('isNonInheritable returns false for inheritable properties', () => {
    expect(isNonInheritable('ems__Effort_duration')).toBe(false);
    expect(isNonInheritable('exo__Instance_class')).toBe(false);
    expect(isNonInheritable('exo__Asset_prototype')).toBe(false);
  });

  it('materializer registry matches src/constants registry', () => {
    expect([...NON_INHERITABLE_PROPERTIES].sort()).toEqual([...REGISTRY].sort());
  });
});

describe('NENT-001: exo__Asset_uid is NOT inherited from prototype', () => {
  it('materializer does not propagate prototype uid to instance', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    const mockInstance = {
      filePath: '/mock/nent-instance.md',
      fileName: 'nent-instance',
      uid: 'user-instance-uid-001',
      frontmatter: {
        exo__Asset_uid: 'user-instance-uid-001',
        exo__Asset_label: 'User Task',
        exo__Asset_prototype: '[[cb6165c5-9546-4706-b541-1867ffae6959|GTD Task Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('user-instance-uid-001', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);

    // UID must remain the instance's own, NOT the prototype's
    expect(materialized.properties.exo__Asset_uid).toBe('user-instance-uid-001');
    expect(materialized.properties.exo__Asset_uid).not.toBe(
      'cb6165c5-9546-4706-b541-1867ffae6959',
    );
  });
});

describe('NENT-002: exo__Asset_label is NOT inherited from prototype', () => {
  it('materializer does not propagate prototype label to instance', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    const mockInstance = {
      filePath: '/mock/nent-label.md',
      fileName: 'nent-label',
      uid: 'user-instance-uid-002',
      frontmatter: {
        exo__Asset_uid: 'user-instance-uid-002',
        exo__Asset_label: 'My Custom Task',
        exo__Asset_prototype: '[[cb6165c5-9546-4706-b541-1867ffae6959|GTD Task Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('user-instance-uid-002', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);

    expect(materialized.properties.exo__Asset_label).toBe('My Custom Task');
    expect(materialized.properties.exo__Asset_label).not.toBe('GTD Task Prototype');
  });
});

describe('NENT-003: ems__Effort_status is NOT inherited from prototype', () => {
  it('materializer does not propagate prototype status to instance', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    // Create a mock prototype that has a status
    const mockPrototype = {
      filePath: '/mock/proto-with-status.md',
      fileName: 'proto-with-status',
      uid: 'mock-proto-with-status',
      frontmatter: {
        exo__Asset_uid: 'mock-proto-with-status',
        exo__Asset_label: 'Proto With Status',
        ems__Effort_status: '[[027e78f4|ems__EffortStatusDoing]]',
        ems__Effort_duration: 30,
      },
      body: '',
      wikilinks: [],
    };

    const mockInstance = {
      filePath: '/mock/nent-status.md',
      fileName: 'nent-status',
      uid: 'user-instance-uid-003',
      frontmatter: {
        exo__Asset_uid: 'user-instance-uid-003',
        exo__Asset_label: 'My Task',
        exo__Asset_prototype: '[[mock-proto-with-status|Proto With Status]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('mock-proto-with-status', mockPrototype);
    uidMap.set('user-instance-uid-003', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);

    // Status must NOT be inherited
    expect(materialized.properties.ems__Effort_status).toBeUndefined();
    // But duration SHOULD be inherited
    expect(materialized.properties.ems__Effort_duration).toBe(30);
  });
});

describe('NENT-004: GTD buttons absent without plugin', () => {
  it('empty file set has no GTD buttons', async () => {
    const files: Awaited<ReturnType<typeof parseAllPluginFiles>> = [];
    const buttons = files.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'GTD',
    );
    expect(buttons).toHaveLength(0);
  });

  it('non-gtd-jedi plugin has no GTD buttons', async () => {
    const fixtureRoot = resolve(import.meta.dirname, '../../fixtures/valid-plugin');
    const files = await parseAllPluginFiles(fixtureRoot);
    const buttons = files.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'GTD',
    );
    expect(buttons).toHaveLength(0);
  });
});

describe('Integration: non-inheritable properties in real plugin', () => {
  it('no prototype inherits uid from its parent in the chain', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    const prototypesWithParent = files.filter(
      (f) => f.frontmatter.exo__Asset_prototype,
    );

    for (const proto of prototypesWithParent) {
      const materialized = materializeAsset(proto, uidMap);
      // Own UID stays own
      expect(materialized.properties.exo__Asset_uid).toBe(proto.uid);
    }
  });

  it('all non-entailment test case files parse correctly', async () => {
    const cases = await loadConformanceTestCases(CASES_DIR, 'non-entailment');
    expect(cases.length).toBeGreaterThanOrEqual(4);
    for (const tc of cases) {
      expect(tc.testId).toBeTruthy();
      expect(tc.description).toBeTruthy();
      expect(tc.premises).toBeTruthy();
      expect(tc.expected).toBeTruthy();
      expect(tc.result).toBe(false);
    }
  });
});
