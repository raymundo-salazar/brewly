/** Preserves the historical public parser type name for CLI consumers. */
export type { ParsedConfigurationArguments as ParsedEnvironmentArguments } from '../../src/configArguments';

/** Describes the package manifest fields required by the global CLI. */
export interface PackageManifest {
  version?: unknown;
}
