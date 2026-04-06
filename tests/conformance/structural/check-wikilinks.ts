import type { ParsedFile } from './parser.js';

export interface ValidatorError {
  file: string;
  message: string;
}

export interface ValidatorResult {
  name: string;
  passed: boolean;
  errors: ValidatorError[];
}

export function checkWikilinksResolve(files: ParsedFile[]): ValidatorResult {
  const errors: ValidatorError[] = [];

  const knownUids = new Set<string>();
  for (const file of files) {
    if (file.uid) {
      knownUids.add(file.uid.toLowerCase());
    }
  }

  for (const file of files) {
    for (const link of file.wikilinks) {
      if (link.isNamespace) continue;
      if (!link.isFullUuid) continue;

      if (!knownUids.has(link.id.toLowerCase())) {
        errors.push({
          file: file.filePath,
          message: `Broken wikilink: [[${link.id}${link.label ? '|' + link.label : ''}]] — no file with uid "${link.id}" found in plugin`,
        });
      }
    }
  }

  return {
    name: 'wikilinks',
    passed: errors.length === 0,
    errors,
  };
}
