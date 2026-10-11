import type { Config } from '../config/types';

/** Stores the immutable configuration snapshot used by an installed LaunchAgent. */
export interface PersistedAgentConfig {
  version: 1;
  createdAt: string;
  source: string;
  powerOnOffsetMinutes: number;
  config: Config;
}
