import fg from 'fast-glob';
import * as path from 'path';
import { availableAgentIds } from '../../ai/detectAgent';
import { loadConfig } from '../../config/loadConfig';
import { detectStack } from '../../stack/detectStack';
import { recommendFor } from '../../stack/recommend';
import { CommonFlags, hasConfigFile, overridesFromFlags } from '../resolveConfig';
import { ui } from '../ui';

/** `analyze`: report detected stack, file counts and recommendations. */
export async function analyzeCommand(flags: CommonFlags): Promise<number> {
  const cwd = process.cwd();
  const config = loadConfig({
    configPath: flags.config,
    cwd,
    overrides: overridesFromFlags(flags),
  });

  const stack = detectStack(cwd);
  const recommendation = recommendFor(stack.id, cwd);

  ui.heading('Project analysis');
  ui.info(`  Detected stack:   ${stack.id}`);
  for (const reason of stack.evidence) ui.dim(`    · ${reason}`);
  ui.info(`  React present:    ${stack.hasReact ? 'yes' : 'no'}`);
  ui.info(`  Config file:      ${hasConfigFile(cwd) ? 'found' : 'not found (defaults used)'}`);

  const files = await fg(config.include, {
    cwd: path.resolve(cwd, config.sourceDir),
    ignore: config.exclude,
    onlyFiles: true,
  });
  ui.info(`  Component files:  ${files.length} under ${config.sourceDir}`);

  ui.heading('Recommendation');
  ui.info(`  Library:    ${recommendation.library}`);
  ui.info(`  Source dir: ${recommendation.sourceDir}`);
  ui.info(`  Locales:    ${recommendation.localesDir}`);

  const agents = availableAgentIds();
  ui.info(`  AI agents:  ${agents.length > 0 ? agents.join(', ') : 'none detected'}`);

  return 0;
}
