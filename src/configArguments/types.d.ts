/** Contains parsed configuration overrides and arguments not owned by configuration. */
export interface ParsedConfigurationArguments {
  environment: Record<string, string | undefined>;
  configurationOverrides: Record<string, string>;
  remaining: string[];
  hasExplicitEnvironmentFile: boolean;
}
