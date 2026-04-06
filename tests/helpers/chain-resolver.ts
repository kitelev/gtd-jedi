/**
 * Chain Resolver — checks if prototype chains are resolvable (no dangling links).
 *
 * Walks the exo__Asset_prototype chain from a file, resolving each wikilink UUID.
 * A chain is "resolvable" if every UUID in the chain either:
 * - Points to a file within the plugin store, OR
 * - Points to an external reference (short UUID prefix, not a full UUID)
 *
 * Returns false if a full UUID reference cannot be resolved within the store.
 */

import { parseWikiLink } from '../conformance/structural/parser.js';
import type { ParsedFile } from '../conformance/structural/parser.js';
import type { PluginStore } from './plugin-loader.js';

export interface ChainLink {
  uid: string;
  label?: string;
  depth: number;
}

export interface ChainResult {
  resolvable: boolean;
  chain: ChainLink[];
  danglingLink?: string;
}

/**
 * Resolves the prototype chain for a given file.
 * Uses DFS with visited set to detect cycles.
 *
 * Convention: depth 0 = the file itself, depth 1 = immediate parent, etc.
 */
export function resolveChain(store: PluginStore, file: ParsedFile): ChainResult {
  const chain: ChainLink[] = [];
  const visited = new Set<string>();

  let current: ParsedFile | undefined = file;
  let depth = 0;

  while (current) {
    const uid = current.uid ?? current.fileName;

    if (visited.has(uid)) {
      // Cycle detected — still considered "resolvable" structurally
      // (cycle detection is a separate concern handled by structural conformance)
      break;
    }

    visited.add(uid);
    chain.push({ uid, depth });

    const protoValue = current.frontmatter.exo__Asset_prototype;
    if (!protoValue || typeof protoValue !== 'string') {
      break; // End of chain
    }

    const link = parseWikiLink(protoValue);

    if (!link.isFullUuid) {
      // Short reference (e.g. [[df7e579d|ems__TaskPrototype]]) — external, acceptable
      chain.push({ uid: link.id, label: link.label, depth: depth + 1 });
      break;
    }

    // Full UUID — must resolve within the store
    const next = store.filesByUid.get(link.id);
    if (!next) {
      return {
        resolvable: false,
        chain,
        danglingLink: link.id,
      };
    }

    current = next;
    depth++;
  }

  return { resolvable: true, chain };
}

/**
 * Checks if the prototype chain for a given file is fully resolvable.
 */
export function isChainResolvable(store: PluginStore, file: ParsedFile): boolean {
  return resolveChain(store, file).resolvable;
}

/**
 * Returns the chain depth (number of hops) for a file.
 * Depth 0 means the file has no prototype chain.
 */
export function getChainDepth(store: PluginStore, file: ParsedFile): number {
  const result = resolveChain(store, file);
  return result.chain.length - 1; // Exclude the file itself
}
