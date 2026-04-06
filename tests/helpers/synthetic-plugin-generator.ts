/**
 * Synthetic Plugin Generator — creates realistic plugin fixtures for benchmarking.
 *
 * Generates a temporary directory containing N prototype files with realistic
 * YAML frontmatter and markdown body content. Files have proper UUIDs, labels,
 * prototype chains, and class annotations.
 *
 * The generated plugin mimics the structure of a real Exocortex plugin:
 * - A root prototype (no parent)
 * - Intermediate prototypes chaining to the root
 * - Leaf prototypes chaining to intermediates
 * - Workflow-class files with class labels and aliases
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

export interface SyntheticPluginOptions {
  /** Number of prototype files to generate */
  prototypeCount: number;
  /** Number of workflow-class files to generate (default: 0) */
  workflowClassCount?: number;
  /** Chain depth — how many prototypes chain together (default: 3) */
  chainDepth?: number;
}

export interface SyntheticPluginResult {
  /** Path to the generated plugin directory */
  pluginPath: string;
  /** Generated prototype UIDs in order */
  prototypeUids: string[];
  /** Generated workflow-class UIDs */
  workflowClassUids: string[];
  /** Total file count */
  fileCount: number;
}

/**
 * Generate a realistic frontmatter block for a prototype file.
 */
function generatePrototypeFrontmatter(
  uid: string,
  label: string,
  parentUid?: string,
  parentLabel?: string,
  extra?: Record<string, unknown>,
): string {
  const lines = [
    '---',
    `exo__Asset_uid: ${uid}`,
    `exo__Instance_class:`,
    `  - "[[df7e579d|ems__TaskPrototype]]"`,
    `  - "[[ebf717aa|exo__Prototype]]"`,
    `exo__Asset_label: "${label}"`,
    `aliases:`,
    `  - ${label.replace(/\s+/g, '_')}`,
    `exo__Asset_description: "Auto-generated prototype for benchmarking."`,
  ];

  if (parentUid && parentLabel) {
    lines.push(`exo__Asset_prototype: "[[${parentUid}|${parentLabel}]]"`);
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/**
 * Generate a realistic frontmatter block for a workflow-class file.
 */
function generateWorkflowClassFrontmatter(uid: string, label: string): string {
  return [
    '---',
    `exo__Asset_uid: ${uid}`,
    `exo__Instance_class:`,
    `  - "[[c789a012|exo__WorkflowClass]]"`,
    `exo__Asset_label: "${label}"`,
    `aliases:`,
    `  - ${label}`,
    `exo__Asset_description: "Auto-generated workflow class for benchmarking."`,
    `exo__Asset_isDefinedBy: "[[!synthetic-plugin]]"`,
    '---',
  ].join('\n');
}

/**
 * Generate a realistic markdown body for a file.
 */
function generateBody(label: string): string {
  return [
    '',
    `# ${label}`,
    '',
    'This is an auto-generated file for performance benchmarking.',
    'It contains realistic content to simulate real I/O load.',
    '',
    '## Description',
    '',
    `The ${label} component defines standardized behavior`,
    'for task management within the GTD methodology framework.',
    '',
    '## Properties',
    '',
    '- Inheritable: yes',
    '- Category: benchmark fixture',
    `- Generated: ${new Date().toISOString()}`,
    '',
  ].join('\n');
}

/**
 * Generate a synthetic plugin with the specified number of files.
 *
 * Creates a realistic directory structure:
 * - prototypes/ — prototype chain files
 * - workflow-classes/ — workflow class files
 * - !synthetic-plugin.md — plugin manifest
 *
 * @returns Path to the temporary plugin directory and generated UIDs
 */
export function generateSyntheticPlugin(
  options: SyntheticPluginOptions,
): SyntheticPluginResult {
  const {
    prototypeCount,
    workflowClassCount = 0,
    chainDepth = 3,
  } = options;

  // Create temporary directory
  const pluginPath = join(tmpdir(), `synthetic-plugin-${Date.now()}`);
  const prototypesDir = join(pluginPath, 'prototypes');
  const classesDir = join(pluginPath, 'workflow-classes');

  mkdirSync(prototypesDir, { recursive: true });
  if (workflowClassCount > 0) {
    mkdirSync(classesDir, { recursive: true });
  }

  // Generate plugin manifest
  const manifestContent = [
    '---',
    'exo__Asset_uid: 00000000-0000-0000-0000-000000000000',
    'exo__Asset_label: "Synthetic Benchmark Plugin"',
    'exo__Instance_class:',
    '  - "[[aabbccdd|exo__Plugin]]"',
    'aliases:',
    '  - synthetic-plugin',
    '---',
    '',
    '# Synthetic Benchmark Plugin',
    '',
    'Auto-generated plugin for performance benchmarks.',
    '',
  ].join('\n');
  writeFileSync(join(pluginPath, '!synthetic-plugin.md'), manifestContent);

  // Generate prototypes with chaining
  const prototypeUids: string[] = [];

  for (let i = 0; i < prototypeCount; i++) {
    const uid = randomUUID();
    prototypeUids.push(uid);

    const label = `Benchmark Prototype ${i + 1}`;

    // Determine parent (creates chains of specified depth)
    let parentUid: string | undefined;
    let parentLabel: string | undefined;

    if (i > 0 && i % chainDepth !== 0) {
      // Chain to previous prototype within the same chain group
      const parentIndex = i - 1;
      parentUid = prototypeUids[parentIndex];
      parentLabel = `Benchmark Prototype ${parentIndex + 1}`;
    }

    // Add extra properties to make files realistic
    const extra: Record<string, unknown> = {
      [`benchmark__property_${i}`]: `value_${i}`,
      'ems__Effort_estimatedDuration': 15 + (i % 60),
    };

    const frontmatter = generatePrototypeFrontmatter(
      uid, label, parentUid, parentLabel, extra,
    );
    const body = generateBody(label);
    const content = frontmatter + body;

    writeFileSync(join(prototypesDir, `${uid}.md`), content);
  }

  // Generate workflow classes
  const workflowClassUids: string[] = [];

  for (let i = 0; i < workflowClassCount; i++) {
    const uid = randomUUID();
    workflowClassUids.push(uid);

    const label = `bench__WorkflowClass${i + 1}`;
    const frontmatter = generateWorkflowClassFrontmatter(uid, label);
    const body = generateBody(label);
    const content = frontmatter + body;

    writeFileSync(join(classesDir, `${uid}.md`), content);
  }

  return {
    pluginPath,
    prototypeUids,
    workflowClassUids,
    fileCount: 1 + prototypeCount + workflowClassCount, // manifest + prototypes + classes
  };
}

/**
 * Generate task instances that reference a prototype.
 * Used for dashboard query benchmarks with many instances.
 *
 * @param dir Directory to write files to
 * @param protoUid Prototype UID to reference
 * @param protoLabel Prototype label
 * @param count Number of instances to generate
 * @returns Array of generated UIDs
 */
export function generateTaskInstances(
  dir: string,
  protoUid: string,
  protoLabel: string,
  count: number,
): string[] {
  mkdirSync(dir, { recursive: true });
  const uids: string[] = [];

  const statuses = ['backlog', 'doing', 'done'];
  const energyLevels = ['gtd__HighEnergy', 'gtd__LowEnergy'];
  const contexts = ['gtd__AtComputer', 'gtd__AtOffice', 'gtd__AtPhone'];

  for (let i = 0; i < count; i++) {
    const uid = randomUUID();
    uids.push(uid);

    const status = statuses[i % statuses.length];
    const energy = energyLevels[i % energyLevels.length];
    const context = contexts[i % contexts.length];

    const content = [
      '---',
      `exo__Asset_uid: ${uid}`,
      `exo__Instance_class:`,
      `  - "[[1b20a8f0|ems__Task]]"`,
      `exo__Asset_label: "Task Instance ${i + 1}"`,
      `exo__Asset_prototype: "[[${protoUid}|${protoLabel}]]"`,
      `ems__Effort_status: "${status}"`,
      `gtd__energyLevel: "${energy}"`,
      `gtd__context: "${context}"`,
      `ems__Effort_estimatedDuration: ${15 + (i % 45)}`,
      '---',
      '',
      `Task ${i + 1} for benchmark testing.`,
      '',
    ].join('\n');

    writeFileSync(join(dir, `${uid}.md`), content);
  }

  return uids;
}
