/**
 * BDD: Process Inbox — state transitions via buttons
 * Issue #6 — tests for all state transitions from InboxItem
 *
 * Feature: Process Inbox
 *   As a GTD practitioner processing my inbox
 *   I want each button to reliably change the item's class and status
 *   So that my GTD system accurately reflects the decisions I made during processing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockExocortexApi } from './helpers/mock-exocortex-api.js';
import { quickCapture } from './helpers/gtd-commands.js';
import type { Asset } from './helpers/mock-exocortex-api.js';

describe('Feature: Process Inbox', () => {
  let api: MockExocortexApi;
  let inboxItem: Asset;

  // Background: gtd-jedi is loaded AND an InboxItem exists with label "Buy milk"
  beforeEach(() => {
    api = new MockExocortexApi();
    inboxItem = quickCapture(api, 'Buy milk');
  });

  describe('Scenario: Next Action button changes class and status', () => {
    it('Given InboxItem "Buy milk", When "Next Action" clicked, Then class changes to gtd__NextAction and status to Doing', () => {
      // When
      api.triggerButton('Next Action', inboxItem.id);

      // Then
      const updated = api.getAsset(inboxItem.id)!;
      expect(updated.classes).toContain('gtd__NextAction');
      expect(updated.classes).not.toContain('gtd__InboxItem');
      expect(updated.status).toBe('ems__EffortStatusDoing');
    });
  });

  describe('Scenario: Delegate button sets delegatee and class', () => {
    it('Given InboxItem "Buy milk", When "Delegate" clicked with delegatee "Alice", Then class changes to gtd__WaitingFor and delegatee is set', () => {
      // When
      api.triggerButton('Delegate', inboxItem.id, { delegatee: 'Alice' });

      // Then
      const updated = api.getAsset(inboxItem.id)!;
      expect(updated.classes).toContain('gtd__WaitingFor');
      expect(updated.classes).not.toContain('gtd__InboxItem');
      expect(updated.properties.gtd__Effort_delegatee).toBe('Alice');
      expect(updated.status).toBe('ems__EffortStatusDoing');
    });
  });

  describe('Scenario: Someday/Maybe button sets correct class and status', () => {
    it('Given InboxItem "Buy milk", When "Someday/Maybe" clicked, Then class changes to gtd__SomedayMaybe and status remains Backlog', () => {
      // When
      api.triggerButton('Someday/Maybe', inboxItem.id);

      // Then
      const updated = api.getAsset(inboxItem.id)!;
      expect(updated.classes).toContain('gtd__SomedayMaybe');
      expect(updated.classes).not.toContain('gtd__InboxItem');
      expect(updated.status).toBe('ems__EffortStatusBacklog');
    });
  });

  describe('Scenario: Reference button archives the item', () => {
    it('Given InboxItem "Buy milk", When "Reference" clicked, Then class changes to gtd__Reference and status to Done', () => {
      // When
      api.triggerButton('Reference', inboxItem.id);

      // Then
      const updated = api.getAsset(inboxItem.id)!;
      expect(updated.classes).toContain('gtd__Reference');
      expect(updated.classes).not.toContain('gtd__InboxItem');
      expect(updated.status).toBe('ems__EffortStatusDone');
    });
  });

  describe('Scenario: InboxItem count decreases after processing', () => {
    it('Given 3 InboxItems, When one is processed as Next Action, Then 2 InboxItems remain', () => {
      // Given: create 2 more (1 already exists from beforeEach)
      quickCapture(api, 'Task B');
      quickCapture(api, 'Task C');
      expect(api.queryByClass('gtd__InboxItem')).toHaveLength(3);

      // When
      api.triggerButton('Next Action', inboxItem.id);

      // Then
      expect(api.queryByClass('gtd__InboxItem')).toHaveLength(2);
      expect(api.queryByClass('gtd__NextAction')).toHaveLength(1);
    });
  });
});
