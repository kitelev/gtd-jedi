/**
 * BDD: Weekly Review — checklist and scheduling
 * Issue #8 — tests for "GTD: Weekly Review" command
 *
 * Feature: Weekly Review
 *   As a GTD practitioner
 *   I want the Weekly Review command to automatically schedule and pre-fill the review checklist
 *   So that I never miss a weekly review and always have the complete checklist ready
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockExocortexApi } from './helpers/mock-exocortex-api.js';
import { weeklyReview } from './helpers/gtd-commands.js';
import { nextSaturday, formatDate } from './helpers/date-utils.js';

describe('Feature: Weekly Review', () => {
  let api: MockExocortexApi;

  // Background: gtd-jedi is loaded
  beforeEach(() => {
    api = new MockExocortexApi();
  });

  describe('Scenario: Weekly Review creates task with correct prototype', () => {
    it('Given gtd-jedi is loaded, When user runs "GTD: Weekly Review", Then new task created with prototype gtd-jedi:gtd__WeeklyReviewPrototype', () => {
      // When
      const review = weeklyReview(api);

      // Then
      expect(review.prototype).toBe('gtd-jedi:gtd__WeeklyReviewPrototype');
    });
  });

  describe('Scenario: Weekly Review body contains 8 checklist items', () => {
    it('Given gtd-jedi is loaded, When user runs "GTD: Weekly Review", Then body contains exactly 8 checklist items', () => {
      // When
      const review = weeklyReview(api);

      // Then — count "- [ ]" occurrences in body
      const checklistItems = (review.body ?? '').match(/- \[ \]/g) ?? [];
      expect(checklistItems).toHaveLength(8);
    });
  });

  describe('Scenario: Weekly Review is scheduled for next Saturday', () => {
    it('Given today is "2026-04-06" (Monday), When user runs "GTD: Weekly Review", Then scheduledDate is "2026-04-11"', () => {
      // Given
      const today = new Date('2026-04-06');

      // When
      const review = weeklyReview(api, today);

      // Then
      expect(review.properties.ems__Effort_scheduledDate).toBe('2026-04-11');
    });
  });

  describe('Scenario: Weekly Review has Proactive class', () => {
    it('Given gtd-jedi is loaded, When user runs "GTD: Weekly Review", Then class includes gtd__Proactive', () => {
      // When
      const review = weeklyReview(api);

      // Then
      expect(review.classes).toContain('gtd__Proactive');
    });
  });

  describe('Scenario: Weekly Review has ems__Task class', () => {
    it('Given gtd-jedi is loaded, When user runs "GTD: Weekly Review", Then asset is an ems__Task', () => {
      // When
      const review = weeklyReview(api);

      // Then
      expect(review.classes).toContain('ems__Task');
    });
  });
});

describe('Unit: nextSaturday date helper', () => {
  it('from Wednesday returns the coming Saturday', () => {
    // 2026-04-08 is Wednesday
    const wed = new Date('2026-04-08');
    const result = nextSaturday(wed);
    expect(formatDate(result)).toBe('2026-04-11');
  });

  it('from Saturday returns the NEXT Saturday (7 days later)', () => {
    // 2026-04-11 is Saturday
    const sat = new Date('2026-04-11');
    const result = nextSaturday(sat);
    expect(formatDate(result)).toBe('2026-04-18');
  });

  it('from Sunday returns the coming Saturday (6 days later)', () => {
    // 2026-04-12 is Sunday
    const sun = new Date('2026-04-12');
    const result = nextSaturday(sun);
    expect(formatDate(result)).toBe('2026-04-18');
  });

  it('from Friday returns the next day (Saturday)', () => {
    // 2026-04-10 is Friday
    const fri = new Date('2026-04-10');
    const result = nextSaturday(fri);
    expect(formatDate(result)).toBe('2026-04-11');
  });

  it('from Monday returns Saturday of the same week', () => {
    // 2026-04-06 is Monday
    const mon = new Date('2026-04-06');
    const result = nextSaturday(mon);
    expect(formatDate(result)).toBe('2026-04-11');
  });
});
