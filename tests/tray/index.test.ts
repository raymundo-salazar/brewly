import { createTray } from '../../src/tray';
import type { TrayDependencies } from '../../src/tray';

describe('Tray', () => {
  test('loads the optimized icon asset and updates labels by status', () => {
    const trayInstances: Array<{
      images: Array<{ dataUrl: string }>;
      titles: string[];
      tooltips: string[];
      menus: unknown[];
    }> = [];
    const nativeImage = {
      createFromBuffer: jest.fn((buffer: Buffer) => ({
        buffer,
        addRepresentation: jest.fn(),
      })),
      createFromDataURL: jest.fn((dataUrl: string) => ({ dataUrl })),
      createFromNamedImage: jest.fn((imageName: string) => ({
        imageName,
        resize: jest.fn(() => ({ setTemplateImage: jest.fn() })),
      })),
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
      locale: 'en-US',
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onPause: jest.fn(),
      onResume: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
    } as unknown as TrayDependencies;

    const controller = createTray(dependencies);
    controller.setStatus('in-schedule');
    controller.setStatus('outside-schedule');
    controller.setStatus('error');

    const tray = trayInstances[0];
    expect(tray).toBeDefined();
    expect(nativeImage.createFromBuffer).toHaveBeenCalledTimes(5);
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
    const onStop = jest.fn();
    const menuItems: unknown[][] = [];
    const nativeImage = {
      createFromBuffer: jest.fn((buffer: Buffer) => ({
        buffer,
        addRepresentation: jest.fn(),
      })),
      createFromDataURL: jest.fn((dataUrl: string) => ({ dataUrl })),
      createFromNamedImage: jest.fn((imageName: string) => ({
        imageName,
        resize: jest.fn(() => ({ setTemplateImage: jest.fn() })),
      })),
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
      locale: 'en-US',
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onPause: jest.fn(),
      onResume: jest.fn(),
      onStart: jest.fn(),
      onStop,
    } as unknown as TrayDependencies;

    const controller = createTray(dependencies);
    const items = menuItems[0];
    const stopItem = items?.[4] as { click?: () => void } | undefined;
    stopItem?.click?.();
    controller.destroy();
    controller.destroy();
    controller.setStatus('in-schedule');

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(trayDestroyed).toBe(true);
    expect(menu.buildFromTemplate).toHaveBeenCalledTimes(1);
  });

  test('uses a visible symbol when the native icon is empty', () => {
    let title = '';
    const nativeImage = {
      createFromBuffer: jest.fn((buffer: Buffer) => ({
        buffer,
        addRepresentation: jest.fn(),
        isEmpty: (): boolean => true,
      })),
      createFromDataURL: jest.fn((dataUrl: string) => ({ dataUrl })),
      createFromNamedImage: jest.fn((imageName: string) => ({
        imageName,
        resize: jest.fn(() => ({ setTemplateImage: jest.fn() })),
      })),
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
      locale: 'en-US',
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onPause: jest.fn(),
      onResume: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
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

  test('localizes menu actions and uses the light pause asset', () => {
    const menuTemplates: unknown[][] = [];
    const nativeImage = {
      createFromBuffer: jest.fn((buffer: Buffer) => ({
        buffer,
        addRepresentation: jest.fn(),
      })),
      createFromDataURL: jest.fn((dataUrl: string) => ({ dataUrl })),
      createFromNamedImage: jest.fn((imageName: string) => ({
        imageName,
        resize: jest.fn(() => ({ setTemplateImage: jest.fn() })),
      })),
    };
    const menu = {
      buildFromTemplate: jest.fn((template: unknown[]) => {
        menuTemplates.push(template);
        return {};
      }),
    };
    class FakeTray {
      setImage(): void {
        return undefined;
      }

      setTitle(): void {
        return undefined;
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
    const onPause = jest.fn();
    const onResume = jest.fn();
    const onStart = jest.fn();
    const onStop = jest.fn();
    const dependencies = {
      locale: 'es-MX',
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onPause,
      onResume,
      onStart,
      onStop,
    } as unknown as TrayDependencies;

    const controller = createTray(dependencies);
    controller.setStatus('paused');

    const pausedTemplate = menuTemplates.at(-1) as Array<{
      enabled?: boolean;
      label?: string;
    }>;
    expect(pausedTemplate[0]?.label).toBe('Mac Idle Keeper');
    expect(pausedTemplate[1]?.label).toBe('Estado: Pausado');
    expect(pausedTemplate[3]).toEqual(expect.objectContaining({ label: 'Reanudar' }));
    expect(pausedTemplate[4]).toEqual(expect.objectContaining({ label: 'Detener' }));
    expect(pausedTemplate).toHaveLength(5);
    expect(nativeImage.createFromNamedImage).toHaveBeenCalledWith('pause.fill');
    expect(nativeImage.createFromNamedImage).toHaveBeenCalledWith('play.fill');
    expect(nativeImage.createFromNamedImage).toHaveBeenCalledWith('stop.fill');
    expect(nativeImage.createFromBuffer).toHaveBeenCalledTimes(3);
  });

  test('shows only start while stopped', () => {
    const menuTemplates: unknown[][] = [];
    const nativeImage = {
      createFromBuffer: jest.fn((buffer: Buffer) => ({
        buffer,
        addRepresentation: jest.fn(),
      })),
      createFromNamedImage: jest.fn((imageName: string) => ({
        imageName,
        resize: jest.fn(() => ({ setTemplateImage: jest.fn() })),
      })),
    };
    const menu = {
      buildFromTemplate: jest.fn((template: unknown[]) => {
        menuTemplates.push(template);
        return {};
      }),
    };
    class FakeTray {
      setImage(): void {
        return undefined;
      }

      setTitle(): void {
        return undefined;
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

    const controller = createTray({
      locale: 'en-US',
      trayConstructor: FakeTray,
      nativeImage,
      menu,
      onPause: jest.fn(),
      onResume: jest.fn(),
      onStart: jest.fn(),
      onStop: jest.fn(),
    } as unknown as TrayDependencies);
    controller.setStatus('stopped');

    const stoppedTemplate = menuTemplates.at(-1) as Array<{ label?: string }>;
    expect(stoppedTemplate.map((item) => item.label).filter(Boolean)).toEqual([
      'Mac Idle Keeper',
      'Status: Stopped',
      'Start',
    ]);
  });
});
