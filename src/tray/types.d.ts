import type { Menu, MenuItemConstructorOptions, NativeImage } from 'electron';

/** Lists the visual states represented by the macOS status bar indicator. */
export type TrayStatus = 'starting' | 'in-schedule' | 'outside-schedule' | 'error';

/** Provides the native image factory used to render the tray indicator. */
export interface NativeImageFactory {
  createFromDataURL(dataURL: string): NativeImage;
}

/** Provides the native tray operations used by the tray controller. */
export interface TrayAdapter {
  destroy(): void;
  setContextMenu(menu: TrayMenu): void;
  setImage(image: NativeImage): void;
  setTitle(title: string): void;
  setToolTip(tooltip: string): void;
}

/** Provides the constructor used to create a native tray item. */
export interface TrayConstructor {
  new (image: NativeImage): TrayAdapter;
}

/** Provides the menu factory used to render the tray context menu. */
export interface MenuFactory {
  buildFromTemplate(template: TrayMenuTemplate): TrayMenu;
}

/** Represents the menu instance attached to a tray item. */
export type TrayMenu = Menu;

/** Provides the Electron APIs required to create and update a status bar item. */
export interface TrayDependencies {
  menu: MenuFactory;
  nativeImage: NativeImageFactory;
  onQuit: () => void;
  trayConstructor: TrayConstructor;
}

/** Exposes lifecycle operations for the status bar indicator. */
export interface TrayController {
  destroy(): void;
  setStatus(status: TrayStatus): void;
}

/** Describes an icon color and human-readable label for a tray status. */
export interface TrayStatusStyle {
  color: string;
  label: string;
}

/** Describes the menu item shape needed by the tray adapter. */
export type TrayMenuTemplate = Array<MenuItemConstructorOptions>;
