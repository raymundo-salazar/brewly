/** Lists the management commands supported by the LaunchAgent CLI. */
export type LaunchAgentCommand =
  | 'help'
  | '--help'
  | '-h'
  | 'status'
  | 'start'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'restart'
  | 'uninstall';
