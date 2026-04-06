/**
 * CLI Runner — executes real exocortex-cli commands against the plugin directory.
 *
 * Uses the actual SPARQL engine, triple store, and query optimizer.
 * No mocks, no custom parsers — the real Exocortex runtime.
 */

import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

const PLUGIN_ROOT = resolve(import.meta.dirname, '../../..');
const CLI = 'npx @kitelev/exocortex-cli';
const SPARQL_TIMEOUT = '10s';

export interface SparqlResult {
  [key: string]: string;
}

/**
 * Run a SPARQL query against the real plugin directory using exocortex-cli.
 * Returns parsed JSON array of bindings.
 */
export function sparqlQuery(query: string): SparqlResult[] {
  const result = execSync(
    `${CLI} sparql query '${query.replace(/'/g, "'\\''")}' --vault ${PLUGIN_ROOT} --format json --no-cache --timeout ${SPARQL_TIMEOUT}`,
    { encoding: 'utf-8', timeout: 30_000 },
  );

  // CLI output has status lines before JSON — find the JSON array
  const jsonStart = result.indexOf('[');
  if (jsonStart === -1) return [];

  const jsonEnd = result.lastIndexOf(']');
  if (jsonEnd === -1) return [];

  return JSON.parse(result.slice(jsonStart, jsonEnd + 1));
}

/**
 * Run a SPARQL ASK query. Returns true/false.
 */
export function sparqlAsk(query: string): boolean {
  const result = execSync(
    `${CLI} sparql query '${query.replace(/'/g, "'\\''")}' --vault ${PLUGIN_ROOT} --format json --no-cache --timeout ${SPARQL_TIMEOUT}`,
    { encoding: 'utf-8', timeout: 30_000 },
  );
  return result.includes('true');
}

/** Strip surrounding quotes from SPARQL string values */
export function unquote(s: string): string {
  return s.replace(/^"|"$/g, '');
}

/** Standard prefixes for gtd-jedi queries */
export const PREFIXES = `
  PREFIX exo: <https://exocortex.my/ontology/exo#>
  PREFIX ems: <https://exocortex.my/ontology/ems#>
  PREFIX gtd: <https://exocortex.my/plugins/gtd-jedi#>
  PREFIX exocmd: <https://exocortex.my/ontology/exocmd#>
  PREFIX exoui: <https://exocortex.my/ontology/exo-ui#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
`.trim();
