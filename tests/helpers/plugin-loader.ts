/**
 * Plugin Loader — loads all plugin .md files into an in-memory store.
 *
 * Parses frontmatter from each file and builds:
 * - A triple store (subject/predicate/object tuples)
 * - An index by UID for fast lookups
 * - Metadata about the loaded plugin (file count, triple count, load time)
 */

import { parseAllPluginFiles, type ParsedFile } from '../conformance/structural/parser.js';

export interface Triple {
  subject: string;       // UID of the file
  predicate: string;     // frontmatter key
  object: unknown;       // frontmatter value
}

export interface PluginStore {
  files: ParsedFile[];
  triples: Triple[];
  filesByUid: Map<string, ParsedFile>;
  loadTimeMs: number;
}

/**
 * Loads all plugin .md files from a directory and builds an in-memory triple store.
 * Each frontmatter key-value pair becomes a triple (uid, key, value).
 * Array values are expanded into multiple triples.
 */
export async function loadPlugin(pluginPath: string): Promise<PluginStore> {
  const start = performance.now();

  const files = await parseAllPluginFiles(pluginPath);

  const filesByUid = new Map<string, ParsedFile>();
  const triples: Triple[] = [];

  for (const file of files) {
    const uid = file.uid ?? file.fileName;

    if (file.uid) {
      filesByUid.set(file.uid, file);
    }

    for (const [key, value] of Object.entries(file.frontmatter)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          triples.push({ subject: uid, predicate: key, object: item });
        }
      } else {
        triples.push({ subject: uid, predicate: key, object: value });
      }
    }
  }

  const loadTimeMs = performance.now() - start;

  return { files, triples, filesByUid, loadTimeMs };
}

/**
 * Query helpers for the in-memory store.
 */

/** Count all triples */
export function countTriples(store: PluginStore): number {
  return store.triples.length;
}

/** Find all files that have a specific class in exo__Instance_class */
export function findByClass(store: PluginStore, classMarker: string): ParsedFile[] {
  return store.files.filter((file) => {
    const classes = file.frontmatter.exo__Instance_class;
    if (!Array.isArray(classes)) return false;
    return classes.some((cls: string) => cls.includes(classMarker));
  });
}

/** Find all files in a specific directory (workflow-classes, prototypes, etc.) */
export function findByDirectory(store: PluginStore, dirName: string): ParsedFile[] {
  return store.files.filter((file) => file.filePath.includes(`/${dirName}/`));
}

/** Get a file by its UID */
export function getByUid(store: PluginStore, uid: string): ParsedFile | undefined {
  return store.filesByUid.get(uid);
}
