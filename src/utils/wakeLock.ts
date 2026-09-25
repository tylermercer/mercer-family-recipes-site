export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock?.request === 'function';
}

export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (!isWakeLockSupported()) {
    return null;
  }
  try {
    const sentinel = await navigator.wakeLock.request('screen');
    return sentinel;
  } catch (err) {
    console.error('Failed to request screen wake lock:', err);
    return null;
  }
}

export async function releaseScreenWakeLock(sentinel: WakeLockSentinel | null): Promise<void> {
  if (!sentinel) return;
  try {
    if (!sentinel.released) {
      await sentinel.release();
    }
  } catch (err) {
    console.error('Failed to release screen wake lock:', err);
  }
}
