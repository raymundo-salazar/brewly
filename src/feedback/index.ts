import { emitKeypressEvents } from 'node:readline';
import { spawnSync } from 'node:child_process';
import { paint } from '../cliOutput';
import { FEEDBACK_OPTIONS } from './constants';
import type {
  FeedbackOpenResult,
  FeedbackOption,
  FeedbackRunOptions,
  FeedbackSelectorStreams,
} from './types';

/**
 * @function formatFeedbackCard
 * @description Creates the full feedback card with the coffee illustration and project information.
 *
 * @param version - Current Brewly version.
 * @returns A terminal-ready feedback card.
 * @throws Does not throw for valid version text.
 */
export function formatFeedbackCard(version: string): string {
  const art = [
    '            )',
    '      .--"(" "--.',
    "    .-|`'-----'`|",
    '    | |         |',
    '    \\ |         |',
    '     `\\         /',
    '       `"-----"`',
  ];
  const body = [
    'Brewly · v' + version,
    '',
    'Thank you for using Brewly!',
    '',
    'Brewly is an open-source project built to make macOS power management simpler and more convenient.',
    "Your experience matters. Whether you've discovered a bug, have an idea for a new feature, or simply want to share your thoughts, we'd love to hear from you.",
    'Every contribution helps make Brewly better for everyone.',
  ].flatMap((line) => wrapText(line, 56));
  const width = 22 + 56 + 2;
  const row = (plain: string, styled: string, index: number): string => {
    const left = art[index] ?? '';
    return `${paint('│', 'yellow')}${left.padEnd(22)}${styled}${' '.repeat(width - 22 - plain.length)}${paint('│', 'yellow')}`;
  };
  const rows = body.map((line, index) => {
    if (index === 0) {
      const title = `Brewly · v${version}`;
      const styledTitle = `${paint(paint('Brewly', 'cyan'), 'bold')} · ${paint(`v${version}`, 'gray')}`;
      return row(title, styledTitle, index);
    }
    if (index === 2) return row(line, paint(line, 'bold'), index);
    return row(line, line, index);
  });
  return [
    paint(`╭${'─'.repeat(width)}╮`, 'yellow'),
    ...rows,
    paint(`╰${'─'.repeat(width)}╯`, 'yellow'),
  ].join('\n');
}

/**
 * @function wrapText
 * @description Wraps text at word boundaries so terminal cards remain compact and readable.
 *
 * @param text - Text to wrap.
 * @param maximumWidth - Maximum number of characters per output line.
 * @returns Wrapped lines, preserving an empty input line as a spacer.
 * @throws Does not throw for valid text and width values.
 */
function wrapText(text: string, maximumWidth: number): string[] {
  if (!text) return [''];
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maximumWidth && current) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * @function printFeedbackHelp
 * @description Prints feedback command usage, options, and available shortcuts.
 *
 * @returns Nothing; help is written to standard output.
 * @throws Does not throw during normal terminal output.
 */
export function printFeedbackHelp(): void {
  console.log('Brewly — Feedback help');
  console.log('');
  console.log('Usage');
  console.log('  brewly feedback [command] [options]');
  console.log('');
  console.log('Commands');
  for (const option of FEEDBACK_OPTIONS)
    console.log(`  ${option.command.padEnd(10)} ${option.label}`);
  console.log('');
  console.log('Options');
  console.log('  --no-open  Do not open the browser; print the selected URL instead.');
  console.log('  --help, -h Show this help.');
}

/**
 * @function runFeedback
 * @description Displays the feedback card, selects a destination, and opens its URL when requested.
 *
 * @param args - Feedback command arguments after `feedback`.
 * @param options - Current version and browser behavior.
 * @returns A promise resolved after interactive selection and browser handling.
 * @throws Does not throw for browser launch failures; they are rendered as readable output.
 */
export async function runFeedback(args: string[], options: FeedbackRunOptions): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    printFeedbackHelp();
    return;
  }
  const noOpen = options.noOpen || args.includes('--no-open');
  const command = args.find((arg) => !arg.startsWith('-'));
  console.log(formatFeedbackCard(options.version));
  console.log('');
  const selected = command
    ? FEEDBACK_OPTIONS.find((option) => option.command === command)
    : await selectFeedbackOption();
  if (selected === null) return;
  if (!selected) {
    printFeedbackOptions();
    return;
  }
  try {
    options.onInteraction?.();
  } catch {
    // Reminder persistence must not prevent the selected feedback destination from opening.
  }
  if (selected.command === 'star')
    console.log(
      '\n★ Thanks for supporting Brewly!\n\n  If Brewly makes your workflow easier,\n  consider giving the project a star on GitHub.\n',
    );
  if (noOpen) {
    console.log(`\x1b[90mYou can open this link manually:\x1b[0m\n${selected.url}`);
    return;
  }
  console.log(`\x1b[36m↗ Opening GitHub in your default browser...\x1b[0m`);
  const result = (options.openLink ?? openFeedbackLink)(selected);
  if (result.opened) {
    console.log(`\x1b[32m✓ ${selected.label} link opened in your default browser.\x1b[0m`);
    console.log('Thanks for supporting Brewly!');
  } else {
    console.log("\x1b[33m⚠ Couldn't open your default browser.\x1b[0m");
    console.log(`You can open this link manually:\n${selected.url}`);
    console.log('\x1b[90mTip: Copy the link above and paste it into your browser.\x1b[0m');
  }
}

/**
 * @function printFeedbackOptions
 * @description Prints the feedback destinations when interactive input is unavailable.
 *
 * @returns Nothing; options are written to standard output.
 * @throws Does not throw during normal terminal output.
 */
function printFeedbackOptions(): void {
  console.log('\nSelect an option:\n');
  FEEDBACK_OPTIONS.forEach((option, index) =>
    console.log(
      `  ${index + 1}. ${option.label}\n     ${option.helper}\n     brewly feedback ${option.command}`,
    ),
  );
}

/**
 * @function selectFeedbackOption
 * @description Prompts for one feedback destination using an arrow-key interactive selector.
 *
 * @returns The selected option, null when cancelled, or undefined when input is unavailable.
 * @throws Does not throw for closed or unavailable standard input.
 */
export async function selectFeedbackOption(
  streams: FeedbackSelectorStreams = { input: process.stdin, output: process.stdout },
): Promise<FeedbackOption | null | undefined> {
  const { input, output } = streams;
  if (!input.isTTY || !output.isTTY) return undefined;
  let selectedIndex = 0;
  let rendered = false;
  const render = (): void => {
    const optionLines = FEEDBACK_OPTIONS.flatMap((option, index) => {
      const marker = index === selectedIndex ? '❯' : ' ';
      const label =
        index === selectedIndex ? paint(paint(option.label, 'cyan'), 'bold') : option.label;
      return [`  ${marker} ${label}`, `      ${paint(option.helper, 'gray')}`];
    });
    const plainLines = ['Select an option (use ↑/↓ and press Enter):', '', ...optionLines];
    const outputLines = plainLines.map((line) => `\x1b[2K${line}`);
    if (rendered) output.write(`\x1b[${outputLines.length - 1}A\r`);
    output.write(outputLines.join('\n'));
    rendered = true;
  };

  emitKeypressEvents(input);
  input.setRawMode(true);
  input.resume();
  render();
  return new Promise<FeedbackOption | null | undefined>((resolve) => {
    const cleanup = (): void => {
      input.setRawMode(false);
      input.pause();
      input.removeListener('keypress', onKeypress);
      output.write('\n\n');
    };
    const finish = (option: FeedbackOption | null | undefined): void => {
      cleanup();
      resolve(option);
    };
    const onKeypress = (_character: string, key: { ctrl?: boolean; name?: string }): void => {
      if (key.ctrl && key.name === 'c') return finish(null);
      if (key.name === 'up')
        selectedIndex = (selectedIndex - 1 + FEEDBACK_OPTIONS.length) % FEEDBACK_OPTIONS.length;
      else if (key.name === 'down') selectedIndex = (selectedIndex + 1) % FEEDBACK_OPTIONS.length;
      else if (key.name === 'return' || key.name === 'enter')
        return finish(FEEDBACK_OPTIONS[selectedIndex]);
      else return;
      render();
    };
    input.on('keypress', onKeypress);
  });
}

/**
 * @function openFeedbackLink
 * @description Opens a feedback URL through macOS default browser handling.
 *
 * @param option - Destination to open.
 * @returns Whether macOS accepted the open request and the selected URL.
 * @throws Does not throw; process failures are represented by `opened: false`.
 */
export function openFeedbackLink(option: FeedbackOption): FeedbackOpenResult {
  const result = spawnSync('open', [option.url], { stdio: 'ignore' });
  return { opened: !result.error && result.status === 0, url: option.url };
}

export type {
  FeedbackOpenResult,
  FeedbackOption,
  FeedbackRunOptions,
  FeedbackSelectorStreams,
} from './types';
