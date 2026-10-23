import { paint } from '../cliOutput';
import { NOTICE_ART, NOTICE_ART_WIDTH, NOTICE_WIDTH } from './constants';
import type { NoticeContent } from './types';

/**
 * @function formatNotice
 * @description Renders a Brewly notice with a yellow border, neutral artwork, and semantic text emphasis.
 *
 * @param content - Message, detail, and action content shown inside the notice.
 * @returns A terminal-ready notice card.
 * @throws Does not throw for valid notice content.
 *
 * @example
 * formatNotice({ message: 'A fresh update is ready!', command: 'brewly@latest' });
 */
export function formatNotice(content: NoticeContent): string {
  const detail =
    content.currentVersion && content.latestVersion
      ? `${content.currentVersion}  →  ${content.latestVersion}`
      : (content.detail ?? '');
  const contentWidth = Math.max(
    NOTICE_WIDTH - NOTICE_ART_WIDTH,
    content.message.length,
    detail.length,
    content.command.length,
  );
  const noticeWidth = NOTICE_ART_WIDTH + contentWidth;
  const row = (
    left: string,
    right = '',
    style: (line: string) => string = (line) => line,
  ): string => {
    const leftSegment = left.padEnd(NOTICE_ART_WIDTH, ' ');
    const rightPadding = ' '.repeat(contentWidth - right.length);
    return `${paint('│', 'yellow')}${paint(leftSegment, 'gray')}${style(right)}${rightPadding}${paint('│', 'yellow')}`;
  };
  const detailStyle = (line: string): string => {
    if (!content.currentVersion || !content.latestVersion) return paint(line, 'gray');
    return `${paint(content.currentVersion, 'gray')}  ${paint('→', 'gray')}  ${paint(paint(content.latestVersion, 'cyan'), 'bold')}`;
  };

  return [
    paint(`╭${'─'.repeat(noticeWidth)}╮`, 'yellow'),
    row(''),
    row(NOTICE_ART[0]!, 'BREWLY', (line) => paint(paint(line, 'cyan'), 'bold')),
    row(NOTICE_ART[1]!),
    row(NOTICE_ART[2]!, content.message, (line) => paint(line, 'gray')),
    row(NOTICE_ART[3]!, detail, detailStyle),
    row(NOTICE_ART[4]!),
    row(NOTICE_ART[5]!, content.command, (line) => paint(paint(line, 'gray'), 'bold')),
    row(NOTICE_ART[6]!),
    row(''),
    paint(`╰${'─'.repeat(noticeWidth)}╯`, 'yellow'),
  ].join('\n');
}

export type { NoticeContent } from './types';
