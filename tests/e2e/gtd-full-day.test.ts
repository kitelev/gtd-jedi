/**
 * E2E: Full GTD Day — end-to-end workflow on real plugin files
 *
 * NO MOCKS. Everything is driven by real .md files:
 *   - Commands parsed from commands/*.md, grounding executed by interpreter
 *   - Buttons parsed from buttons/*.md, visibility + grounding from real DSL
 *   - Dashboard sections parsed from dashboards/*.md, real ExoQL queries
 *
 * Scenario: Quick Capture → Process Inbox → Dashboard → Defer → Complete Review
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { loadPlugin, type PluginStore } from '../helpers/plugin-loader.js';
import {
  loadButtons,
  loadCommands,
  runCommand,
  getVisibleButtons,
  clickButton,
  loadDashboardSections,
  type ButtonDef,
  type CommandDef,
  type RuntimeAsset,
  type RuntimeStore,
} from './helpers/grounding-engine.js';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../..');
const DASHBOARD_MAIN_UID = '93fc4924-e60c-4fa2-a069-7492409bfc67';

describe('E2E: Full GTD Day (real plugin files)', () => {
  let pluginStore: PluginStore;
  let buttons: ButtonDef[];
  let commands: CommandDef[];
  let runtime: RuntimeStore;

  beforeAll(async () => {
    pluginStore = await loadPlugin(PLUGIN_ROOT);
    buttons = loadButtons(pluginStore);
    commands = loadCommands(pluginStore);
    runtime = new Map();
  });

  // ── Plugin structure validation ──

  it('loads all 5 buttons with non-empty grounding and visibility from real .md files', () => {
    expect(buttons).toHaveLength(5);

    const labels = buttons.map(b => b.label).sort();
    expect(labels).toEqual([
      'Complete Review', 'Defer', 'Delegate', 'Next Action', 'Someday/Maybe',
    ]);

    for (const btn of buttons) {
      expect(btn.grounding.length, `"${btn.label}" has no grounding steps`).toBeGreaterThan(0);
      expect(btn.visibility, `"${btn.label}" has no visibility rule`).not.toBeNull();
    }

    // Validate specific grounding step counts from real .md files
    // RFC-009 format: composite groundings with property_delete + property_set steps
    // clear_classes counts as 1 step; each class added via property_set counts as 1 step each
    const stepCounts: Record<string, number> = {};
    for (const btn of buttons) stepCounts[btn.label] = btn.grounding.length;
    expect(stepCounts['Next Action']).toBe(4);    // clear_classes, add Task, add NextAction, set status
    expect(stepCounts['Delegate']).toBe(4);       // clear_classes, add Task, add WaitingFor, set status
    expect(stepCounts['Someday/Maybe']).toBe(4);  // clear_classes, add Task, add SomedayMaybe, set status
    expect(stepCounts['Defer']).toBe(4);          // clear_classes, add Task, add InboxItem, set status
    expect(stepCounts['Complete Review']).toBe(2); // set status, set endTimestamp
  });

  it('loads all 5 commands with parseable grounding from real .md files', () => {
    expect(commands).toHaveLength(5);

    const labels = commands.map(c => c.label).sort();
    expect(labels).toEqual([
      'GTD: Context Filter',
      'GTD: Process Inbox',
      'GTD: Quick Capture',
      'GTD: Quick Start',
      'GTD: Weekly Review',
    ]);

    // Quick Capture has 5 grounding steps
    const quickCapture = commands.find(c => c.label === 'GTD: Quick Capture')!;
    expect(quickCapture.grounding).toHaveLength(5);

    // Weekly Review has 4 grounding steps (including "Open")
    const weeklyReview = commands.find(c => c.label === 'GTD: Weekly Review')!;
    expect(weeklyReview.grounding).toHaveLength(4);
  });

  it('dashboard main has 4 ExoQL sections with class-specific queries', () => {
    const sections = loadDashboardSections(pluginStore, DASHBOARD_MAIN_UID);
    expect(sections).toHaveLength(4);

    const byTitle = Object.fromEntries(sections.map(s => [s.title, s.query]));

    // Each query references the correct GTD class
    expect(byTitle['Inbox (count)']).toContain('InboxItem');
    expect(byTitle['Inbox (count)']).toContain('COUNT');
    expect(byTitle['Next Actions']).toContain('NextAction');
    expect(byTitle['Waiting For']).toContain('WaitingFor');
    expect(byTitle['Waiting For']).toContain('delegatee');
    expect(byTitle['Jedi Ratio (green vs red this week)']).toContain('Proactive');
    expect(byTitle['Jedi Ratio (green vs red this week)']).toContain('Reactive');
  });

  // ── Full workflow ──

  it('complete workflow: capture → buttons → process → defer → complete review', () => {
    // ── Step 1: Quick Capture via real command grounding ──
    const taskA = runCommand(commands, 'GTD: Quick Capture', runtime, { label: 'Write quarterly report' });
    const taskB = runCommand(commands, 'GTD: Quick Capture', runtime, { label: 'Call dentist' });
    const taskC = runCommand(commands, 'GTD: Quick Capture', runtime, { label: 'Research vacation spots' });

    // Verify the command grounding produced correct state
    for (const task of [taskA, taskB, taskC]) {
      expect(task.classes).toContain('ems__Task');
      expect(task.classes).toContain('gtd__InboxItem');
      expect(task.status).toBe('ems__EffortStatusBacklog');
      expect(task.prototype).toBe('gtd-jedi:gtd__TaskPrototype');
    }
    expect(taskA.label).toBe('Write quarterly report');

    // ── Step 2: Button visibility for InboxItem (from real Visibility rules) ──
    const inboxBtnLabels = getVisibleButtons(buttons, taskA).map(b => b.label).sort();

    expect(inboxBtnLabels).toContain('Next Action');
    expect(inboxBtnLabels).toContain('Delegate');
    expect(inboxBtnLabels).toContain('Someday/Maybe');
    expect(inboxBtnLabels).not.toContain('Defer');
    expect(inboxBtnLabels).not.toContain('Complete Review');

    // Button metadata from real .md frontmatter (RFC-009 format)
    const nextActionBtn = buttons.find(b => b.label === 'Next Action')!;
    expect(nextActionBtn.variant).toBe('primary'); // play icon maps to primary
    expect(nextActionBtn.icon).toBe('play');
    expect(nextActionBtn.group).toBe('GTD'); // binding group 'gtd' uppercased

    // ── Step 3: Process Inbox — real button grounding ──

    // Task A → Next Action
    clickButton(buttons, 'Next Action', taskA);
    expect(taskA.classes).toContain('gtd__NextAction');
    expect(taskA.classes).not.toContain('gtd__InboxItem');
    expect(taskA.status).toBe('ems__EffortStatusDoing');

    // Button visibility changes: Defer appears, Next Action disappears
    const afterNextAction = getVisibleButtons(buttons, taskA).map(b => b.label).sort();
    expect(afterNextAction).toContain('Defer');
    expect(afterNextAction).toContain('Delegate');
    expect(afterNextAction).toContain('Someday/Maybe');
    expect(afterNextAction).not.toContain('Next Action');

    // Task B → Delegate to Alice
    clickButton(buttons, 'Delegate', taskB, { delegatee: 'Alice' });
    expect(taskB.classes).toContain('gtd__WaitingFor');
    expect(taskB.classes).not.toContain('gtd__InboxItem');
    // Note: gtd__Effort_delegatee is not set by RFC-009 grounding because
    // input-based property setting requires service_call which is not yet implemented.
    // The delegate grounding currently only handles class transition + status change.
    expect(taskB.status).toBe('ems__EffortStatusDoing');

    // WaitingFor: no GTD buttons visible
    expect(getVisibleButtons(buttons, taskB)).toHaveLength(0);

    // Task C → Someday/Maybe
    clickButton(buttons, 'Someday/Maybe', taskC);
    expect(taskC.classes).toContain('gtd__SomedayMaybe');
    expect(taskC.classes).not.toContain('gtd__InboxItem');
    expect(taskC.status).toBe('ems__EffortStatusBacklog');
    expect(getVisibleButtons(buttons, taskC)).toHaveLength(0);

    // Inbox zero
    const inboxItems = [...runtime.values()].filter(a => a.classes.includes('gtd__InboxItem'));
    expect(inboxItems).toHaveLength(0);

    // ── Step 4: Defer — NextAction back to inbox ──
    clickButton(buttons, 'Defer', taskA);
    expect(taskA.classes).toContain('gtd__InboxItem');
    expect(taskA.classes).not.toContain('gtd__NextAction');
    expect(taskA.status).toBe('ems__EffortStatusBacklog');

    const afterDefer = getVisibleButtons(buttons, taskA).map(b => b.label);
    expect(afterDefer).toContain('Next Action');
    expect(afterDefer).not.toContain('Defer');

    // ── Step 5: Weekly Review via real command grounding ──
    const review = runCommand(commands, 'GTD: Weekly Review', runtime, {
      currentDate: new Date('2026-04-06'),
    });

    // Verify command grounding produced correct state
    expect(review.classes).toContain('ems__Task');
    expect(review.classes).toContain('gtd__Proactive');
    expect(review.prototype).toBe('gtd-jedi:gtd__WeeklyReviewPrototype');
    expect(review.properties.ems__Effort_scheduledDate).toBe('2026-04-11'); // next Saturday

    // Weekly Review needs gtd__Review class + Doing status for Complete Review button
    // These come from prototype inheritance in real Exocortex runtime.
    // The command grounding creates with Proactive class; the plugin runtime
    // adds gtd__Review from the prototype chain (WeeklyReviewPrototype has it).
    // We simulate this inheritance step here since prototype materialization
    // is an Exocortex core feature, not a plugin feature.
    review.classes.push('gtd__Review');
    review.status = 'ems__EffortStatusDoing';

    // Complete Review button visible
    const reviewBtns = getVisibleButtons(buttons, review).map(b => b.label);
    expect(reviewBtns).toContain('Complete Review');

    // Click Complete Review
    clickButton(buttons, 'Complete Review', review);
    expect(review.status).toBe('ems__EffortStatusDone');
    expect(review.properties.ems__Effort_endTimestamp).toBeDefined();

    // Button disappears after completion
    expect(getVisibleButtons(buttons, review).map(b => b.label))
      .not.toContain('Complete Review');

    // ── Step 6: Invisible button throws ──
    expect(() => clickButton(buttons, 'Defer', taskC))
      .toThrow(/not visible/);
    expect(() => clickButton(buttons, 'Complete Review', taskA))
      .toThrow(/not visible/);
  });
});
