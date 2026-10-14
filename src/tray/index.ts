import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { getTrayTranslations } from '../i18n';
import {
  TRAY_ACTION_ICONS,
  TRAY_PAUSE_ASSET,
  TRAY_MENU_ICON_SIZE,
  TRAY_STATUS_ASSETS,
  TRAY_STATUS_SYMBOLS,
} from './constants';
import type {
  NativeImageFactory,
  TrayAction,
  TrayController,
  TrayDependencies,
  TrayMenu,
  TrayMenuTemplate,
  TrayStatus,
} from './types';

/**
 * @function resolveTrayAssetDirectory
 * @description Resolves the source-tree or compiled-package location of tray assets.
 * Jest executes source modules directly, while the packaged monitor executes
 * compiled modules from `dist`.
 *
 * @returns The directory containing the packaged tray image assets.
 * @throws Does not throw; each asset path is validated when it is read.
 */
function resolveTrayAssetDirectory(): string {
  const sourceAssetDirectory = path.resolve(__dirname, '..', '..', 'assets', 'tray');
  if (existsSync(sourceAssetDirectory)) return sourceAssetDirectory;
  return path.resolve(__dirname, '..', '..', '..', 'assets', 'tray');
}

/**
 * @function createTrayIcon
 * @description Loads the @1x PNG asset and adds its @2x representation so macOS
 * can select the appropriate resolution for the current display.
 *
 * @param nativeImage - Electron's native image factory.
 * @param status - Status whose packaged PNG assets should be loaded.
 * @returns A native image containing @1x and @2x representations.
 * @throws Throws when an icon asset cannot be read or decoded.
 */
function createTrayIcon(
  nativeImage: NativeImageFactory,
  status: TrayStatus,
): ReturnType<NativeImageFactory['createFromDataURL']> {
  const assetDirectory = resolveTrayAssetDirectory();
  const asset = status === 'paused' ? TRAY_PAUSE_ASSET : TRAY_STATUS_ASSETS[status];
  const image = nativeImage.createFromBuffer(
    readFileSync(path.join(assetDirectory, asset.standard)),
  );
  image.addRepresentation({
    scaleFactor: 2,
    buffer: readFileSync(path.join(assetDirectory, asset.retina)),
    width: 32,
    height: 32,
  });
  return image;
}

/**
 * @function createTrayMenuIcon
 * @description Creates a compact macOS template icon for a lifecycle action.
 * Template images are automatically rendered black in light appearance and white
 * in dark appearance by macOS.
 *
 * @param nativeImage - Electron's native image factory.
 * @param action - Lifecycle action represented by the icon.
 * @returns A 12×12 template image suitable for a menu item.
 * @throws Throws when Electron cannot create or resize the named system image.
 */
function createTrayMenuIcon(
  nativeImage: NativeImageFactory,
  action: TrayAction,
): ReturnType<NativeImageFactory['createFromNamedImage']> {
  const icon = nativeImage
    .createFromNamedImage(TRAY_ACTION_ICONS[action])
    .resize({ width: TRAY_MENU_ICON_SIZE, height: TRAY_MENU_ICON_SIZE });
  icon.setTemplateImage(true);
  return icon;
}

/**
 * @function createTrayMenu
 * @description Builds the status menu shown when the status bar icon is clicked.
 * Pause and stop preserve the Electron process while disabling monitoring. Start
 * and resume re-enable monitoring from the current process.
 *
 * @param menu - Electron's menu factory.
 * @param status - Current status to display in the menu.
 * @param dependencies - Tray callbacks and locale information.
 * @returns A menu built from the current status template.
 * @throws Does not throw; menu construction is delegated to Electron.
 */
function createTrayMenu(
  menu: TrayDependencies['menu'],
  status: TrayStatus,
  dependencies: TrayDependencies,
): TrayMenu {
  const translations = getTrayTranslations(dependencies.locale);
  const pauseIcon = createTrayMenuIcon(dependencies.nativeImage, 'pause');
  const resumeIcon = createTrayMenuIcon(dependencies.nativeImage, 'resume');
  const startIcon = createTrayMenuIcon(dependencies.nativeImage, 'start');
  const stopIcon = createTrayMenuIcon(dependencies.nativeImage, 'stop');
  const lifecycleItems: TrayMenuTemplate =
    status === 'stopped'
      ? [
          {
            label: translations.menu.start,
            icon: startIcon,
            click: dependencies.onStart,
          },
        ]
      : status === 'paused'
        ? [
            {
              label: translations.menu.resume,
              icon: resumeIcon,
              click: dependencies.onResume,
            },
            {
              label: translations.menu.stop,
              icon: stopIcon,
              click: dependencies.onStop,
            },
          ]
        : [
            {
              label: translations.menu.pause,
              icon: pauseIcon,
              click: dependencies.onPause,
            },
            {
              label: translations.menu.stop,
              icon: stopIcon,
              click: dependencies.onStop,
            },
          ];
  const template: TrayMenuTemplate = [
    { label: translations.appName, enabled: false },
    {
      label: `${translations.statusPrefix}: ${translations.status[status]}`,
      enabled: false,
    },
    { type: 'separator' },
    ...lifecycleItems,
  ];
  return menu.buildFromTemplate(template);
}

/**
 * @function createTray
 * @description Creates a macOS status bar indicator for the monitor lifecycle.
 * The indicator uses transparent @1x and @2x PNG assets for the corresponding states.
 *
 * @param dependencies - Electron adapters, locale, and lifecycle callbacks.
 * @returns A controller for updating or destroying the status bar indicator.
 * @throws Throws when Electron cannot create the tray icon or its context menu.
 *
 * @example
 * const tray = createTray({ ...dependencies });
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
    const translations = getTrayTranslations(dependencies.locale);
    const icon = createTrayIcon(dependencies.nativeImage, currentStatus);
    tray.setImage(icon);
    const iconIsEmpty = typeof icon.isEmpty === 'function' && icon.isEmpty();
    tray.setTitle(iconIsEmpty ? TRAY_STATUS_SYMBOLS[currentStatus] : '');
    tray.setToolTip(`${translations.appName} — ${translations.status[currentStatus]}`);
    tray.setContextMenu(createTrayMenu(dependencies.menu, currentStatus, dependencies));
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
  TrayAction,
  TrayIconStatus,
  TrayMenuTemplate,
  TrayStatus,
} from './types';
