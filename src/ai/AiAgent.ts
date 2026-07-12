import { AiAgentId } from '../config/schema';

/**
 * An AI agent is any locally-installed CLI that can answer a prompt on stdout.
 *
 * The abstraction is deliberately tiny — detect, then run a prompt and get text
 * back — so the tool uses whatever agent the developer already has (Claude,
 * Cursor, Gemini, aider) with no API keys of its own. Every caller treats the
 * agent as best-effort and has a deterministic fallback.
 */
export interface AiAgent {
  readonly id: AiAgentId;
  /** True if the agent's CLI is installed and runnable. */
  isAvailable(): boolean;
  /** Send a prompt, resolve with the raw stdout text. */
  run(prompt: string): Promise<string>;
}

/** Declarative description of how to invoke an agent CLI in headless mode. */
export interface AgentSpec {
  id: AiAgentId;
  /** Executable name looked up on PATH. */
  bin: string;
  /** Build the argv (excluding the binary) for a one-shot prompt. */
  buildArgs(prompt: string): string[];
}
