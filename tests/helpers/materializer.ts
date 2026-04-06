/**
 * Materializer — resolves prototype chain inheritance for Exocortex assets.
 *
 * Given a set of parsed plugin files, the materializer computes the "inferred"
 * properties an instance would receive by walking up its prototype chain.
 *
 * Rules:
 * - Properties from the prototype are inherited unless they are NonInheritable
 * - exo__Instance_class values are accumulated (union of all prototypes)
 * - Closer prototypes (lower in chain) override farther ones
 * - NonInheritable properties (uid, label, status, description, isDefinedBy) are never inherited
 */

import type { ParsedFile } from '../conformance/structural/parser.js';

export const NON_INHERITABLE_PROPERTIES = [
  'exo__Asset_uid',
  'exo__Asset_label',
  'exo__Asset_description',
  'exo__Asset_isDefinedBy',
  'ems__Effort_status',
  'aliases',
] as const;

export type NonInheritableProperty = (typeof NON_INHERITABLE_PROPERTIES)[number];

export interface MaterializedAsset {
  /** The original parsed file */
  source: ParsedFile;
  /** All properties after materializing prototype chain */
  properties: Record<string, unknown>;
  /** Accumulated exo__Instance_class from all prototypes */
  classes: string[];
  /** The prototype chain UIDs (from immediate to root) */
  prototypeChain: string[];
}

/**
 * Extract the UUID from a wikilink value like "[[uuid|label]]"
 */
export function extractUidFromWikilink(value: string): string | undefined {
  const match = value.match(/^\[\[([^\]|]+)/);
  return match?.[1];
}

/**
 * Build a lookup map from UID to ParsedFile
 */
export function buildUidMap(files: ParsedFile[]): Map<string, ParsedFile> {
  const map = new Map<string, ParsedFile>();
  for (const file of files) {
    if (file.uid) {
      map.set(file.uid.toLowerCase(), file);
    }
  }
  return map;
}

/**
 * Resolve the prototype chain for a given file.
 * Returns array of UIDs from immediate prototype to root.
 */
export function resolvePrototypeChain(
  file: ParsedFile,
  uidMap: Map<string, ParsedFile>,
  visited: Set<string> = new Set(),
): string[] {
  const chain: string[] = [];
  const protoValue = file.frontmatter.exo__Asset_prototype;
  if (typeof protoValue !== 'string') return chain;

  const protoUid = extractUidFromWikilink(protoValue);
  if (!protoUid) return chain;

  const normalizedUid = protoUid.toLowerCase();
  if (visited.has(normalizedUid)) return chain; // circular guard

  const protoFile = uidMap.get(normalizedUid);
  if (!protoFile) {
    // Prototype is external (e.g., ems__TaskPrototype) — record but can't resolve further
    chain.push(protoUid);
    return chain;
  }

  visited.add(normalizedUid);
  chain.push(protoUid);
  chain.push(...resolvePrototypeChain(protoFile, uidMap, visited));
  return chain;
}

/**
 * Extract exo__Instance_class values from frontmatter as an array of raw wikilink strings.
 */
export function extractClasses(frontmatter: Record<string, unknown>): string[] {
  const classValue = frontmatter.exo__Instance_class;
  if (Array.isArray(classValue)) return classValue.map(String);
  if (typeof classValue === 'string') return [classValue];
  return [];
}

/**
 * Materialize an asset — resolve inherited properties from prototype chain.
 *
 * Inheritance rules:
 * 1. Own properties take precedence over inherited ones
 * 2. NonInheritable properties are never copied from prototypes
 * 3. exo__Instance_class is accumulated (union from all prototypes)
 * 4. Other properties inherit from closest prototype that defines them
 */
export function materializeAsset(
  file: ParsedFile,
  uidMap: Map<string, ParsedFile>,
): MaterializedAsset {
  const prototypeChain = resolvePrototypeChain(file, uidMap);

  // Start with own properties
  const properties: Record<string, unknown> = { ...file.frontmatter };

  // Collect classes from own + all prototypes
  const classSet = new Set<string>(extractClasses(file.frontmatter));

  // Walk the chain — closest prototype first
  for (const protoUid of prototypeChain) {
    const protoFile = uidMap.get(protoUid.toLowerCase());
    if (!protoFile) continue;

    // Accumulate classes
    for (const cls of extractClasses(protoFile.frontmatter)) {
      classSet.add(cls);
    }

    // Inherit non-own, non-NonInheritable properties
    for (const [key, value] of Object.entries(protoFile.frontmatter)) {
      if (key === 'exo__Instance_class') continue; // handled separately
      if ((NON_INHERITABLE_PROPERTIES as readonly string[]).includes(key)) continue;
      if (!(key in properties)) {
        properties[key] = value;
      }
    }
  }

  return {
    source: file,
    properties,
    classes: Array.from(classSet),
    prototypeChain,
  };
}

/**
 * Materialize all assets in a plugin.
 */
export function materializeAll(files: ParsedFile[]): MaterializedAsset[] {
  const uidMap = buildUidMap(files);
  return files.map((f) => materializeAsset(f, uidMap));
}

/**
 * A materialized triple with depth annotation.
 * depth 1 = from immediate parent, depth 2 = from grandparent, etc.
 */
export interface DepthAnnotatedTriple {
  predicate: string;
  value: unknown;
  sourceDepth: number;
  sourceUid: string;
}

export interface DepthAnnotatedAsset {
  source: ParsedFile;
  ownProperties: Record<string, unknown>;
  inheritedTriples: DepthAnnotatedTriple[];
  allProperties: Record<string, unknown>;
  prototypeChain: string[];
}

/**
 * Materialize with depth annotations — tracks which depth level
 * each inherited property came from.
 *
 * Convention: depth 1 = immediate parent, depth 2 = grandparent, etc.
 */
export function materializeWithDepth(
  file: ParsedFile,
  uidMap: Map<string, ParsedFile>,
): DepthAnnotatedAsset {
  const chain = resolvePrototypeChain(file, uidMap);
  const ownProperties: Record<string, unknown> = { ...file.frontmatter };
  const inheritedTriples: DepthAnnotatedTriple[] = [];
  const allProperties: Record<string, unknown> = { ...file.frontmatter };

  const alreadyDefined = new Set<string>(Object.keys(file.frontmatter));

  for (let i = 0; i < chain.length; i++) {
    const depth = i + 1; // 1-indexed depth
    const protoUid = chain[i];
    const protoFile = uidMap.get(protoUid.toLowerCase());
    if (!protoFile) continue;

    for (const [key, value] of Object.entries(protoFile.frontmatter)) {
      if (key === 'exo__Instance_class') continue;
      if ((NON_INHERITABLE_PROPERTIES as readonly string[]).includes(key)) continue;

      if (!alreadyDefined.has(key)) {
        inheritedTriples.push({
          predicate: key,
          value,
          sourceDepth: depth,
          sourceUid: protoUid,
        });
        allProperties[key] = value;
        alreadyDefined.add(key);
      }
    }
  }

  return {
    source: file,
    ownProperties,
    inheritedTriples,
    allProperties,
    prototypeChain: chain,
  };
}
