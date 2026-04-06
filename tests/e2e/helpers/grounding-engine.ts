/**
 * Grounding Engine — parses and executes button/command grounding
 * from real plugin .md files.
 *
 * Reads `## Grounding`, `## Visibility` sections, parses each step,
 * and applies mutations to RuntimeAssets.
 *
 * NOT a mock — interprets the actual grounding DSL from plugin files.
 */

import type { PluginStore } from '../../helpers/plugin-loader.js';
import { randomUUID } from 'node:crypto';

// ── Runtime asset: what exists in a user's vault at runtime ──

export interface RuntimeAsset {
  id: string;
  label: string;
  classes: string[];
  status: string;
  prototype?: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export type RuntimeStore = Map<string, RuntimeAsset>;

// ── Grounding step types ──

export interface GroundingStep {
  action: string;
  target: string;
  value?: string;
}

// ── Arrow delimiter: support both → (U+2192) and -> (ASCII) ──

const ARROW_RE = /\s*(?:→|->)\s*/;

// ── Parse grounding from a button .md body (numbered list with action: target) ──

const BUTTON_GROUNDING_RE =
  /^\d+\.\s+(property_remove_class|property_add_class|property_set):\s+(.+)$/;

export function parseButtonGrounding(body: string): GroundingStep[] {
  const section = extractSection(body, 'Grounding');
  if (!section) return [];

  const steps: GroundingStep[] = [];
  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(BUTTON_GROUNDING_RE);
    if (!match) continue;

    const action = match[1];
    const rest = match[2].trim();

    if (action === 'property_set') {
      const parts = rest.split(ARROW_RE);
      if (parts.length < 2 || !parts[1]) {
        throw new Error(`Malformed property_set line: "${line}" — missing value after arrow`);
      }
      steps.push({ action, target: parts[0].trim(), value: parts[1].trim() });
    } else {
      const target = rest.replace(/\s*\(if present\)/, '').trim();
      steps.push({ action, target });
    }
  }
  return steps;
}

// ── Parse command grounding (natural language DSL) ──

export interface CommandDef {
  uid: string;
  label: string;
  grounding: CommandGroundingStep[];
}

export interface CommandGroundingStep {
  raw: string;
  type: 'create' | 'add_class' | 'set_property' | 'set_prototype' | 'set_label' | 'open' | 'unknown';
  className?: string;
  prototype?: string;
  property?: string;
  value?: string;
}

const COMMAND_CREATE_RE = /^Create (?:new )?(\w+)(?:\s+"([^"]+)")?(?:\s+with\s+(.+))?/i;
const COMMAND_ADD_CLASS_RE = /^Add class (\w+)/i;
const COMMAND_SET_RE = /^Set (\w+)/i;

function parseCommandGroundingLine(line: string): CommandGroundingStep {
  const trimmed = line.replace(/^\d+\.\s*/, '').trim();

  // "Create new ems__Task" or "Create new ems__Task with prototype → gtd__TaskPrototype"
  const createMatch = trimmed.match(COMMAND_CREATE_RE);
  if (createMatch) {
    const result: CommandGroundingStep = { raw: trimmed, type: 'create', className: createMatch[1] };
    if (createMatch[3]) {
      const withPart = createMatch[3];
      const protoMatch = withPart.match(/prototype\s*(?:→|->)\s*(\w+)/);
      if (protoMatch) result.prototype = protoMatch[1];
      const classMatch = withPart.match(/class\s*(?:→|->)\s*(\w+)/);
      if (classMatch) result.className = classMatch[1];
    }
    return result;
  }

  // "Add class gtd__InboxItem"
  const addClassMatch = trimmed.match(COMMAND_ADD_CLASS_RE);
  if (addClassMatch) {
    return { raw: trimmed, type: 'add_class', className: addClassMatch[1] };
  }

  // "Set prototype → gtd__TaskPrototype"
  const setProtoMatch = trimmed.match(/^Set prototype\s*(?:→|->)\s*(\w+)/i);
  if (setProtoMatch) {
    return { raw: trimmed, type: 'set_prototype', prototype: setProtoMatch[1] };
  }

  // "Set label from input"
  if (/^Set label/i.test(trimmed)) {
    return { raw: trimmed, type: 'set_label' };
  }

  // "Set ems__Effort_status → ems__EffortStatusBacklog"
  const setPropMatch = trimmed.match(/^Set (\w+)\s*(?:→|->)\s*(.+)/i);
  if (setPropMatch) {
    return { raw: trimmed, type: 'set_property', property: setPropMatch[1], value: setPropMatch[2].trim() };
  }

  // "Open ..." or "Open the created review task"
  if (/^Open/i.test(trimmed)) {
    return { raw: trimmed, type: 'open' };
  }

  return { raw: trimmed, type: 'unknown' };
}

export function parseCommandGrounding(body: string): CommandGroundingStep[] {
  const section = extractSection(body, 'Grounding');
  if (!section) return [];

  return section.split('\n')
    .map(l => l.trim())
    .filter(l => /^\d+\./.test(l))
    .map(parseCommandGroundingLine);
}

/**
 * Execute a command's grounding to produce a RuntimeAsset.
 * Interprets the natural-language DSL from commands/*.md.
 */
export function executeCommandGrounding(
  steps: CommandGroundingStep[],
  params: { label?: string; currentDate?: Date } = {},
): RuntimeAsset {
  const asset: RuntimeAsset = {
    id: randomUUID(),
    label: params.label ?? '',
    classes: [],
    status: 'ems__EffortStatusBacklog',
    properties: {},
    createdAt: new Date(),
  };

  for (const step of steps) {
    switch (step.type) {
      case 'create':
        if (step.className && !asset.classes.includes(step.className)) {
          asset.classes.push(step.className);
        }
        if (step.prototype) {
          asset.prototype = `gtd-jedi:${step.prototype}`;
        }
        break;
      case 'add_class':
        if (step.className && !asset.classes.includes(step.className)) {
          asset.classes.push(step.className);
        }
        break;
      case 'set_prototype':
        if (step.prototype) {
          asset.prototype = `gtd-jedi:${step.prototype}`;
        }
        break;
      case 'set_label':
        if (params.label) asset.label = params.label;
        break;
      case 'set_property':
        if (step.property === 'ems__Effort_status') {
          asset.status = step.value!;
        } else if (step.property === 'ems__Effort_scheduledDate' && step.value === 'next Saturday') {
          const date = params.currentDate ?? new Date();
          const nextSat = new Date(date);
          const day = nextSat.getDay();
          const daysUntilSat = day === 6 ? 7 : (6 - day + 7) % 7 || 7;
          nextSat.setDate(nextSat.getDate() + daysUntilSat);
          asset.properties[step.property] = nextSat.toISOString().split('T')[0];
        } else if (step.property && step.value) {
          asset.properties[step.property] = step.value;
        }
        break;
      case 'open':
        // UI action — no state mutation
        break;
    }
  }

  return asset;
}

// ── Load commands from real plugin store ──

export function loadCommands(store: PluginStore): CommandDef[] {
  return store.files
    .filter(f => {
      const classes = f.frontmatter.exo__Instance_class;
      return Array.isArray(classes) && classes.some((c: string) => c.includes('exocmd__Command'));
    })
    .map(f => ({
      uid: f.uid!,
      label: f.frontmatter.exo__Asset_label as string,
      grounding: parseCommandGrounding(f.body),
    }));
}

/**
 * Run a command by label — find it, parse and execute grounding.
 */
export function runCommand(
  commands: CommandDef[],
  label: string,
  runtimeStore: RuntimeStore,
  params: { label?: string; currentDate?: Date } = {},
): RuntimeAsset {
  const cmd = commands.find(c => c.label === label);
  if (!cmd) throw new Error(`Command "${label}" not found in plugin`);
  if (cmd.grounding.length === 0) {
    throw new Error(`Command "${label}" has no parseable grounding steps`);
  }

  const asset = executeCommandGrounding(cmd.grounding, params);
  runtimeStore.set(asset.id, asset);
  return asset;
}

// ── Parse visibility from a button .md body ──

export interface VisibilityRule {
  alternativeClasses: string[][];  // OR groups (each group is AND)
  statusCondition?: string;
}

/**
 * Parses "SPARQL ASK: asset has class X" and "X OR Y" patterns.
 * Also handles "AND ems__Effort_status = Doing".
 *
 * THROWS if `## Visibility` section exists but cannot be parsed.
 */
export function parseVisibility(body: string): VisibilityRule | null {
  const section = extractSection(body, 'Visibility');
  if (!section) return null;

  // Take first non-empty line only
  const line = section.split('\n').map(l => l.trim()).find(l => l.length > 0);
  if (!line) {
    throw new Error(`## Visibility section exists but is empty`);
  }

  const askMatch = line.match(/^SPARQL ASK:\s*asset has class\s+(.+)$/);
  if (!askMatch) {
    throw new Error(`Unparseable ## Visibility: "${line}"`);
  }

  let classExpr = askMatch[1];
  let statusCondition: string | undefined;

  // Extract AND status condition: "gtd__Review AND ems__Effort_status = Doing"
  const andStatusMatch = classExpr.match(/(.+?)\s+AND\s+ems__Effort_status\s*=\s*(\w+)/);
  if (andStatusMatch) {
    classExpr = andStatusMatch[1].trim();
    statusCondition = `ems__EffortStatus${andStatusMatch[2]}`;
  }

  const orParts = classExpr.split(/\s+OR\s+/).map(s => s.trim());

  return {
    alternativeClasses: orParts.map(part => [part]),
    statusCondition,
  };
}

/**
 * Check if a runtime asset satisfies a button's visibility rule.
 */
export function isButtonVisible(asset: RuntimeAsset, rule: VisibilityRule): boolean {
  if (rule.statusCondition && asset.status !== rule.statusCondition) {
    return false;
  }

  if (rule.alternativeClasses.length === 0) return true;
  return rule.alternativeClasses.some(group =>
    group.every(cls => asset.classes.includes(cls)),
  );
}

// ── Execute button grounding steps on a runtime asset ──

export function executeButtonGrounding(
  steps: GroundingStep[],
  asset: RuntimeAsset,
  params?: Record<string, string>,
): void {
  for (const step of steps) {
    switch (step.action) {
      case 'property_remove_class':
        asset.classes = asset.classes.filter(c => c !== step.target);
        break;

      case 'property_add_class':
        if (!asset.classes.includes(step.target)) {
          asset.classes.push(step.target);
        }
        break;

      case 'property_set':
        if (step.target === 'ems__Effort_status') {
          asset.status = step.value!;
        } else if (step.value === '$now') {
          asset.properties[step.target] = new Date().toISOString();
        } else if (step.value?.startsWith('input.') && params) {
          const paramKey = step.value.replace('input.', '');
          asset.properties[step.target] = params[paramKey];
        } else {
          asset.properties[step.target] = step.value;
        }
        break;
    }
  }
}

// ── Load buttons from real plugin store ──

export interface ButtonDef {
  uid: string;
  label: string;
  variant: string;
  icon: string;
  group: string;
  visibility: VisibilityRule | null;
  grounding: GroundingStep[];
}

export function loadButtons(store: PluginStore): ButtonDef[] {
  return store.files
    .filter(f => {
      const classes = f.frontmatter.exo__Instance_class;
      return Array.isArray(classes) && classes.some((c: string) => c.includes('exo-ui__Button'));
    })
    .map(f => ({
      uid: f.uid!,
      label: f.frontmatter.exo__Asset_label as string,
      variant: (f.frontmatter['exo-ui__Button_variant'] as string) ?? 'ghost',
      icon: (f.frontmatter['exo-ui__Button_icon'] as string) ?? '',
      group: (f.frontmatter['exo-ui__Button_group'] as string) ?? '',
      visibility: parseVisibility(f.body),
      grounding: parseButtonGrounding(f.body),
    }));
}

/**
 * Get all buttons visible for a given runtime asset.
 */
export function getVisibleButtons(buttons: ButtonDef[], asset: RuntimeAsset): ButtonDef[] {
  return buttons.filter(btn => {
    if (!btn.visibility) return false;
    return isButtonVisible(asset, btn.visibility);
  });
}

/**
 * Click a button by label — check visibility, execute grounding.
 * Throws if button not found, not visible, or has no grounding.
 */
export function clickButton(
  buttons: ButtonDef[],
  label: string,
  asset: RuntimeAsset,
  params?: Record<string, string>,
): void {
  const btn = buttons.find(b => b.label === label);
  if (!btn) throw new Error(`Button "${label}" not found in plugin`);
  if (btn.grounding.length === 0) {
    throw new Error(`Button "${label}" has no parseable grounding steps`);
  }
  if (btn.visibility && !isButtonVisible(asset, btn.visibility)) {
    throw new Error(
      `Button "${label}" is not visible for asset "${asset.label}" (classes: ${asset.classes.join(', ')}, status: ${asset.status})`,
    );
  }
  executeButtonGrounding(btn.grounding, asset, params);
}

// ── Load ExoQL dashboard queries from real files ──

export interface DashboardSection {
  title: string;
  query: string;
}

export function loadDashboardSections(store: PluginStore, dashboardUid: string): DashboardSection[] {
  const file = store.filesByUid.get(dashboardUid);
  if (!file) throw new Error(`Dashboard ${dashboardUid} not found`);

  const sections: DashboardSection[] = [];
  const lines = file.body.split('\n');
  let currentTitle = '';

  for (let i = 0; i < lines.length; i++) {
    const titleMatch = lines[i].match(/^###\s+(.+)/);
    if (titleMatch) {
      currentTitle = titleMatch[1].trim();
      continue;
    }
    if (lines[i].trim() === '```exoql') {
      let query = '';
      i++;
      while (i < lines.length && lines[i].trim() !== '```') {
        query += lines[i] + '\n';
        i++;
      }
      sections.push({ title: currentTitle, query: query.trim() });
    }
  }
  return sections;
}

// ── Helpers ──

function extractSection(body: string, heading: string): string | null {
  const lines = body.split('\n');
  let inSection = false;
  let sectionLines: string[] = [];

  for (const line of lines) {
    if (line.match(new RegExp(`^## ${heading}\\s*$`))) {
      inSection = true;
      continue;
    }
    if (inSection && /^## /.test(line)) {
      break; // next ## section
    }
    if (inSection) {
      sectionLines.push(line);
    }
  }

  if (!inSection) return null;
  const content = sectionLines.join('\n');
  return content;
}
