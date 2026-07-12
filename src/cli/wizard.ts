import inquirer from 'inquirer';
import { allAdapters } from '../adapters/registry';
import {
  AiAgentId,
  Config,
  KEY_STRATEGIES,
  STACK_IDS,
  StackId,
  configSchema,
} from '../config/schema';
import { availableAgentIds } from '../ai/detectAgent';
import { detectStack } from '../stack/detectStack';
import { recommendFor } from '../stack/recommend';
import { ui } from './ui';

/**
 * Interactive setup: detect the stack, let the user confirm every choice, and
 * return a fully-validated {@link Config}. The detection result is always shown
 * and overridable — nothing is assumed silently.
 */
export async function runWizard(cwd = process.cwd()): Promise<Config> {
  ui.heading('react-auto-i18ner setup');

  const detected = detectStack(cwd);
  ui.info(`Detected stack: ${detected.id}`);
  for (const reason of detected.evidence) ui.dim(`  · ${reason}`);

  const { stack } = await inquirer.prompt<{ stack: StackId }>([
    {
      type: 'list',
      name: 'stack',
      message: 'Confirm your UI stack:',
      default: detected.id,
      choices: STACK_IDS.map((id) => ({ name: id, value: id })),
    },
  ]);

  const recommendation = recommendFor(stack, cwd);

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'library',
      message: 'i18n library:',
      default: recommendation.library,
      choices: allAdapters().map((a) => ({ name: a.id, value: a.id })),
    },
    {
      type: 'input',
      name: 'sourceDir',
      message: 'Source directory to scan:',
      default: recommendation.sourceDir,
    },
    {
      type: 'input',
      name: 'localesDir',
      message: 'Directory for locale files:',
      default: recommendation.localesDir,
    },
    {
      type: 'input',
      name: 'sourceLocale',
      message: 'Source language code:',
      default: 'en',
    },
    {
      type: 'input',
      name: 'targetLocales',
      message: 'Target languages (comma-separated):',
      default: 'es,fr,de',
      filter: (value: string) =>
        value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
    },
    {
      type: 'list',
      name: 'keyStrategy',
      message: 'Translation key strategy:',
      default: 'path',
      choices: KEY_STRATEGIES.filter((s) => s !== 'ai').map((s) => ({
        name:
          s === 'path'
            ? 'path — nested keys namespaced by component (recommended)'
            : 'flat — single-level slug keys',
        value: s,
      })),
    },
  ]);

  const ai = await promptAi();

  return configSchema.parse({
    stack,
    library: answers.library,
    sourceDir: answers.sourceDir,
    localesDir: answers.localesDir,
    sourceLocale: answers.sourceLocale,
    targetLocales: answers.targetLocales,
    keyStrategy: ai.enabled && ai.tasks.nameKeys ? 'ai' : answers.keyStrategy,
    ai,
  });
}

async function promptAi(): Promise<Config['ai']> {
  const available = availableAgentIds();

  if (available.length === 0) {
    ui.dim(
      'No AI agent CLI detected (claude, cursor, gemini, aider). ' +
        'Continuing with the deterministic engine — you can enable AI later.'
    );
    return { enabled: false, tasks: { nameKeys: true, translate: true, classify: false } };
  }

  const { enabled } = await inquirer.prompt<{ enabled: boolean }>([
    {
      type: 'confirm',
      name: 'enabled',
      message: `Use an AI agent (${available.join(', ')}) for smarter keys and translations?`,
      default: true,
    },
  ]);

  if (!enabled) {
    return { enabled: false, tasks: { nameKeys: true, translate: true, classify: false } };
  }

  const { agent, tasks } = await inquirer.prompt<{
    agent: AiAgentId;
    tasks: string[];
  }>([
    {
      type: 'list',
      name: 'agent',
      message: 'Which agent?',
      choices: available.map((id) => ({ name: id, value: id })),
      default: available[0],
    },
    {
      type: 'checkbox',
      name: 'tasks',
      message: 'What should the agent do?',
      choices: [
        { name: 'Name translation keys semantically', value: 'nameKeys', checked: true },
        { name: 'Translate target languages', value: 'translate', checked: true },
        { name: 'Judge ambiguous strings', value: 'classify', checked: false },
      ],
    },
  ]);

  return {
    enabled: true,
    agent,
    tasks: {
      nameKeys: tasks.includes('nameKeys'),
      translate: tasks.includes('translate'),
      classify: tasks.includes('classify'),
    },
  };
}
