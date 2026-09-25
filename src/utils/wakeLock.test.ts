import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWakeLockSupported, requestScreenWakeLock, releaseScreenWakeLock } from './wakeLock';

describe('wakeLock utility', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('isWakeLockSupported', () => {
    it('returns false when navigator.wakeLock is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      expect(isWakeLockSupported()).toBe(false);
    });

    it('returns true when navigator.wakeLock.request is a function', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: vi.fn(),
          },
        },
        writable: true,
        configurable: true,
      });
      expect(isWakeLockSupported()).toBe(true);
    });
  });

  describe('requestScreenWakeLock', () => {
    it('returns null if wakeLock is not supported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      const sentinel = await requestScreenWakeLock();
      expect(sentinel).toBeNull();
    });

    it('returns WakeLockSentinel on success', async () => {
      const mockSentinel = { released: false, release: vi.fn(), addEventListener: vi.fn() };
      const requestMock = vi.fn().mockResolvedValue(mockSentinel);

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: requestMock,
          },
        },
        writable: true,
        configurable: true,
      });

      const sentinel = await requestScreenWakeLock();
      expect(requestMock).toHaveBeenCalledWith('screen');
      expect(sentinel).toBe(mockSentinel);
    });

    it('catches error and returns null when request fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const requestMock = vi.fn().mockRejectedValue(new Error('NotAllowedError'));

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: requestMock,
          },
        },
        writable: true,
        configurable: true,
      });

      const sentinel = await requestScreenWakeLock();
      expect(sentinel).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('releaseScreenWakeLock', () => {
    it('does nothing if sentinel is null', async () => {
      await expect(releaseScreenWakeLock(null)).resolves.not.toThrow();
    });

    it('calls release if sentinel is not released', async () => {
      const mockSentinel = { released: false, release: vi.fn().mockResolvedValue(undefined) };
      await releaseScreenWakeLock(mockSentinel as any);
      expect(mockSentinel.release).toHaveBeenCalled();
    });

    it('does not call release if sentinel is already released', async () => {
      const mockSentinel = { released: true, release: vi.fn() };
      await releaseScreenWakeLock(mockSentinel as any);
      expect(mockSentinel.release).not.toHaveBeenCalled();
    });

    it('catches error if release fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSentinel = { released: false, release: vi.fn().mockRejectedValue(new Error('Release error')) };
      await releaseScreenWakeLock(mockSentinel as any);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
