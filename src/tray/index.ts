import { TRAY_ICON_SIZE, TRAY_STATUS_STYLES, TRAY_STATUS_SYMBOLS } from './constants';
import type {
  NativeImageFactory,
  TrayController,
  TrayDependencies,
  TrayMenu,
  TrayMenuTemplate,
  TrayStatus,
} from './types';

/**
 * @function createTrayIcon
 * @description Creates a colored circular status bar image as a Base64 SVG data URL.
 * The generated image is intentionally small and dependency-free so the monitor
 * can use it without shipping a separate image asset.
 *
 * @param nativeImage - Electron's native image factory.
 * @param status - Status whose color should be rendered.
 * @returns A native image containing the colored status circle.
 * @throws Throws when Electron cannot create a native image from the generated data URL.
 */
function createTrayIcon(
  nativeImage: NativeImageFactory,
  status: TrayStatus,
): ReturnType<NativeImageFactory['createFromDataURL']> {
  const { color } = TRAY_STATUS_STYLES[status];
  const center = TRAY_ICON_SIZE / 2;
  const radius = center - 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TRAY_ICON_SIZE}" height="${TRAY_ICON_SIZE}"><circle cx="${center}" cy="${center}" r="${radius}" fill="${color}"/></svg>`;
  const encodedSvg = Buffer.from(svg, 'utf8').toString('base64');
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${encodedSvg}`);
}

/**
 * @function createTrayMenu
 * @description Builds the status menu shown when the status bar icon is clicked.
 * The quit item invokes the caller's lifecycle callback so Electron shutdown remains
 * controlled by the application bootstrap.
 *
 * @param menu - Electron's menu factory.
 * @param status - Current status to display in the menu.
 * @param onQuit - Callback used to request application shutdown.
 * @returns A menu built from the current status template.
 * @throws Does not throw; menu construction is delegated to Electron.
 */
function createTrayMenu(
  menu: TrayDependencies['menu'],
  status: TrayStatus,
  onQuit: TrayDependencies['onQuit'],
): TrayMenu {
  const { label } = TRAY_STATUS_STYLES[status];
  const template: TrayMenuTemplate = [
    { label: 'Mac Idle Keeper', enabled: false },
    { label: `Status: ${label}`, enabled: false },
    { type: 'separator' },
    { label: 'Quit', click: onQuit },
  ];
  return menu.buildFromTemplate(template);
}

/**
 * @function createTray
 * @description Creates a macOS status bar indicator for the monitor lifecycle.
 * The icon starts gray, turns green while the monitor is inside its schedule,
 * yellow outside the schedule, and red when a check fails.
 *
 * @param dependencies - Electron adapters and the application quit callback.
 * @returns A controller for updating or destroying the status bar indicator.
 * @throws Throws when Electron cannot create the tray icon or its context menu.
 *
 * @example
 * const tray = createTray({
 *   trayConstructor: Tray,
 *   nativeImage,
 *   menu: Menu,
 *   onQuit: () => app.quit(),
 * });
 * tray.setStatus('in-schedule');
 */
export function createTray(dependencies: TrayDependencies): TrayController {
  let currentStatus: TrayStatus = 'starting';
  let destroyed = false;
  const tray = new dependencies.trayConstructor(
    createTrayIcon(dependencies.nativeImage, currentStatus),
  );

  /**
   * @function updateTrayPresentation
   * @description Applies the current status image, tooltip, and context menu to the tray.
   *
   * @returns Nothing.
   * @throws Throws when an Electron tray update fails.
   */
  function updateTrayPresentation(): void {
    const { label } = TRAY_STATUS_STYLES[currentStatus];
    const icon = createTrayIcon(dependencies.nativeImage, currentStatus);
    tray.setImage(icon);
    const iconIsEmpty = typeof icon.isEmpty === 'function' && icon.isEmpty();
    tray.setTitle(iconIsEmpty ? TRAY_STATUS_SYMBOLS[currentStatus] : '');
    tray.setToolTip(`Mac Idle Keeper — ${label}`);
    tray.setContextMenu(createTrayMenu(dependencies.menu, currentStatus, dependencies.onQuit));
  }

  updateTrayPresentation();

  return {
    /**
     * @method setStatus
     * @description Updates the icon and menu to reflect the monitor's latest state.
     *
     * @param status - New visual status for the tray indicator.
     * @returns Nothing.
     * @throws Does not throw after destruction; updates are ignored once the tray is destroyed.
     */
    setStatus(status: TrayStatus): void {
      if (destroyed) return;
      currentStatus = status;
      updateTrayPresentation();
    },

    /**
     * @method destroy
     * @description Removes the status bar indicator and releases its native resources.
     *
     * @returns Nothing.
     * @throws Does not throw after the first call; destruction is idempotent.
     */
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      tray.destroy();
    },
  };
}

export type {
  TrayController,
  TrayDependencies,
  TrayMenuTemplate,
  TrayStatus,
  TrayStatusStyle,
} from './types';
