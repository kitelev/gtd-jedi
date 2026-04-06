import { parseAllPluginFiles } from './parser.js';
import { checkWikilinksResolve } from './check-wikilinks.js';
import { checkNoCircularChains } from './check-prototype-chain.js';
import { checkClassesHaveLabels } from './check-class-labels.js';
import { checkCommandsHaveGrounding } from './check-command-grounding.js';
import type { ValidatorResult } from './check-wikilinks.js';

export interface ConformanceReport {
  wikilinks: ValidatorResult;
  prototypeCycles: ValidatorResult;
  classLabels: ValidatorResult;
  commandGrounding: ValidatorResult;
  allPassed: boolean;
}

export async function runStructuralConformance(pluginRoot: string): Promise<ConformanceReport> {
  const files = await parseAllPluginFiles(pluginRoot);
  const wikilinks = checkWikilinksResolve(files);
  const prototypeCycles = checkNoCircularChains(files);
  const classLabels = checkClassesHaveLabels(files);
  const commandGrounding = checkCommandsHaveGrounding(files);

  return {
    wikilinks,
    prototypeCycles,
    classLabels,
    commandGrounding,
    allPassed: wikilinks.passed && prototypeCycles.passed && classLabels.passed && commandGrounding.passed,
  };
}
