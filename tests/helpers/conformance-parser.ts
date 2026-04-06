/**
 * Conformance test case parser.
 *
 * Parses markdown conformance test cases with YAML frontmatter.
 * Format:
 * ---
 * test_type: entailment | non-entailment | consistency
 * test_id: ENT-001
 * description: "..."
 * status: proposed
 * ---
 * ## Premises
 * [description of premise]
 * ## Expected
 * ```sparql
 * ASK { ... }
 * ```
 * ## Result: true | false
 */

import matter from 'gray-matter';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { glob } from 'glob';

export interface ConformanceTestCase {
  /** File path of the test case */
  filePath: string;
  /** Test type: entailment, non-entailment, consistency */
  testType: string;
  /** Test ID, e.g. ENT-001 */
  testId: string;
  /** Human-readable description */
  description: string;
  /** Status: proposed, approved, deprecated */
  status: string;
  /** Premises section text */
  premises: string;
  /** SPARQL ASK query or assertion description */
  expected: string;
  /** Expected result: true or false */
  result: boolean;
  /** Raw frontmatter */
  frontmatter: Record<string, unknown>;
  /** Full body text */
  body: string;
}

/**
 * Extract a section from markdown body by heading.
 */
function extractSection(body: string, heading: string): string {
  const regex = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm');
  const match = body.match(regex);
  return match?.[1]?.trim() ?? '';
}

/**
 * Extract code block content from a section.
 */
function extractCodeBlock(section: string): string {
  const match = section.match(/```(?:\w+)?\n([\s\S]*?)```/);
  return match?.[1]?.trim() ?? section.trim();
}

/**
 * Parse result from "## Result: true" or "## Result: false"
 */
function parseResult(body: string): boolean {
  const match = body.match(/^## Result:\s*(true|false)/m);
  return match?.[1] === 'true';
}

/**
 * Parse a single conformance test case file.
 */
export function parseConformanceTestCase(filePath: string): ConformanceTestCase {
  const content = readFileSync(filePath, 'utf-8');
  const { data, content: body } = matter(content);

  const premisesSection = extractSection(body, 'Premises');
  const expectedSection = extractSection(body, 'Expected');
  const expectedQuery = extractCodeBlock(expectedSection);

  return {
    filePath,
    testType: String(data.test_type ?? ''),
    testId: String(data.test_id ?? ''),
    description: String(data.description ?? ''),
    status: String(data.status ?? 'proposed'),
    premises: premisesSection,
    expected: expectedQuery,
    result: parseResult(body),
    frontmatter: data,
    body,
  };
}

/**
 * Load all conformance test cases from a directory.
 */
export async function loadConformanceTestCases(
  dir: string,
  testType?: string,
): Promise<ConformanceTestCase[]> {
  const files = await glob('**/*.md', { cwd: dir, absolute: true });
  const cases = files.map(parseConformanceTestCase);

  if (testType) {
    return cases.filter((c) => c.testType === testType);
  }
  return cases;
}
