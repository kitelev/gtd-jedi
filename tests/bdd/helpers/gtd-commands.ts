/**
 * GTD Command simulators for BDD tests.
 * These model the behavior described in the plugin command files,
 * using MockExocortexApi as the storage backend.
 */

import { MockExocortexApi, type Asset } from './mock-exocortex-api.js';
import { nextSaturday, formatDate } from './date-utils.js';

/**
 * Simulates "GTD: Quick Capture" command.
 * Creates an InboxItem with the given label.
 *
 * Per commands/quick-capture.md:
 * 1. Create new ems__Task
 * 2. Add class gtd__InboxItem
 * 3. Set prototype -> gtd__TaskPrototype
 * 4. Set label from input
 * 5. Set ems__Effort_status -> ems__EffortStatusBacklog
 */
export function quickCapture(api: MockExocortexApi, label: string): Asset {
  return api.createAsset({
    label,
    classes: ['ems__Task', 'gtd__InboxItem'],
    status: 'ems__EffortStatusBacklog',
    prototype: 'gtd-jedi:gtd__TaskPrototype',
  });
}

/**
 * Simulates "GTD: Weekly Review" command.
 * Creates a review task with the WeeklyReviewPrototype.
 *
 * Per commands/weekly-review.md:
 * 1. Create new ems__Task with prototype -> gtd__WeeklyReviewPrototype
 * 2. Set ems__Effort_scheduledDate -> next Saturday
 * 3. Add class gtd__Proactive
 */
export function weeklyReview(
  api: MockExocortexApi,
  currentDate: Date = new Date(),
): Asset {
  const scheduledDate = nextSaturday(currentDate);

  // The checklist body from the WeeklyReviewPrototype (8 items)
  const body = `## Checklist
- [ ] Get Clear: process ALL inboxes to zero
- [ ] Get Current: review Next Actions list — still relevant?
- [ ] Get Current: review Waiting For — follow up needed?
- [ ] Get Current: review Projects — next actions defined?
- [ ] Get Current: review Someday/Maybe — anything to activate?
- [ ] Get Creative: any new ideas, projects, tasks?
- [ ] Jedi Check: ratio of green (proactive) vs red (reactive) tasks this week
- [ ] Plan: select focus areas for next week`;

  return api.createAsset({
    label: 'Weekly Review',
    classes: ['ems__Task', 'gtd__Proactive'],
    status: 'ems__EffortStatusBacklog',
    prototype: 'gtd-jedi:gtd__WeeklyReviewPrototype',
    properties: {
      ems__Effort_scheduledDate: formatDate(scheduledDate),
    },
    body,
  });
}

/**
 * Simulates "GTD: Quick Start" command.
 * Bootstraps a new vault with areas, inbox item, and weekly review.
 *
 * Per commands/quick-start.md:
 * 1. Create Area "Work" with prototype -> gtd__AreaPrototype
 * 2. Create Area "Family" with prototype -> gtd__AreaPrototype
 * 3. Create Area "Hobby" with prototype -> gtd__AreaPrototype
 * 4. Create InboxItem "Process all my inboxes"
 * 5. Create Weekly Review for next Saturday
 */
export function quickStart(
  api: MockExocortexApi,
  currentDate: Date = new Date(),
): Asset[] {
  const created: Asset[] = [];

  // 1-3. Create 3 areas
  for (const areaName of ['Work', 'Family', 'Hobby']) {
    created.push(
      api.createAsset({
        label: areaName,
        classes: ['ems__Area'],
        prototype: 'gtd-jedi:gtd__AreaPrototype',
      }),
    );
  }

  // 4. Create inbox item
  created.push(quickCapture(api, 'Process all my inboxes'));

  // 5. Create weekly review
  created.push(weeklyReview(api, currentDate));

  return created;
}
