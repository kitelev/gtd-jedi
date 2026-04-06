/**
 * Integration Test: Plugin Update Preserves User Data
 *
 * Verifies that upgrading gtd-jedi from v1.0 to v1.1 preserves all user data:
 * - All 10 user instances survive (same UIDs)
 * - User-set statuses remain unchanged
 * - User-set timestamps remain unchanged
 * - New button added in v1.1 becomes visible on existing instances via inheritance
 *
 * Fixture structure:
 *   vault-v1.0/
 *     plugin/prototypes/gtd-task-proto.md  (without gtd__newFeatureButton)
 *     user-data/instance-0001..0010.md     (10 user tasks)
 *   vault-v1.1/
 *     plugin/prototypes/gtd-task-proto.md  (with gtd__newFeatureButton)
 *     user-data/instance-0001..0010.md     (identical copies)
 *
 * User instance UIDs (10 total):
 *   u10001000-..., u10002000-..., ..., u10010000-...
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { simulateUpgrade, type VaultState } from '../helpers/vault-upgrade.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');
const V10_PATH = resolve(FIXTURES, 'vault-v1.0');
const V11_PATH = resolve(FIXTURES, 'vault-v1.1');

describe('Plugin Update Preserves User Data', () => {
  let before: VaultState;
  let after: VaultState;

  beforeAll(async () => {
    const result = await simulateUpgrade(V10_PATH, V11_PATH);
    before = result.before;
    after = result.after;
  });

  it('all 10 user instances survive the update', () => {
    expect(before.userInstances).toHaveLength(10);
    expect(after.userInstances).toHaveLength(10);

    const beforeUids = before.userInstances.map((u) => u.uid).sort();
    const afterUids = after.userInstances.map((u) => u.uid).sort();
    expect(afterUids).toEqual(beforeUids);
  });

  it('user statuses are unchanged after update', () => {
    for (const beforeUser of before.userInstances) {
      const afterUser = after.userInstances.find((u) => u.uid === beforeUser.uid);
      expect(afterUser).toBeDefined();
      expect(
        afterUser!.status,
        `Status changed for ${beforeUser.uid}: "${beforeUser.status}" -> "${afterUser!.status}"`,
      ).toBe(beforeUser.status);
    }
  });

  it('user timestamps are unchanged after update', () => {
    for (const beforeUser of before.userInstances) {
      const afterUser = after.userInstances.find((u) => u.uid === beforeUser.uid);
      expect(afterUser).toBeDefined();
      expect(
        afterUser!.startTimestamp,
        `Timestamp changed for ${beforeUser.uid}`,
      ).toBe(beforeUser.startTimestamp);
    }
  });

  it('user labels are unchanged after update', () => {
    for (const beforeUser of before.userInstances) {
      const afterUser = after.userInstances.find((u) => u.uid === beforeUser.uid);
      expect(afterUser).toBeDefined();
      expect(
        afterUser!.label,
        `Label changed for ${beforeUser.uid}`,
      ).toBe(beforeUser.label);
    }
  });

  it('new button from v1.1 is visible on all instances via inheritance', () => {
    // In v1.0, instances should NOT have gtd__newFeatureButton
    for (const materialized of before.materializedUsers) {
      expect(
        materialized.properties['gtd__newFeatureButton'],
        'v1.0 should not have newFeatureButton',
      ).toBeUndefined();
    }

    // In v1.1, instances SHOULD inherit gtd__newFeatureButton from prototype
    for (const materialized of after.materializedUsers) {
      expect(
        materialized.properties['gtd__newFeatureButton'],
        `Instance ${materialized.source.uid} missing inherited newFeatureButton`,
      ).toBe('gtd:NewFeatureButton');
    }
  });

  it('v1.0 inheritable properties are preserved in v1.1', () => {
    // Both v1.0 and v1.1 should inherit gtd__defaultButton and ems__Effort_estimatedDuration
    for (const materialized of after.materializedUsers) {
      expect(materialized.properties['gtd__defaultButton']).toBe('gtd:ProcessInboxButton');
      expect(materialized.properties['ems__Effort_estimatedDuration']).toBe(25);
    }
  });
});
