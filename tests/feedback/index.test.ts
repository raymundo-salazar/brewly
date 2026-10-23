import { EventEmitter } from 'node:events';
import { FEEDBACK_OPTIONS } from '../../src/feedback/constants';
import {
  formatFeedbackCard,
  printFeedbackHelp,
  runFeedback,
  selectFeedbackOption,
} from '../../src/feedback';

describe('feedback selector', () => {
  test('renders the card and supports direct no-open destinations', async () => {
    const output = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const onInteraction = jest.fn();

    await runFeedback(['bug', '--no-open'], { version: '2.1.4', onInteraction });

    expect(formatFeedbackCard('2.1.4')).toContain('Brewly · v2.1.4');
    expect(output).toHaveBeenCalledWith(expect.stringContaining('issues/new'));
    expect(onInteraction).toHaveBeenCalledTimes(1);
    output.mockRestore();
  });

  test('renders help and the special GitHub star message', async () => {
    const output = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    printFeedbackHelp();
    await runFeedback(['--help'], { version: '2.1.4' });
    await runFeedback(['star', '--no-open'], { version: '2.1.4' });

    expect(output).toHaveBeenCalledWith(expect.stringContaining('Feedback help'));
    expect(output).toHaveBeenCalledWith(expect.stringContaining('Thanks for supporting Brewly'));
    output.mockRestore();
  });

  test('shows the destinations when a command is unknown', async () => {
    const output = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await runFeedback(['unknown', '--no-open'], { version: '2.1.4' });

    expect(output).toHaveBeenCalledWith(expect.stringContaining('Select an option'));
    output.mockRestore();
  });

  test('renders browser success and failure messages', async () => {
    const output = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    await runFeedback(['bug'], {
      version: '2.1.4',
      openLink: (option) => ({ opened: true, url: option.url }),
    });
    await runFeedback(['idea'], {
      version: '2.1.4',
      openLink: (option) => ({ opened: false, url: option.url }),
    });

    expect(output).toHaveBeenCalledWith(expect.stringContaining('link opened'));
    expect(output).toHaveBeenCalledWith(expect.stringContaining("Couldn't open"));
    output.mockRestore();
  });

  test('moves with arrow keys and selects the highlighted destination', async () => {
    const input = new EventEmitter() as unknown as NodeJS.ReadStream;
    const write = jest.fn();
    const output = { isTTY: true, write } as unknown as NodeJS.WriteStream;
    const setRawMode = jest.fn();
    Object.assign(input, {
      isTTY: true,
      setRawMode,
      resume: jest.fn(),
      pause: jest.fn(),
    });

    const selection = selectFeedbackOption({ input, output });
    input.emit('keypress', '', { name: 'down' });
    input.emit('keypress', '', { name: 'down' });
    input.emit('keypress', '', { name: 'return' });

    await expect(selection).resolves.toEqual(FEEDBACK_OPTIONS[2]);
    expect(write).toHaveBeenCalledWith(expect.stringContaining('↑/↓'));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('❯ Suggest a feature'));
    expect(setRawMode).toHaveBeenCalledWith(false);
  });

  test('returns no selection when the terminal is not interactive', async () => {
    const input = { isTTY: false } as NodeJS.ReadStream;
    const output = { isTTY: false } as NodeJS.WriteStream;

    await expect(selectFeedbackOption({ input, output })).resolves.toBeUndefined();
  });

  test('wraps upward and exits safely on Ctrl+C or unsupported keys', async () => {
    const input = new EventEmitter() as unknown as NodeJS.ReadStream;
    const output = { isTTY: true, write: jest.fn() } as unknown as NodeJS.WriteStream;
    Object.assign(input, {
      isTTY: true,
      setRawMode: jest.fn(),
      resume: jest.fn(),
      pause: jest.fn(),
    });

    const selection = selectFeedbackOption({ input, output });
    input.emit('keypress', '', { name: 'up' });
    input.emit('keypress', '', { name: 'pageup' });
    input.emit('keypress', '', { ctrl: true, name: 'c' });

    await expect(selection).resolves.toBeNull();
  });
});
