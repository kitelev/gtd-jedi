/**
 * BDD: Quick Capture creates InboxItem
 * Issue #5 — tests for "GTD: Quick Capture" command
 *
 * Feature: Quick Capture
 *   As a GTD practitioner using gtd-jedi
 *   I want the Quick Capture command to reliably create a properly classified InboxItem
 *   So that I can trust my capture workflow and process items correctly during weekly review
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockExocortexApi } from './helpers/mock-exocortex-api.js';
import { quickCapture } from './helpers/gtd-commands.js';

describe('Feature: Quick Capture', () => {
  let api: MockExocortexApi;

  // Background: gtd-jedi is loaded
  beforeEach(() => {
    api = new MockExocortexApi();
  });

  describe('Scenario: Capture creates InboxItem with correct classes', () => {
    it('Given gtd-jedi is loaded, When "GTD: Quick Capture" with label "Buy milk", Then new asset with classes [ems__Task, gtd__InboxItem] and status Backlog', () => {
      // When
      const asset = quickCapture(api, 'Buy milk');

      // Then
      expect(asset.classes).toContain('ems__Task');
      expect(asset.classes).toContain('gtd__InboxItem');
      expect(asset.status).toBe('ems__EffortStatusBacklog');
    });
  });

  describe('Scenario: Captured item has user-provided label', () => {
    it('Given gtd-jedi is loaded, When "GTD: Quick Capture" with label "Call dentist", Then asset label is "Call dentist"', () => {
      // When
      const asset = quickCapture(api, 'Call dentist');

      // Then
      expect(asset.label).toBe('Call dentist');
    });
  });

  describe('Scenario: Multiple captures create separate InboxItems', () => {
    it('Given gtd-jedi is loaded, When capturing "Task A" and "Task B", Then 2 InboxItems exist and both have status Backlog', () => {
      // When
      quickCapture(api, 'Task A');
      quickCapture(api, 'Task B');

      // Then
      const inboxItems = api.queryByClass('gtd__InboxItem');
      expect(inboxItems).toHaveLength(2);
      expect(inboxItems.every(item => item.status === 'ems__EffortStatusBacklog')).toBe(true);
    });
  });

  describe('Scenario: Captured item uses correct prototype', () => {
    it('Given gtd-jedi is loaded, When "GTD: Quick Capture" with label "Read book", Then prototype is gtd-jedi:gtd__TaskPrototype', () => {
      // When
      const asset = quickCapture(api, 'Read book');

      // Then
      expect(asset.prototype).toBe('gtd-jedi:gtd__TaskPrototype');
    });
  });
});
