import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { glob } from 'glob';

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WIKILINK_RE = /\[\[([^\]]+)\]\]/g;

export interface WikiLink {
  raw: string;
  id: string;
  label?: string;
  isNamespace: boolean;
  isFullUuid: boolean;
}

export interface ParsedFile {
  filePath: string;
  fileName: string;
  uid: string | undefined;
  frontmatter: Record<string, unknown>;
  body: string;
  wikilinks: WikiLink[];
}

export function parseWikiLink(raw: string): WikiLink {
  const inner = raw.slice(2, -2);
  const parts = inner.split('|');
  const id = parts[0];
  const label = parts.length > 1 ? parts.slice(1).join('|') : undefined;
  return {
    raw,
    id,
    label,
    isNamespace: id.startsWith('!'),
    isFullUuid: UUID_V4_RE.test(id),
  };
}

export function extractWikiLinks(text: string): WikiLink[] {
  const links: WikiLink[] = [];
  let match: RegExpExecArray | null;
  while ((match = WIKILINK_RE.exec(text)) !== null) {
    links.push(parseWikiLink(match[0]));
  }
  return links;
}

export function parseFile(filePath: string): ParsedFile {
  const content = readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);
  const fileName = basename(filePath, '.md');

  const allText = content;
  const wikilinks = extractWikiLinks(allText);

  return {
    filePath,
    fileName,
    uid: data.exo__Asset_uid as string | undefined,
    frontmatter: data,
    body,
    wikilinks,
  };
}

export async function parseAllPluginFiles(pluginRoot: string): Promise<ParsedFile[]> {
  const pattern = '**/*.md';
  const files = await glob(pattern, {
    cwd: pluginRoot,
    absolute: true,
    ignore: ['**/node_modules/**', '**/tests/**', '**/dist/**'],
  });

  return files.map(parseFile);
}
