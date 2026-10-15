import type { Config } from '../../src/config/types';
import type { PersistedAgentConfig } from '../../src/agentConfig/types';

/** Stores the migration flags accepted by the Brewly migration command. */
export interface MigrationOptions {
  dryRun: boolean;
}

/** Describes the legacy and current paths involved in a migration. */
export interface MigrationPaths {
  legacyLabel: string;
  legacyPlistPath: string;
  legacySupportDirectory: string;
  legacyConfigPath: string;
  legacyLogDirectory: string;
  currentSupportDirectory: string;
  currentConfigPath: string;
  currentLogDirectory: string;
}

/** Describes a discovered legacy installation and its effective configuration. */
export interface LegacyInstallation {
  paths: MigrationPaths;
  snapshot: PersistedAgentConfig;
  config: Config;
  hasLegacyPlist: boolean;
  hasLegacyPowerState: boolean;
}
