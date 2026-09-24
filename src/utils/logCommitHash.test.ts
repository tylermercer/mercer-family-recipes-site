import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import logCommitHash from './logCommitHash';

describe('logCommitHash', () => {
  const originalEnv = import.meta.env.PUBLIC_COMMIT_HASH;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalEnv !== undefined) {
      import.meta.env.PUBLIC_COMMIT_HASH = originalEnv;
    } else {
      delete import.meta.env.PUBLIC_COMMIT_HASH;
    }
  });

  it('logs the truncated version when PUBLIC_COMMIT_HASH is defined', () => {
    import.meta.env.PUBLIC_COMMIT_HASH = '1234567890abcdef';
    logCommitHash();
    expect(console.log).toHaveBeenCalledWith('Version: 12345678');
  });

  it('logs [no version] when PUBLIC_COMMIT_HASH is undefined', () => {
    delete import.meta.env.PUBLIC_COMMIT_HASH;
    logCommitHash();
    expect(console.log).toHaveBeenCalledWith('Version: [no version]');
  });
});
