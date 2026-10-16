import fs from 'node:fs';
import path from 'node:path';
import { header, info, item, section, success } from '../../src/cliOutput';

const packageJsonPaths = [
  path.resolve(__dirname, '..', '..', 'package.json'),
  path.resolve(__dirname, '..', '..', '..', 'package.json'),
];

/**
 * @function resolvePackageJsonPath
 * @description Resolves package.json from either the TypeScript source tree or compiled dist tree.
 *
 * @returns The existing package.json path.
 * @throws Throws when package.json cannot be found in either supported tree layout.
 */
function resolvePackageJsonPath(): string {
  const packageJsonPath = packageJsonPaths.find((candidate) => fs.existsSync(candidate));
  if (!packageJsonPath) throw new Error('Unable to locate package.json.');
  return packageJsonPath;
}

/**
 * @function readPackageMetadata
 * @description Reads the package name and version used to build local installation instructions.
 *
 * @returns The package metadata required by the local packaging message.
 * @throws Throws when package.json cannot be read or contains invalid JSON.
 */
function readPackageMetadata(): { name: string; version: string } {
  const packageJson = JSON.parse(fs.readFileSync(resolvePackageJsonPath(), 'utf8')) as {
    name?: unknown;
    version?: unknown;
  };
  if (typeof packageJson.name !== 'string' || typeof packageJson.version !== 'string')
    throw new Error('package.json must define a package name and version.');
  return { name: packageJson.name, version: packageJson.version };
}

/**
 * @function main
 * @description Prints human-readable instructions for installing the tarball created by npm pack.
 *
 * @returns Nothing; the instructions are written to the terminal.
 * @throws Throws when package metadata cannot be read.
 *
 * @example
 * // pnpm pack:local
 */
export function main(): void {
  const { name, version } = readPackageMetadata();
  const tarballName = `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`;

  header('Brewly — Local package ready');
  success(`Tarball created: ${tarballName}`);
  section('To test the local CLI');
  item(`npm install --global ./${tarballName}`);
  item('brewly help');
  item('brewly agent status');
  info('Remove after testing', `npm uninstall --global ${name}`);
}

if (require.main === module) {
  try {
    main();
  } catch (cause: unknown) {
    header('Brewly — Local package error');
    console.error(`Unable to prepare local installation instructions: ${String(cause)}`);
    process.exitCode = 1;
  }
}
