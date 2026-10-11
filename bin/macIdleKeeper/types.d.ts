/** Contains parsed child-process environment and remaining CLI arguments. */
export interface ParsedEnvironmentArguments {
  environment: NodeJS.ProcessEnv;
  remaining: string[];
}
