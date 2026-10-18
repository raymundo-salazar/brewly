/** The npm package name used for registry lookups and update instructions. */
export const PACKAGE_NAME = 'brewly';

/** The npm registry endpoint that exposes the latest published package metadata. */
export const DEFAULT_REGISTRY_URL = `https://registry.npmjs.org/${PACKAGE_NAME}/latest`;

/** Maximum time allowed for an update check before it is silently skipped. */
export const DEFAULT_TIMEOUT_MS = 1500;

/** The command users can run to install the latest global package version. */
export const UPDATE_COMMAND = `npm install --global ${PACKAGE_NAME}@latest`;
