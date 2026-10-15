/** Describes the child process operations required by the awake guard. */
export interface ProcessHandle {
  once(event: string, listener: (...args: unknown[]) => void): this;
  kill(signal?: NodeJS.Signals): boolean;
}

/** Creates a child process for the awake assertion. */
export type SpawnProcess = (
  command: string,
  args: string[],
  options: { stdio: 'ignore' },
) => ProcessHandle;

/** Controls the awake assertion lifecycle. */
export interface AwakeGuard {
  setActive(active: boolean): void;
  stop(): void;
}

/** Provides injectable process and logging adapters for the awake guard. */
export interface AwakeDependencies {
  spawnProcess?: SpawnProcess;
  log?: (message: string) => void;
}
