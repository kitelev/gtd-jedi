import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseAllPluginFiles } from '../structural/parser.js';
import { loadConformanceTestCases } from '../../helpers/conformance-parser.js';
import {
  buildUidMap,
  materializeAsset,
  resolvePrototypeChain,
  extractClasses,
  extractUidFromWikilink,
  materializeAll,
  NON_INHERITABLE_PROPERTIES,
} from '../../helpers/materializer.js';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../../..');
const CASES_DIR = resolve(import.meta.dirname, 'cases');

describe('Entailment conformance test case parsing', () => {
  it('loads all entailment test cases from cases/ directory', async () => {
    const cases = await loadConformanceTestCases(CASES_DIR, 'entailment');
    expect(cases.length).toBeGreaterThanOrEqual(6);
    for (const tc of cases) {
      expect(tc.testType).toBe('entailment');
      expect(tc.testId).toMatch(/^ENT-\d{3}$/);
      expect(tc.description).toBeTruthy();
      expect(tc.result).toBe(true);
    }
  });
});

describe('Materializer helpers', () => {
  it('extractUidFromWikilink parses [[uuid|label]]', () => {
    expect(extractUidFromWikilink('[[cb6165c5-9546-4706-b541-1867ffae6959|GTD Task Prototype]]'))
      .toBe('cb6165c5-9546-4706-b541-1867ffae6959');
  });

  it('extractUidFromWikilink parses [[short-uuid|label]]', () => {
    expect(extractUidFromWikilink('[[df7e579d|ems__TaskPrototype]]'))
      .toBe('df7e579d');
  });

  it('extractClasses handles array', () => {
    const fm = { exo__Instance_class: ['[[a|A]]', '[[b|B]]'] };
    expect(extractClasses(fm)).toEqual(['[[a|A]]', '[[b|B]]']);
  });

  it('extractClasses handles single string', () => {
    const fm = { exo__Instance_class: '[[a|A]]' };
    expect(extractClasses(fm)).toEqual(['[[a|A]]']);
  });

  it('extractClasses returns empty for missing', () => {
    expect(extractClasses({})).toEqual([]);
  });
});

describe('ENT-001: GTD buttons exist for TaskPrototype inheritors', () => {
  it('plugin defines buttons with GTD button group', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    // Support both legacy (exo-ui__Button) and RFC-009 (exocmd__Command + exocmd__CommandBinding) formats
    const legacyButtons = files.filter((f) => {
      const classes = f.frontmatter.exo__Instance_class;
      if (Array.isArray(classes)) {
        return classes.some((c: string) => c.includes('exo-ui__Button'));
      }
      return false;
    });

    const rfc009Bindings = files.filter((f) => {
      const classes = f.frontmatter.exo__Instance_class;
      if (Array.isArray(classes)) {
        return classes.some((c: string) => c.includes('exocmd__CommandBinding'));
      }
      return false;
    });

    const totalButtons = legacyButtons.length + rfc009Bindings.length;
    expect(totalButtons).toBeGreaterThanOrEqual(5);

    const gtdLegacy = legacyButtons.filter(
      (b) => b.frontmatter['exo-ui__Button_group'] === 'GTD',
    );
    const gtdRfc009 = rfc009Bindings.filter(
      (b) => b.frontmatter['exocmd__CommandBinding_group'] === 'gtd',
    );
    expect(gtdLegacy.length + gtdRfc009.length).toBeGreaterThanOrEqual(5);
  });

  it('all GTD buttons are defined by gtd-jedi namespace', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const buttons = files.filter(
      (f) => f.frontmatter['exo-ui__Button_group'] === 'GTD'
        || f.frontmatter['exocmd__CommandBinding_group'] === 'gtd',
    );

    for (const button of buttons) {
      const definedBy = String(button.frontmatter.exo__Asset_isDefinedBy ?? '');
      expect(definedBy).toContain('!gtd-jedi');
    }
  });
});

describe('ENT-002: WeeklyReviewPrototype defines duration = 60', () => {
  it('WeeklyReviewPrototype has ems__Effort_duration = 60', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const weeklyReview = files.find(
      (f) => f.uid === '52f7977a-7686-423b-81ea-c4c15868515d',
    );
    expect(weeklyReview).toBeDefined();
    expect(weeklyReview!.frontmatter.ems__Effort_duration).toBe(60);
  });

  it('instance inheriting from WeeklyReviewPrototype gets duration = 60 via materializer', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    // Simulate an instance that inherits from WeeklyReviewPrototype
    const mockInstance = {
      filePath: '/mock/instance.md',
      fileName: 'instance',
      uid: 'mock-instance-uid',
      frontmatter: {
        exo__Asset_uid: 'mock-instance-uid',
        exo__Asset_label: 'My Weekly Review',
        exo__Asset_prototype: '[[52f7977a-7686-423b-81ea-c4c15868515d|GTD Weekly Review Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    // Add mock to uidMap so it can be resolved
    uidMap.set('mock-instance-uid', mockInstance);

    const materialized = materializeAsset(mockInstance, uidMap);
    expect(materialized.properties.ems__Effort_duration).toBe(60);
  });
});

describe('ENT-003: WeeklyReviewPrototype carries class gtd__Review', () => {
  it('WeeklyReviewPrototype has exo__Instance_class including gtd__Review', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const weeklyReview = files.find(
      (f) => f.uid === '52f7977a-7686-423b-81ea-c4c15868515d',
    );
    expect(weeklyReview).toBeDefined();

    const classes = extractClasses(weeklyReview!.frontmatter);
    const hasReview = classes.some((c) => c.includes('gtd__Review'));
    expect(hasReview).toBe(true);
  });

  it('instance inheriting from WeeklyReviewPrototype accumulates gtd__Review class', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    const mockInstance = {
      filePath: '/mock/instance.md',
      fileName: 'instance',
      uid: 'mock-instance-uid-2',
      frontmatter: {
        exo__Asset_uid: 'mock-instance-uid-2',
        exo__Asset_label: 'My Weekly Review',
        exo__Asset_prototype: '[[52f7977a-7686-423b-81ea-c4c15868515d|GTD Weekly Review Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('mock-instance-uid-2', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);

    const hasReview = materialized.classes.some((c) => c.includes('gtd__Review'));
    expect(hasReview).toBe(true);
  });
});

describe('ENT-004: DailyReviewPrototype defines duration = 15', () => {
  it('DailyReviewPrototype has ems__Effort_duration = 15', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const dailyReview = files.find(
      (f) => f.uid === '096e9f41-12bf-462f-856d-13ec67419728',
    );
    expect(dailyReview).toBeDefined();
    expect(dailyReview!.frontmatter.ems__Effort_duration).toBe(15);
  });

  it('instance inheriting from DailyReviewPrototype gets duration = 15', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    const mockInstance = {
      filePath: '/mock/daily.md',
      fileName: 'daily',
      uid: 'mock-daily-uid',
      frontmatter: {
        exo__Asset_uid: 'mock-daily-uid',
        exo__Asset_label: 'My Daily Review',
        exo__Asset_prototype: '[[096e9f41-12bf-462f-856d-13ec67419728|GTD Daily Review Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('mock-daily-uid', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);
    expect(materialized.properties.ems__Effort_duration).toBe(15);
  });
});

describe('ENT-005: Prototype chain is transitive', () => {
  it('WeeklyReviewPrototype chain includes TaskPrototype', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);
    const weeklyReview = files.find(
      (f) => f.uid === '52f7977a-7686-423b-81ea-c4c15868515d',
    );
    expect(weeklyReview).toBeDefined();

    const chain = resolvePrototypeChain(weeklyReview!, uidMap);
    expect(chain).toContain('cb6165c5-9546-4706-b541-1867ffae6959');
  });

  it('TaskPrototype chain includes ems__TaskPrototype (df7e579d)', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);
    const taskProto = files.find(
      (f) => f.uid === 'cb6165c5-9546-4706-b541-1867ffae6959',
    );
    expect(taskProto).toBeDefined();

    const chain = resolvePrototypeChain(taskProto!, uidMap);
    expect(chain).toContain('df7e579d');
  });

  it('WeeklyReviewPrototype full chain is WeeklyReview → Task → ems__TaskPrototype', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);
    const weeklyReview = files.find(
      (f) => f.uid === '52f7977a-7686-423b-81ea-c4c15868515d',
    );
    expect(weeklyReview).toBeDefined();

    const chain = resolvePrototypeChain(weeklyReview!, uidMap);
    expect(chain[0]).toBe('cb6165c5-9546-4706-b541-1867ffae6959'); // TaskPrototype
    expect(chain[1]).toBe('df7e579d'); // ems__TaskPrototype
  });
});

describe('ENT-006: InboxProcessingPrototype defines duration = 20', () => {
  it('InboxProcessingPrototype has ems__Effort_duration = 20', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const inboxProto = files.find(
      (f) => f.uid === '130f09ec-bea9-4014-94e3-5e45f39dce22',
    );
    expect(inboxProto).toBeDefined();
    expect(inboxProto!.frontmatter.ems__Effort_duration).toBe(20);
  });

  it('instance inheriting from InboxProcessingPrototype gets duration = 20', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const uidMap = buildUidMap(files);

    const mockInstance = {
      filePath: '/mock/inbox.md',
      fileName: 'inbox',
      uid: 'mock-inbox-uid',
      frontmatter: {
        exo__Asset_uid: 'mock-inbox-uid',
        exo__Asset_label: 'My Inbox Processing',
        exo__Asset_prototype: '[[130f09ec-bea9-4014-94e3-5e45f39dce22|GTD Inbox Processing Prototype]]',
      },
      body: '',
      wikilinks: [],
    };

    uidMap.set('mock-inbox-uid', mockInstance);
    const materialized = materializeAsset(mockInstance, uidMap);
    expect(materialized.properties.ems__Effort_duration).toBe(20);
  });
});

describe('Integration: all entailment test cases', () => {
  it('all entailment test case files parse correctly', async () => {
    const cases = await loadConformanceTestCases(CASES_DIR, 'entailment');
    expect(cases.length).toBeGreaterThanOrEqual(6);
    for (const tc of cases) {
      expect(tc.testId).toBeTruthy();
      expect(tc.description).toBeTruthy();
      expect(tc.premises).toBeTruthy();
      expect(tc.expected).toBeTruthy();
      expect(tc.result).toBe(true);
    }
  });

  it('materializeAll runs on real plugin without errors', async () => {
    const files = await parseAllPluginFiles(PLUGIN_ROOT);
    const materialized = materializeAll(files);
    expect(materialized.length).toBe(files.length);

    // Every prototype-bearing file should have a non-empty chain
    const withPrototype = materialized.filter(
      (m) => m.source.frontmatter.exo__Asset_prototype,
    );
    for (const m of withPrototype) {
      expect(m.prototypeChain.length).toBeGreaterThan(0);
    }
  });
});
