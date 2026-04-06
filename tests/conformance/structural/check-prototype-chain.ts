import type { ParsedFile } from './parser.js';
import type { ValidatorError, ValidatorResult } from './check-wikilinks.js';
import { parseWikiLink } from './parser.js';

export function checkNoCircularChains(files: ParsedFile[]): ValidatorResult {
  const errors: ValidatorError[] = [];

  const filesByUid = new Map<string, ParsedFile>();
  for (const file of files) {
    if (file.uid) {
      filesByUid.set(file.uid.toLowerCase(), file);
    }
  }

  function getPrototypeUid(file: ParsedFile): string | null {
    const proto = file.frontmatter.exo__Asset_prototype;
    if (!proto || typeof proto !== 'string') return null;

    const link = parseWikiLink(proto);
    if (!link.isFullUuid) return null;
    return link.id.toLowerCase();
  }

  // DFS cycle detection with visiting (gray) / visited (black) sets
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function dfs(uid: string, path: string[]): void {
    if (visited.has(uid)) return;

    if (visiting.has(uid)) {
      const cycleStart = path.indexOf(uid);
      const cycle = path.slice(cycleStart).concat(uid);
      const file = filesByUid.get(uid);
      errors.push({
        file: file?.filePath ?? uid,
        message: `Circular prototype chain detected: ${cycle.join(' → ')}`,
      });
      return;
    }

    visiting.add(uid);
    path.push(uid);

    const file = filesByUid.get(uid);
    if (file) {
      const protoUid = getPrototypeUid(file);
      if (protoUid && filesByUid.has(protoUid)) {
        dfs(protoUid, path);
      }
    }

    path.pop();
    visiting.delete(uid);
    visited.add(uid);
  }

  for (const uid of filesByUid.keys()) {
    dfs(uid, []);
  }

  return {
    name: 'prototypeCycles',
    passed: errors.length === 0,
    errors,
  };
}
