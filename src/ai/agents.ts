import { AiAgentId } from '../config/schema';
import { AgentSpec, AiAgent } from './AiAgent';
import { commandExists, runProcess } from './process';

/**
 * Declarative specs for each supported agent CLI, invoked in one-shot/headless
 * mode so they print a single answer to stdout. Prompts are passed on stdin
 * where supported to avoid shell-quoting issues with large inputs.
 */
const SPECS: Record<AiAgentId, AgentSpec> = {
  claude: {
    id: 'claude',
    bin: 'claude',
    // Claude Code print mode: reads the prompt from stdin, prints the result.
    buildArgs: () => ['-p'],
  },
  cursor: {
    id: 'cursor',
    bin: 'cursor-agent',
    buildArgs: (prompt) => ['-p', prompt],
  },
  gemini: {
    id: 'gemini',
    bin: 'gemini',
    buildArgs: (prompt) => ['-p', prompt],
  },
  aider: {
    id: 'aider',
    bin: 'aider',
    buildArgs: (prompt) => ['--no-auto-commits', '--yes', '--message', prompt],
  },
};

/** Whether the spec passes the prompt via stdin (vs. as an argument). */
const USES_STDIN: Record<AiAgentId, boolean> = {
  claude: true,
  cursor: false,
  gemini: false,
  aider: false,
};

class CliAgent implements AiAgent {
  constructor(private readonly spec: AgentSpec) {}

  get id(): AiAgentId {
    return this.spec.id;
  }

  isAvailable(): boolean {
    return commandExists(this.spec.bin);
  }

  async run(prompt: string): Promise<string> {
    const useStdin = USES_STDIN[this.spec.id];
    const args = useStdin
      ? this.spec.buildArgs('')
      : this.spec.buildArgs(prompt);
    const result = await runProcess(this.spec.bin, args, {
      input: useStdin ? prompt : undefined,
    });
    return result.stdout;
  }
}

/** Construct the agent wrapper for an id (does not check availability). */
export function createAgent(id: AiAgentId): AiAgent {
  return new CliAgent(SPECS[id]);
}

/** All agents, in detection-preference order. */
export function allAgents(): AiAgent[] {
  return (Object.keys(SPECS) as AiAgentId[]).map(createAgent);
}
