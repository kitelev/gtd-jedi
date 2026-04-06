import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseAllPluginFiles } from '../structural/parser.js';
import { loadConformanceTestCases } from '../../helpers/conformance-parser.js';
import {
  buildUidMap,
  materializeAsset,
  extractClasses,
} from '../../helpers/materializer.js';
import {
  checkDualPluginConsistency,
  checkInternalConsistency,
  checkMultiClassConsistency,
} from '../../helpers/consistency-checker.js';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../../..');
const CASES_DIR = resolve(import.meta.dirname, 'cases');
const FIXTURES = resolve(import.meta.dirname, '../../fixtures');

describe('Consistency conformance test case parsing', () => {
  it('loads all consistency test cases from cases/ directory', async () => {
    const cases = await loadConformanceTestCases(CASES_DIR, 'consistency');
    expect(cases.length).toBeGreaterThanOrEqual(3);
    for (const tc of cases) {
      expect(tc.testType).toBe('consistency');
      expect(tc.testId).toMatch(/^CON-\d{3}$/);
      expect(tc.description).toBeTruthy();
    }
  });
});

describe('CON-001: Dual plugin button groups coexist', () => {
  it('gtd-jedi has GTD button group', async () => {
    const gtdFiles = await parseAllPluginFiles(PLUGIN_ROOT);
    const gtdButtons = gtdFiles.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'GTD',
    );
    expect(gtdButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('mock-okr has OKR button group', async () => {
    const okrFiles = await parseAllPluginFiles(resolve(FIXTURES, 'mock-okr-plugin'));
    const okrButtons = okrFiles.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'OKR',
    );
    expect(okrButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('no UID collisions between gtd-jedi and mock-okr', async () => {
    const gtdFiles = await parseAllPluginFiles(PLUGIN_ROOT);
    const okrFiles = await parseAllPluginFiles(resolve(FIXTURES, 'mock-okr-plugin'));

    const report = checkDualPluginConsistency(gtdFiles, okrFiles);
    const uidCollisions = report.inconsistencies.filter(
      (i) => i.type === 'uid-collision',
    );
    expect(uidCollisions).toHaveLength(0);
  });

  it('no button group collisions between GTD and OKR', async () => {
    const gtdFiles = await parseAllPluginFiles(PLUGIN_ROOT);
    const okrFiles = await parseAllPluginFiles(resolve(FIXTURES, 'mock-okr-plugin'));

    const report = checkDualPluginConsistency(gtdFiles, okrFiles);
    const buttonCollisions = report.inconsistencies.filter(
      (i) => i.type === 'button-group-collision',
    );
    expect(buttonCollisions).toHaveLength(0);
  });

  it('dual plugin consistency check passes', async () => {
    const gtdFiles = await parseAllPluginFiles(PLUGIN_ROOT);
    const okrFiles = await parseAllPluginFiles(resolve(FIXTURES, 'mock-okr-plugin'));

    const report = checkDualPluginConsistency(gtdFiles, okrFiles);
    expect(report.consistent).toBe(true);
  });

  it('both button groups exist independently in merged file set', async () => {
    const gtdFiles = await parseAllPluginFiles(PLUGIN_ROOT);
    const okrFiles = await parseAllPluginFiles(resolve(FIXTURES, 'mock-okr-plugin'));
    const allFiles = [...gtdFiles, ...okrFiles];

    const gtdButtons = allFiles.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'GTD',
    );
    const okrButtons = allFiles.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'OKR',
    );

    expect(gtdButtons.length).toBeGreaterThanOrEqual(5);
    expect(okrButtons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('CON-002: User override is consistent', () => {
  it('user value overrides inherited value (no contradiction)', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    // Instance inherits duration=60 from WeeklyReview, but user sets 90
    const mockInstance = {
      filePath: '/mock/user-override.md',
      fileName: 'user-override',
      uid: 'mock-override-uid',
      frontmatter: {
        exo__Asset_uid: 'mock-override-uid',
        exo__Asset_label: 'My Custom Review',
        exo__Asset_prototype: '[[52f7977a-7686-423b-81ea-c4c15868515d|GTD Weekly Review Prototype]]',
        ems__Effort_duration: 90, // user override
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('mock-override-uid', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);

    // User value wins
    expect(materialized.properties.ems__Effort_duration).toBe(90);
    // No contradiction — single value
    expect(typeof materialized.properties.ems__Effort_duration).toBe('number');
  });

  it('inherited value is used when user does not override', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    // Instance does NOT set duration — inherits 60 from WeeklyReview
    const mockInstance = {
      filePath: '/mock/no-override.md',
      fileName: 'no-override',
      uid: 'mock-no-override-uid',
      frontmatter: {
        exo__Asset_uid: 'mock-no-override-uid',
        exo__Asset_label: 'Standard Review',
        exo__Asset_prototype: '[[52f7977a-7686-423b-81ea-c4c15868515d|GTD Weekly Review Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('mock-no-override-uid', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);

    // Inherited value
    expect(materialized.properties.ems__Effort_duration).toBe(60);
  });
});

describe('CON-003: Multiple workflow-classes are consistent', () => {
  it('gtd-jedi defines NextAction, HighEnergy, AtComputer as valid classes', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const workflowClasses = files.filter((f) =>
      f.filePath.includes('/workflow-classes/'),
    );

    const aliases = new Set<string>();
    for (const cls of workflowClasses) {
      const fileAliases = cls.frontmatter.aliases;
      if (Array.isArray(fileAliases)) {
        for (const alias of fileAliases) aliases.add(String(alias));
      }
    }

    expect(aliases.has('gtd__NextAction')).toBe(true);
    expect(aliases.has('gtd__HighEnergy')).toBe(true);
    expect(aliases.has('gtd__AtComputer')).toBe(true);
  });

  it('instance can carry NextAction + HighEnergy + AtComputer simultaneously', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const workflowClasses = files.filter((f) =>
      f.filePath.includes('/workflow-classes/'),
    );

    const targetClasses = ['gtd__NextAction', 'gtd__HighEnergy', 'gtd__AtComputer'];
    const result = checkMultiClassConsistency(targetClasses, workflowClasses);

    expect(result.consistent).toBe(true);
    expect(result.missingClasses).toHaveLength(0);
  });

  it('all three classes are present after materialization with mock instance', () => {
    const mockInstance = {
      filePath: '/mock/multi-class.md',
      fileName: 'multi-class',
      uid: 'mock-multi-uid',
      frontmatter: {
        exo__Asset_uid: 'mock-multi-uid',
        exo__Asset_label: 'Multi-Class Task',
        exo__Instance_class: [
          '[[e30bce5f-e387-44b5-83f7-2015c20e718e|gtd__NextAction]]',
          '[[039594fb-84dc-43f2-95c2-d9190a8da70d|gtd__HighEnergy]]',
          '[[0705d3ca-2e0f-4f0e-9d84-7a4595279150|gtd__AtComputer]]',
        ],
      },
      body: '',
      wikilinks: [],
    };

    const classes = extractClasses(mockInstance.frontmatter);
    expect(classes).toHaveLength(3);

    const hasNextAction = classes.some((c) => c.includes('gtd__NextAction'));
    const hasHighEnergy = classes.some((c) => c.includes('gtd__HighEnergy'));
    const hasAtComputer = classes.some((c) => c.includes('gtd__AtComputer'));

    expect(hasNextAction).toBe(true);
    expect(hasHighEnergy).toBe(true);
    expect(hasAtComputer).toBe(true);
  });
});

describe('Integration: gtd-jedi internal consistency', () => {
  it('no internal UID collisions in gtd-jedi', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const report = checkInternalConsistency(files);

    const uidCollisions = report.inconsistencies.filter(
      (i) => i.type === 'uid-collision',
    );
    expect(uidCollisions).toHaveLength(0);
  });

  it('no functional property violations in gtd-jedi', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const report = checkInternalConsistency(files);

    const violations = report.inconsistencies.filter(
      (i) => i.type === 'functional-property-violation',
    );
    expect(violations).toHaveLength(0);
  });

  it('gtd-jedi is internally consistent', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const report = checkInternalConsistency(files);
    expect(report.consistent).toBe(true);
  });

  it('all consistency test case files parse correctly', async () => {
    const cases = await loadConformanceTestCases(CASES_DIR, 'consistency');
    expect(cases.length).toBeGreaterThanOrEqual(3);
    for (const tc of cases) {
      expect(tc.testId).toBeTruthy();
      expect(tc.description).toBeTruthy();
      expect(tc.premises).toBeTruthy();
      expect(tc.expected).toBeTruthy();
    }
  });
});
