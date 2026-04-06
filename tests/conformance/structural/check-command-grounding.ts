import type { ParsedFile } from './parser.js';
import type { ValidatorError, ValidatorResult } from './check-wikilinks.js';

const COMMAND_MARKERS = ['exocmd__Command'];

function isCommand(file: ParsedFile): boolean {
  const classes = file.frontmatter.exo__Instance_class;
  if (!Array.isArray(classes)) return false;

  return classes.some((cls: string) =>
    COMMAND_MARKERS.some((marker) => cls.includes(marker)),
  );
}

export function checkCommandsHaveGrounding(files: ParsedFile[]): ValidatorResult {
  const errors: ValidatorError[] = [];

  for (const file of files) {
    if (!isCommand(file)) continue;

    if (!file.body.includes('## Grounding')) {
      errors.push({
        file: file.filePath,
        message: `Command file missing "## Grounding" section`,
      });
    }
  }

  return {
    name: 'commandGrounding',
    passed: errors.length === 0,
    errors,
  };
}
