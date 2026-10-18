import { DEFAULT_REGISTRY_URL, DEFAULT_TIMEOUT_MS, UPDATE_COMMAND } from './constants';
import { paint } from '../cliOutput';
import type { LatestPackageMetadata, UpdateCheckOptions, UpdateResult } from './types';

/**
 * @function isNewerVersion
 * @description Compares two stable semantic versions and determines whether the candidate is newer.
 *
 * @param currentVersion - The version currently installed.
 * @param candidateVersion - The version returned by the package registry.
 * @returns True when the candidate has a greater major, minor, or patch component.
 * @throws Does not throw; invalid versions are treated as not newer.
 */
function isNewerVersion(currentVersion: string, candidateVersion: string): boolean {
  const current = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  const candidate = candidateVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!current || !candidate) return false;

  for (let index = 1; index <= 3; index += 1) {
    const currentPart = Number(current[index]);
    const candidatePart = Number(candidate[index]);
    if (candidatePart !== currentPart) return candidatePart > currentPart;
  }
  return false;
}

/**
 * @function isLatestPackageMetadata
 * @description Validates the small portion of npm metadata required by the update checker.
 *
 * @param value - Unknown JSON returned by the npm registry.
 * @returns True when the value contains a non-empty version string.
 * @throws Does not throw for any JSON-compatible value.
 */
function isLatestPackageMetadata(value: unknown): value is LatestPackageMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const metadata = value as LatestPackageMetadata;
  return typeof metadata.version === 'string' && metadata.version.length > 0;
}

/**
 * @function checkForUpdate
 * @description Checks npm for a newer stable Brewly version without making the CLI dependent on the network.
 * Network failures, malformed responses, and timeouts return no update so normal commands remain available.
 *
 * @param currentVersion - The version installed locally.
 * @param options - Optional registry URL, timeout, and request implementation for deterministic tests.
 * @returns The available update details, or null when no update can be confirmed.
 * @throws Does not throw for registry or parsing failures; they are treated as unavailable checks.
 *
 * @example
 * const update = await checkForUpdate('2.1.3');
 */
export async function checkForUpdate(
  currentVersion: string,
  options: UpdateCheckOptions = {},
): Promise<UpdateResult | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const fetcher = options.fetcher ?? fetch;

  try {
    const response = await fetcher(options.registryUrl ?? DEFAULT_REGISTRY_URL, {
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const metadata = await response.json();
    if (!isLatestPackageMetadata(metadata)) return null;
    const latestVersion = metadata.version;
    if (typeof latestVersion !== 'string') return null;
    if (!isNewerVersion(currentVersion, latestVersion)) return null;
    return { command: UPDATE_COMMAND, currentVersion, latestVersion };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @function formatUpdateNotice
 * @description Formats an available update as a concise human-readable CLI message.
 *
 * @param update - Available update details.
 * @returns The update message and installation command.
 * @throws Does not throw for a valid update result.
 */
export function formatUpdateNotice(update: UpdateResult): string {
  const innerWidth = 64;
  const artWidth = 22;
  const art = [
    '            )',
    '      .--"(" "--.',
    "    .-|`'-----'`|",
    '    | |         |',
    '    \\ |         |',
    '     `\\         /',
    '       `"-----"`',
  ];
  const versions = `${update.currentVersion}  →  ${update.latestVersion}`;
  const row = (left: string, right = '', styledRight = right): string => {
    const leftSegment = left.padEnd(artWidth, ' ');
    const rightPadding = ' '.repeat(innerWidth - artWidth - right.length);
    return `${paint('│', 'yellow')}${paint(leftSegment, 'gray')}${styledRight}${rightPadding}${paint('│', 'yellow')}`;
  };
  const styledVersions = `${paint(update.currentVersion, 'gray')}  ${paint('→', 'gray')}  ${paint(paint(update.latestVersion, 'cyan'), 'bold')}`;

  return [
    paint(`╭${'─'.repeat(innerWidth)}╮`, 'yellow'),
    row(''),
    row(art[0]!, 'BREWLY', paint(paint('BREWLY', 'cyan'), 'bold')),
    row(art[1]!),
    row(art[2]!, 'A fresh update is ready!', paint('A fresh update is ready!', 'gray')),
    row(art[3]!, versions, styledVersions),
    row(art[4]!),
    row(art[5]!, update.command, paint(paint(update.command, 'gray'), 'bold')),
    row(art[6]!),
    row(''),
    paint(`╰${'─'.repeat(innerWidth)}╯`, 'yellow'),
  ].join('\n');
}

export type { UpdateCheckOptions, UpdateResponse, UpdateResult } from './types';
