/**
 * Consistency Checker — detects logical contradictions in merged plugin data.
 *
 * Checks for:
 * 1. Functional property violations: a property that should have one value has multiple
 * 2. Button group namespace collisions: two plugins defining buttons in the same group
 * 3. UID collisions: two files with the same exo__Asset_uid
 * 4. Class definition conflicts: same alias defined by multiple plugins
 *
 * Returns a list of detected inconsistencies with severity levels.
 */

import type { ParsedFile } from '../conformance/structural/parser.js';
import {
  materializeAsset,
  buildUidMap,
  extractClasses,
  type MaterializedAsset,
} from './materializer.js';

export type Severity = 'error' | 'warning';

export interface Inconsistency {
  type: 'uid-collision' | 'button-group-collision' | 'functional-property-violation' | 'alias-collision';
  severity: Severity;
  message: string;
  files: string[];
}

export interface ConsistencyReport {
  consistent: boolean;
  inconsistencies: Inconsistency[];
}

/**
 * Functional properties — properties that should have exactly one value per asset.
 * Having two different values is a contradiction.
 */
const FUNCTIONAL_PROPERTIES = [
  'exo__Asset_uid',
  'exo__Asset_label',
  'ems__Effort_duration',
  'ems__Effort_status',
  'exo__Asset_prototype',
] as const;

/**
 * Check for UID collisions between two sets of files.
 */
function checkUidCollisions(files1: ParsedFile[], files2: ParsedFile[]): Inconsistency[] {
  const uids1 = new Map<string, string>();
  for (const f of files1) {
    if (f.uid) uids1.set(f.uid.toLowerCase(), f.filePath);
  }

  const collisions: Inconsistency[] = [];
  for (const f of files2) {
    if (f.uid && uids1.has(f.uid.toLowerCase())) {
      collisions.push({
        type: 'uid-collision',
        severity: 'error',
        message: `UID collision: "${f.uid}" is defined in both plugins`,
        files: [uids1.get(f.uid.toLowerCase())!, f.filePath],
      });
    }
  }
  return collisions;
}

/**
 * Check for button group namespace collisions.
 * Two plugins can have buttons in the SAME group — this is a collision.
 * Two plugins with DIFFERENT groups is fine.
 */
function checkButtonGroupCollisions(
  files1: ParsedFile[],
  files2: ParsedFile[],
): Inconsistency[] {
  const getButtonGroups = (files: ParsedFile[]): Set<string> => {
    const groups = new Set<string>();
    for (const f of files) {
      const group = f.frontmatter['exo-ui__Button_group'];
      if (typeof group === 'string') groups.add(group);
    }
    return groups;
  };

  const groups1 = getButtonGroups(files1);
  const groups2 = getButtonGroups(files2);
  const overlapping = [...groups1].filter((g) => groups2.has(g));

  return overlapping.map((group) => ({
    type: 'button-group-collision' as const,
    severity: 'warning' as const,
    message: `Button group "${group}" is defined by both plugins — may cause UI conflicts`,
    files: [],
  }));
}

/**
 * Check for alias collisions between two sets of files.
 */
function checkAliasCollisions(files1: ParsedFile[], files2: ParsedFile[]): Inconsistency[] {
  const aliases1 = new Map<string, string>();
  for (const f of files1) {
    const aliases = f.frontmatter.aliases;
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        aliases1.set(String(alias).toLowerCase(), f.filePath);
      }
    }
  }

  const collisions: Inconsistency[] = [];
  for (const f of files2) {
    const aliases = f.frontmatter.aliases;
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        const key = String(alias).toLowerCase();
        if (aliases1.has(key)) {
          collisions.push({
            type: 'alias-collision',
            severity: 'error',
            message: `Alias collision: "${alias}" is defined by both plugins`,
            files: [aliases1.get(key)!, f.filePath],
          });
        }
      }
    }
  }
  return collisions;
}

/**
 * Check that user overrides do not create functional property violations.
 * An instance with own value + inherited value for a functional property
 * should result in ONE value (the user's), not two.
 */
function checkFunctionalPropertyConsistency(
  materialized: MaterializedAsset,
): Inconsistency[] {
  const issues: Inconsistency[] = [];

  for (const prop of FUNCTIONAL_PROPERTIES) {
    const value = materialized.properties[prop];
    if (Array.isArray(value) && value.length > 1 && prop !== 'exo__Instance_class') {
      issues.push({
        type: 'functional-property-violation',
        severity: 'error',
        message: `Functional property "${prop}" has multiple values on asset "${materialized.source.uid}"`,
        files: [materialized.source.filePath],
      });
    }
  }

  return issues;
}

/**
 * Check consistency between two plugins loaded simultaneously.
 */
export function checkDualPluginConsistency(
  plugin1Files: ParsedFile[],
  plugin2Files: ParsedFile[],
): ConsistencyReport {
  const inconsistencies: Inconsistency[] = [
    ...checkUidCollisions(plugin1Files, plugin2Files),
    ...checkButtonGroupCollisions(plugin1Files, plugin2Files),
    ...checkAliasCollisions(plugin1Files, plugin2Files),
  ];

  return {
    consistent: inconsistencies.filter((i) => i.severity === 'error').length === 0,
    inconsistencies,
  };
}

/**
 * Check consistency of a single plugin's materialized assets.
 * Verifies no functional property violations exist.
 */
export function checkInternalConsistency(
  files: ParsedFile[],
): ConsistencyReport {
  const uidMap = buildUidMap(files);
  const inconsistencies: Inconsistency[] = [];

  // Check UID uniqueness within plugin
  const uidCounts = new Map<string, string[]>();
  for (const f of files) {
    if (f.uid) {
      const key = f.uid.toLowerCase();
      if (!uidCounts.has(key)) uidCounts.set(key, []);
      uidCounts.get(key)!.push(f.filePath);
    }
  }
  for (const [uid, paths] of uidCounts) {
    if (paths.length > 1) {
      inconsistencies.push({
        type: 'uid-collision',
        severity: 'error',
        message: `Internal UID collision: "${uid}" appears ${paths.length} times`,
        files: paths,
      });
    }
  }

  // Check functional property consistency for materialized assets
  for (const file of files) {
    const materialized = materializeAsset(file, uidMap);
    inconsistencies.push(...checkFunctionalPropertyConsistency(materialized));
  }

  return {
    consistent: inconsistencies.filter((i) => i.severity === 'error').length === 0,
    inconsistencies,
  };
}

/**
 * Check that multiple classes can coexist on a single instance
 * without contradiction. Returns true if all classes are present.
 */
export function checkMultiClassConsistency(
  classes: string[],
  allKnownClasses: ParsedFile[],
): { consistent: boolean; missingClasses: string[] } {
  const knownAliases = new Set<string>();
  for (const cls of allKnownClasses) {
    const aliases = cls.frontmatter.aliases;
    if (Array.isArray(aliases)) {
      for (const alias of aliases) {
        knownAliases.add(String(alias));
      }
    }
  }

  const missing = classes.filter((c) => !knownAliases.has(c));
  return {
    consistent: missing.length === 0,
    missingClasses: missing,
  };
}
