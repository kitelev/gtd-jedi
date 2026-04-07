import type { ParsedFile } from './parser.js';
import type { ValidatorError, ValidatorResult } from './check-wikilinks.js';

function isCommand(file: ParsedFile): boolean {
  const classes = file.frontmatter.exo__Instance_class;
  if (!Array.isArray(classes)) return false;

  // Must have exocmd__Command but NOT exocmd__CommandBinding
  const hasCommand = classes.some((cls: string) => cls.includes('exocmd__Command'));
  const isBinding = classes.some((cls: string) => cls.includes('exocmd__CommandBinding'));
  return hasCommand && !isBinding;
}

export function checkCommandsHaveGrounding(files: ParsedFile[]): ValidatorResult {
  const errors: ValidatorError[] = [];

  for (const file of files) {
    if (!isCommand(file)) continue;

    // RFC-009 commands use exocmd__Command_grounding in frontmatter
    const hasBodyGrounding = file.body.includes('## Grounding');
    const hasFrontmatterGrounding = !!file.frontmatter.exocmd__Command_grounding;

    if (!hasBodyGrounding && !hasFrontmatterGrounding) {
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
