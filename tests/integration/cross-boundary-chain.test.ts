/**
 * Integration Test: Cross-Boundary Prototype Chain (Depth-3)
 *
 * Tests that a depth-3 prototype chain correctly materializes
 * inherited properties from all levels with depth annotations.
 *
 * Chain structure:
 *   user-instance → user-proto → gtd:TaskProto → ems:TaskProto
 *      (depth 0)     (depth 1)     (depth 2)       (depth 3)
 *
 * Each level defines unique inheritable properties:
 *   ems:TaskProto:  ems__Effort_estimatedDuration = 30
 *   gtd:TaskProto:  gtd__defaultButton = "gtd:ProcessInboxButton"
 *   user-proto:     app__customTag = "focused"
 *   user-instance:  ems__Effort_status = "doing" (own, NonInheritable)
 *
 * All 3 prototypes have uid, label, description (NonInheritable) —
 * these must NOT be inherited at any level.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { parseAllPluginFiles } from '../conformance/structural/parser.js';
import {
  buildUidMap,
  materializeWithDepth,
  NON_INHERITABLE_PROPERTIES,
  type DepthAnnotatedAsset,
} from '../helpers/materializer.js';
import type { ParsedFile } from '../conformance/structural/parser.js';

const FIXTURE_DIR = resolve(import.meta.dirname, '../fixtures/depth-3-chain');

describe('Cross-Boundary Depth-3 Chain', () => {
  let files: ParsedFile[];
  let uidMap: Map<string, ParsedFile>;
  let materialized: DepthAnnotatedAsset;

  beforeAll(async () => {
    files = await parseAllPluginFiles(FIXTURE_DIR);
    uidMap = buildUidMap(files);

    // Find the user instance (the leaf of the chain)
    const userInstance = files.find(
      (f) => f.uid === 'aaaa0004-0004-0004-0004-000000000004',
    );
    expect(userInstance).toBeDefined();
    materialized = materializeWithDepth(userInstance!, uidMap);
  });

  it('materializes ems-level property (estimatedDuration) at depth 3', () => {
    const triple = materialized.inheritedTriples.find(
      (t) => t.predicate === 'ems__Effort_estimatedDuration',
    );
    expect(triple).toBeDefined();
    expect(triple!.value).toBe(30);
    expect(triple!.sourceDepth).toBe(3);
  });

  it('materializes gtd-level property (defaultButton) at depth 2', () => {
    const triple = materialized.inheritedTriples.find(
      (t) => t.predicate === 'gtd__defaultButton',
    );
    expect(triple).toBeDefined();
    expect(triple!.value).toBe('gtd:ProcessInboxButton');
    expect(triple!.sourceDepth).toBe(2);
  });

  it('materializes user-proto-level property (customTag) at depth 1', () => {
    const triple = materialized.inheritedTriples.find(
      (t) => t.predicate === 'app__customTag',
    );
    expect(triple).toBeDefined();
    expect(triple!.value).toBe('focused');
    expect(triple!.sourceDepth).toBe(1);
  });

  it('does not inherit NonInheritable uid from any level', () => {
    const uidTriples = materialized.inheritedTriples.filter(
      (t) => t.predicate === 'exo__Asset_uid',
    );
    expect(uidTriples).toHaveLength(0);
  });

  it('does not inherit NonInheritable label from any level', () => {
    const labelTriples = materialized.inheritedTriples.filter(
      (t) => t.predicate === 'exo__Asset_label',
    );
    expect(labelTriples).toHaveLength(0);
  });

  it('does not inherit any NonInheritable property from any level', () => {
    for (const prop of NON_INHERITABLE_PROPERTIES) {
      const leaked = materialized.inheritedTriples.filter(
        (t) => t.predicate === prop,
      );
      expect(
        leaked,
        `NonInheritable property "${prop}" was inherited`,
      ).toHaveLength(0);
    }
  });

  it('has all 3 inherited properties accessible via allProperties', () => {
    expect(materialized.allProperties['ems__Effort_estimatedDuration']).toBe(30);
    expect(materialized.allProperties['gtd__defaultButton']).toBe('gtd:ProcessInboxButton');
    expect(materialized.allProperties['app__customTag']).toBe('focused');
  });

  it('preserves the complete prototype chain', () => {
    // Chain: user-proto -> gtd:TaskProto -> ems:TaskProto
    expect(materialized.prototypeChain).toHaveLength(3);
    expect(materialized.prototypeChain[0]).toBe('aaaa0003-0003-0003-0003-000000000003');
    expect(materialized.prototypeChain[1]).toBe('aaaa0002-0002-0002-0002-000000000002');
    expect(materialized.prototypeChain[2]).toBe('aaaa0001-0001-0001-0001-000000000001');
  });
});
