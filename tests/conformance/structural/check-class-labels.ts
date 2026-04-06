import type { ParsedFile } from './parser.js';
import type { ValidatorError, ValidatorResult } from './check-wikilinks.js';

const EXO_CLASS_MARKERS = ['exo__Class', '8619c4fc'];

function isClassDefinition(file: ParsedFile): boolean {
  const classes = file.frontmatter.exo__Instance_class;
  if (!Array.isArray(classes)) return false;

  return classes.some((cls: string) =>
    EXO_CLASS_MARKERS.some((marker) => cls.includes(marker)),
  );
}

export function checkClassesHaveLabels(files: ParsedFile[]): ValidatorResult {
  const errors: ValidatorError[] = [];

  for (const file of files) {
    if (!isClassDefinition(file)) continue;

    const label = file.frontmatter.exo__Asset_label;
    if (!label || (typeof label === 'string' && label.trim() === '')) {
      errors.push({
        file: file.filePath,
        message: `Class file missing exo__Asset_label`,
      });
    }
  }

  return {
    name: 'classLabels',
    passed: errors.length === 0,
    errors,
  };
}
