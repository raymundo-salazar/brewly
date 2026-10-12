import { createTray } from '../../src/tray';
import type { TrayDependencies } from '../../src/tray';

describe('Tray', () => {
  test('creates a gray indicator and updates colors and labels by status', () => {
    const trayInstances: Array<{
      images: Array<{ dataUrl: string }>;
      titles: string[];
      tooltips: string[];
      menus: unknown[];
    }> = [];
    const nativeImage = {
      createFromDataURL: jest.fn((dataUrl: string) => ({ dataUrl })),
    };
    const menu = {
      buildFromTemplate: jest.fn((template: unknown[]) => ({ template })),
    };
    class FakeTray {
      readonly images: Array<{ dataUrl: string }> = [];
      readonly titles: string[] = [];
      readonly tooltips: string[] = [];
      readonly menus: unknown[] = [];

      constructor(image: { dataUrl: string }) {
        this.images.push(image);
        trayInstances.push(this);
      }

      setImage(image: { dataUrl: string }): void {
        this.images.push(image);
      }

      setToolTip(tooltip: string): void {
        this.tooltips.push(tooltip);
      }

      setTitle(title: string): void {
        this.titles.push(title);
      }

      setContextMenu(contextMenu: unknown): void {
        this.menus.push(contextMenu);
      }

      destroy(): void {
        return undefined;
      }
    }
    const dependencies = {
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onQuit: jest.fn(),
    } as unknown as TrayDependencies;

    const controller = createTray(dependencies);
    controller.setStatus('in-schedule');
    controller.setStatus('outside-schedule');
    controller.setStatus('error');

    const tray = trayInstances[0];
    expect(tray).toBeDefined();
    const startingImage = tray?.images[0]?.dataUrl ?? '';
    const errorImage = tray?.images.at(-1)?.dataUrl ?? '';
    expect(startingImage).toContain('data:image/svg+xml;base64,');
    expect(errorImage).toContain('data:image/svg+xml;base64,');
    expect(Buffer.from(startingImage.split(',')[1] ?? '', 'base64').toString()).toContain(
      '#808080',
    );
    expect(Buffer.from(errorImage.split(',')[1] ?? '', 'base64').toString()).toContain('#FF3B30');
    expect(tray?.tooltips).toEqual([
      'Mac Idle Keeper — Starting',
      'Mac Idle Keeper — In schedule',
      'Mac Idle Keeper — Outside schedule',
      'Mac Idle Keeper — Error',
    ]);
    expect(tray?.titles).toEqual(['', '', '', '']);
    expect(menu.buildFromTemplate).toHaveBeenCalledTimes(4);
  });

  test('builds a quit menu action and ignores updates after destruction', () => {
    let trayDestroyed = false;
    const onQuit = jest.fn();
    const menuItems: unknown[][] = [];
    const nativeImage = {
      createFromDataURL: jest.fn((dataUrl: string) => ({ dataUrl })),
    };
    const menu = {
      buildFromTemplate: jest.fn((template: unknown[]) => {
        menuItems.push(template);
        return { template };
      }),
    };
    class FakeTray {
      destroyed = false;

      setImage(): void {
        return undefined;
      }

      setToolTip(): void {
        return undefined;
      }

      setTitle(): void {
        return undefined;
      }

      setContextMenu(): void {
        return undefined;
      }

      destroy(): void {
        this.destroyed = true;
        trayDestroyed = true;
      }
    }
    const dependencies = {
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onQuit,
    } as unknown as TrayDependencies;

    const controller = createTray(dependencies);
    const items = menuItems[0];
    const quitItem = items?.[3] as { click?: () => void } | undefined;
    quitItem?.click?.();
    controller.destroy();
    controller.destroy();
    controller.setStatus('in-schedule');

    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(trayDestroyed).toBe(true);
    expect(menu.buildFromTemplate).toHaveBeenCalledTimes(1);
  });

  test('uses a visible colored circle symbol when the native icon is empty', () => {
    let title = '';
    const nativeImage = {
      createFromDataURL: jest.fn(() => ({ isEmpty: (): boolean => true })),
    };
    const menu = {
      buildFromTemplate: jest.fn(() => ({})),
    };
    class FakeTray {
      setImage(): void {
        return undefined;
      }

      setTitle(value: string): void {
        title = value;
      }

      setToolTip(): void {
        return undefined;
      }

      setContextMenu(): void {
        return undefined;
      }

      destroy(): void {
        return undefined;
      }
    }
    const dependencies = {
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onQuit: jest.fn(),
    } as unknown as TrayDependencies;

    const controller = createTray(dependencies);
    expect(title).toBe('🔘');
    controller.setStatus('in-schedule');
    expect(title).toBe('🟢');
    controller.setStatus('outside-schedule');
    expect(title).toBe('🟡');
    controller.setStatus('error');
    expect(title).toBe('🔴');
  });
});
