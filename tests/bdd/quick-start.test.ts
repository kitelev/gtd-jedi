/**
 * BDD: Quick Start for new user
 * Issue #9 — tests for "GTD: Quick Start" command
 *
 * Feature: Quick Start
 *   As a new Exocortex user installing gtd-jedi
 *   I want Quick Start to instantly create a working GTD scaffold
 *   So that I can start using the system without manual setup
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockExocortexApi } from './helpers/mock-exocortex-api.js';
import { quickStart } from './helpers/gtd-commands.js';
import { formatDate, nextSaturday } from './helpers/date-utils.js';
import type { Asset } from './helpers/mock-exocortex-api.js';

describe('Feature: Quick Start', () => {
  let api: MockExocortexApi;
  let createdAssets: Asset[];

  describe('Scenario: Creates 3 default areas', () => {
    beforeEach(() => {
      // Given: empty vault with gtd-jedi loaded
      api = new MockExocortexApi();
      expect(api.size).toBe(0);

      // When
      createdAssets = quickStart(api);
    });

    it('Given empty vault with gtd-jedi loaded, When "GTD: Quick Start", Then 3 areas created with labels "Work, Family, Hobby"', () => {
      // Then
      const areas = api.queryByClass('ems__Area');
      expect(areas).toHaveLength(3);
      expect(areas.map(a => a.label).sort()).toEqual(['Family', 'Hobby', 'Work']);
    });
  });

  describe('Scenario: Creates 1 inbox item', () => {
    beforeEach(() => {
      // Given: empty vault
      api = new MockExocortexApi();
      expect(api.size).toBe(0);

      // When
      createdAssets = quickStart(api);
    });

    it('Given empty vault with gtd-jedi loaded, When "GTD: Quick Start", Then 1 inbox item exists with status Backlog', () => {
      // Then
      const inboxItems = api.queryByClass('gtd__InboxItem');
      expect(inboxItems).toHaveLength(1);
      expect(inboxItems[0].label).toBe('Process all my inboxes');
      expect(inboxItems[0].status).toBe('ems__EffortStatusBacklog');
    });
  });

  describe('Scenario: Creates weekly review scheduled for next Saturday', () => {
    it('Given empty vault and today is "2026-04-06", When "GTD: Quick Start", Then 1 weekly review scheduled for "2026-04-11"', () => {
      // Given
      api = new MockExocortexApi();
      expect(api.size).toBe(0);
      const today = new Date('2026-04-06');

      // When
      createdAssets = quickStart(api, today);

      // Then
      const reviews = api.getAllAssets().filter(
        a => a.prototype === 'gtd-jedi:gtd__WeeklyReviewPrototype',
      );
      expect(reviews).toHaveLength(1);
      expect(reviews[0].properties.ems__Effort_scheduledDate).toBe('2026-04-11');
    });
  });

  describe('Scenario: All created assets use gtd-jedi prototypes', () => {
    beforeEach(() => {
      // Given: empty vault
      api = new MockExocortexApi();
      expect(api.size).toBe(0);

      // When
      createdAssets = quickStart(api);
    });

    it('Given empty vault with gtd-jedi loaded, When "GTD: Quick Start", Then all created assets have prototype from "gtd-jedi:" namespace', () => {
      // Then
      for (const asset of createdAssets) {
        expect(asset.prototype).toBeDefined();
        expect(asset.prototype!.startsWith('gtd-jedi:')).toBe(true);
      }
    });
  });

  describe('Scenario: Total asset count is correct', () => {
    it('Given empty vault, When "GTD: Quick Start", Then exactly 5 assets created (3 areas + 1 inbox + 1 review)', () => {
      // Given
      api = new MockExocortexApi();

      // When
      createdAssets = quickStart(api);

      // Then
      expect(api.size).toBe(5);
      expect(createdAssets).toHaveLength(5);
    });
  });

  describe('Scenario: Vault is truly empty before Quick Start', () => {
    it('Given empty vault, the store has 0 assets before Quick Start runs', () => {
      // Given
      api = new MockExocortexApi();

      // Then — verify empty before anything runs
      expect(api.size).toBe(0);
      expect(api.getAllAssets()).toHaveLength(0);
    });
  });
});
