import { AiAgentId } from '../config/schema';
import { AiAgent } from './AiAgent';
import { allAgents, createAgent } from './agents';

/**
 * Resolve which agent to use. A preferred id (from config/`--ai`) is honoured
 * when available; otherwise the first installed agent in preference order is
 * chosen. Returns null when no agent CLI is present — callers fall back to the
 * deterministic path.
 */
export function resolveAgent(preferred?: AiAgentId): AiAgent | null {
  if (preferred) {
    const agent = createAgent(preferred);
    return agent.isAvailable() ? agent : null;
  }
  return allAgents().find((agent) => agent.isAvailable()) ?? null;
}

/** Ids of all agents currently installed (for the wizard). */
export function availableAgentIds(): AiAgentId[] {
  return allAgents()
    .filter((agent) => agent.isAvailable())
    .map((agent) => agent.id);
}
