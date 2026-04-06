/**
 * Integration Test: Plugin Removal Graceful Degradation
 *
 * Verifies that removing the gtd-jedi plugin causes graceful degradation:
 * - User instance data (labels, statuses, timestamps) persists intact
 * - GTD-specific inherited properties disappear (buttons, defaultButton)
 * - Plugin-namespace properties return 0 results
 *
 * Reuses vault-v1.0 fixture from Issue #12:
 *   vault-v1.0/
 *     plugin/prototypes/gtd-task-proto.md   (will be "removed")
 *     user-data/instance-0001..0010.md      (will survive)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { loadVaultFixture, type VaultState } from '../helpers/vault-upgrade.js';
import { simulatePluginRemoval, hasNamespaceProperty, type PostRemovalState } from '../helpers/plugin-remover.js';

const FIXTURES = resolve(import.meta.dirname, '../fixtures');
const V10_PATH = resolve(FIXTURES, 'vault-v1.0');

describe('Plugin Removal Graceful Degradation', () => {
  let beforeRemoval: VaultState;
  let afterRemoval: PostRemovalState;

  beforeAll(async () => {
    beforeRemoval = await loadVaultFixture(V10_PATH);
    afterRemoval = await simulatePluginRemoval(V10_PATH);
  });

  it('user instances still exist after removal', () => {
    expect(beforeRemoval.userInstances).toHaveLength(10);
    expect(afterRemoval.remainingFiles).toHaveLength(10);

    const beforeUids = beforeRemoval.userInstances.map((u) => u.uid).sort();
    const afterUids = afterRemoval.remainingFiles
      .map((f) => f.uid ?? f.fileName)
      .sort();
    expect(afterUids).toEqual(beforeUids);
  });

  it('user labels, statuses, and timestamps are intact after removal', () => {
    for (const beforeUser of beforeRemoval.userInstances) {
      const afterFile = afterRemoval.remainingFiles.find(
        (f) => f.uid === beforeUser.uid,
      );
      expect(afterFile, `Missing user instance ${beforeUser.uid}`).toBeDefined();

      // Labels preserved (own property, not inherited)
      expect(afterFile!.frontmatter.exo__Asset_label).toBe(beforeUser.label);
      // Statuses preserved (NonInheritable)
      expect(afterFile!.frontmatter.ems__Effort_status).toBe(beforeUser.status);
      // Timestamps preserved (own property)
      expect(afterFile!.frontmatter.ems__Effort_startTimestamp).toBe(beforeUser.startTimestamp);
    }
  });

  it('GTD buttons are no longer visible after removal', () => {
    // Before removal: instances inherit gtd__defaultButton from plugin prototype
    const hadButton = hasNamespaceProperty(
      beforeRemoval.materializedUsers,
      'gtd__',
    );
    expect(hadButton, 'Before removal, gtd__ properties should exist').toBe(true);

    // After removal: plugin prototype is gone, so gtd__defaultButton is not inherited
    const hasButton = hasNamespaceProperty(
      afterRemoval.materializedUsers,
      'gtd__',
    );
    expect(hasButton, 'After removal, no gtd__ properties should be inherited').toBe(false);
  });

  it('gtd: namespace properties return 0 results after removal', () => {
    // Count all properties starting with "gtd__" across all materialized assets
    let gtdPropertyCount = 0;
    for (const asset of afterRemoval.materializedUsers) {
      for (const key of Object.keys(asset.properties)) {
        if (key.startsWith('gtd__')) {
          gtdPropertyCount++;
        }
      }
    }
    expect(gtdPropertyCount).toBe(0);
  });

  it('plugin files are identified as removed', () => {
    expect(afterRemoval.removedFiles.length).toBeGreaterThan(0);
    // All removed files should be from the plugin/ directory
    for (const file of afterRemoval.removedFiles) {
      expect(file.filePath).toContain('/plugin/');
    }
  });

  it('ems-namespace properties set by user are preserved', () => {
    // ems__Effort_status is set directly on user instances — should survive removal
    for (const asset of afterRemoval.materializedUsers) {
      expect(asset.properties['ems__Effort_status']).toBeDefined();
      expect(asset.properties['ems__Effort_startTimestamp']).toBeDefined();
    }
  });
});
