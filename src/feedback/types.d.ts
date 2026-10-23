/** Describes one feedback destination shown in the interactive menu. */
export interface FeedbackOption {
  command: string;
  helper: string;
  label: string;
  url: string;
}

/** Configures one feedback command execution. */
export interface FeedbackRunOptions {
  openLink?: (option: FeedbackOption) => FeedbackOpenResult;
  noOpen?: boolean;
  onInteraction?: () => void;
  version: string;
}

/** Describes the terminal streams required by the arrow-key selector. */
export interface FeedbackSelectorStreams {
  input: NodeJS.ReadStream;
  output: NodeJS.WriteStream;
}

/** Describes the result of opening a feedback destination. */
export interface FeedbackOpenResult {
  opened: boolean;
  url: string;
}
