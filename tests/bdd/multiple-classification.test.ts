/**
 * BDD: Multiple Classification — energy + context filtering
 * Issue #7 — tests for multi-class filtering and Jedi ratio
 *
 * Feature: Multiple Classification
 *   As a Jedi Techniques practitioner
 *   I want tasks to carry multiple classification tags simultaneously (energy + context + type)
 *   So that I can filter my Next Actions list by context and energy in real time and track my Jedi ratio
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockExocortexApi } from './helpers/mock-exocortex-api.js';
import { contextFilter, jediRatio } from './helpers/dashboard-queries.js';

describe('Feature: Multiple Classification', () => {
  let api: MockExocortexApi;

  beforeEach(() => {
    api = new MockExocortexApi();
  });

  describe('Scenario: Task visible when context matches', () => {
    it('Given NextAction with classes HighEnergy + AtComputer, When Context Filter context=AtComputer, Then shown', () => {
      // Given
      api.createAsset({
        label: 'Write report',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__HighEnergy', 'gtd__AtComputer'],
        status: 'ems__EffortStatusDoing',
      });

      // When
      const results = contextFilter(api, 'gtd__AtComputer');

      // Then
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Write report');
    });
  });

  describe('Scenario: Task hidden when context does not match', () => {
    it('Given NextAction with classes HighEnergy + AtComputer, When Context Filter context=AtPhone, Then NOT shown', () => {
      // Given
      api.createAsset({
        label: 'Write report',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__HighEnergy', 'gtd__AtComputer'],
        status: 'ems__EffortStatusDoing',
      });

      // When
      const results = contextFilter(api, 'gtd__AtPhone');

      // Then
      expect(results).toHaveLength(0);
    });
  });

  describe('Scenario: Task hidden when energy does not match', () => {
    it('Given NextAction with classes LowEnergy, When Context Filter energy=HighEnergy, Then NOT shown', () => {
      // Given
      api.createAsset({
        label: 'Organize desk',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__LowEnergy'],
        status: 'ems__EffortStatusDoing',
      });

      // When
      const results = contextFilter(api, undefined, 'gtd__HighEnergy');

      // Then
      expect(results).toHaveLength(0);
    });
  });

  describe('Scenario: Jedi ratio counts Proactive and Reactive separately', () => {
    it('Given tasks with Proactive and Reactive classes, When dashboard Jedi ratio query runs, Then both are counted correctly', () => {
      // Given: 3 proactive tasks, 1 reactive task
      api.createAsset({
        label: 'Plan project',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__Proactive'],
        status: 'ems__EffortStatusDoing',
      });
      api.createAsset({
        label: 'Weekly review',
        classes: ['ems__Task', 'gtd__Proactive'],
        status: 'ems__EffortStatusDoing',
      });
      api.createAsset({
        label: 'Read book',
        classes: ['ems__Task', 'gtd__Proactive'],
        status: 'ems__EffortStatusDoing',
      });
      api.createAsset({
        label: 'Fix urgent bug',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__Reactive'],
        status: 'ems__EffortStatusDoing',
      });

      // When
      const result = jediRatio(api);

      // Then
      expect(result.proactiveCount).toBe(3);
      expect(result.reactiveCount).toBe(1);
      expect(result.ratio).toBe(0.75);
    });
  });

  describe('Scenario: Combined context + energy filter', () => {
    it('Given multiple NextActions with mixed classifications, When filtering by context AND energy, Then only matching tasks shown', () => {
      // Given
      api.createAsset({
        label: 'Code review',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__HighEnergy', 'gtd__AtComputer'],
        status: 'ems__EffortStatusDoing',
      });
      api.createAsset({
        label: 'Check email',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__LowEnergy', 'gtd__AtComputer'],
        status: 'ems__EffortStatusDoing',
      });
      api.createAsset({
        label: 'Call client',
        classes: ['ems__Task', 'gtd__NextAction', 'gtd__HighEnergy', 'gtd__AtPhone'],
        status: 'ems__EffortStatusDoing',
      });

      // When: filter for HighEnergy + AtComputer
      const results = contextFilter(api, 'gtd__AtComputer', 'gtd__HighEnergy');

      // Then: only "Code review" matches both
      expect(results).toHaveLength(1);
      expect(results[0].label).toBe('Code review');
    });
  });

  describe('Scenario: Task with both Proactive and Reactive is counted in both', () => {
    it('Given a task with both Proactive and Reactive classes, When Jedi ratio query runs, Then task contributes to both counts', () => {
      // Given: a task that is both proactive and reactive
      api.createAsset({
        label: 'Respond to email with project proposal',
        classes: ['ems__Task', 'gtd__Proactive', 'gtd__Reactive'],
        status: 'ems__EffortStatusDoing',
      });

      // When
      const result = jediRatio(api);

      // Then
      expect(result.proactiveCount).toBe(1);
      expect(result.reactiveCount).toBe(1);
      expect(result.ratio).toBe(0.5);
    });
  });
});
