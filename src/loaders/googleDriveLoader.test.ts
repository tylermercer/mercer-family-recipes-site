import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleDriveLoader } from './googleDriveLoader';

// Mock googleapis
const mockList = vi.fn();
const mockExport = vi.fn();

vi.mock('googleapis', () => {
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn().mockImplementation(function (this: any) {
          return {};
        }),
      },
      drive: vi.fn().mockImplementation(function (this: any) {
        return {
          files: {
            list: mockList,
            export: mockExport,
          },
        };
      }),
    },
  };
});

describe('googleDriveLoader', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('logs an error if folderId is not provided in options or environment', async () => {
    const loader = googleDriveLoader({
      folderId: '',
      serviceAccountEmail: 'email@test.com',
      privateKey: 'key',
    });

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fork: vi.fn(),
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
    };

    const mockParseData = vi.fn();

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: mockParseData,
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Google Drive Folder ID is missing.');
    expect(mockStore.clear).not.toHaveBeenCalled();
  });

  it('logs an error if service account credentials are missing', async () => {
    const loader = googleDriveLoader({
      folderId: 'folder-123',
      serviceAccountEmail: '',
      privateKey: '',
    });

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fork: vi.fn(),
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
    };

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: vi.fn(),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Google Service Account credentials (email or private key) are missing.');
  });

  it('allows passing folderId, serviceAccountEmail, and privateKey via loader options', async () => {
    mockList.mockResolvedValue({ data: { files: [] } });

    const loader = googleDriveLoader({
      folderId: 'opt-folder',
      serviceAccountEmail: 'opt-email@test.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\\nopt-key\\n-----END PRIVATE KEY-----',
    });

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fork: vi.fn(),
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
    };

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: vi.fn(),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith('No Google Docs found in the specified folder or its subfolders.');
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('traverses folder and subfolders to load Google Docs into store', async () => {
    // Mock Drive API response logic:
    // Call 1: List subfolders of root-folder -> returns subfolder 'sub-folder-1'
    // Call 2: List docs in root-folder -> returns 'Root Recipe' doc
    // Call 3: List subfolders of sub-folder-1 -> returns no subfolders
    // Call 4: List docs in sub-folder-1 -> returns 'Sub Recipe' doc
    mockList.mockImplementation(async ({ q }) => {
      if (q.includes("'root-folder'") && q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return { data: { files: [{ id: 'sub-folder-1', name: 'Sub Folder 1' }] } };
      }
      if (q.includes("'root-folder'") && q.includes("mimeType = 'application/vnd.google-apps.document'")) {
        return {
          data: {
            files: [
              { id: 'doc-1', name: 'Grandma\'s Chocolate Chip Cookies!', modifiedTime: '2025-01-01T00:00:00Z' },
            ],
          },
        };
      }
      if (q.includes("'sub-folder-1'") && q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return { data: { files: [] } };
      }
      if (q.includes("'sub-folder-1'") && q.includes("mimeType = 'application/vnd.google-apps.document'")) {
        return {
          data: {
            files: [
              { id: 'doc-2', name: 'Pasta Carbonara', modifiedTime: '2025-01-02T00:00:00Z' },
            ],
          },
        };
      }
      return { data: { files: [] } };
    });

    mockExport.mockImplementation(async ({ fileId }) => {
      return { data: `<html><body>Content for ${fileId}</body></html>` };
    });

    const loader = googleDriveLoader({
      folderId: 'root-folder',
      serviceAccountEmail: 'service-account@test.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\\nfake-key\\n-----END PRIVATE KEY-----',
    });

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fork: vi.fn(),
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
      get: vi.fn(),
      has: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn(),
      values: vi.fn(),
      entries: vi.fn(),
    };

    const mockParseData = vi.fn().mockImplementation(async ({ id, data }) => data);
    const mockRenderMarkdown = vi.fn().mockImplementation(async (content) => ({ html: content }));

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: mockParseData,
      renderMarkdown: mockRenderMarkdown,
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockStore.clear).toHaveBeenCalled();

    expect(mockParseData).toHaveBeenCalledWith({
      id: 'grandma-s-chocolate-chip-cookies',
      data: {
        title: "Grandma's Chocolate Chip Cookies!",
        lastModified: new Date('2025-01-01T00:00:00Z'),
      },
    });

    expect(mockStore.set).toHaveBeenCalledWith({
      id: 'grandma-s-chocolate-chip-cookies',
      data: {
        title: "Grandma's Chocolate Chip Cookies!",
        lastModified: new Date('2025-01-01T00:00:00Z'),
      },
      rendered: {
        html: '<html><body>Content for doc-1</body></html>',
      },
    });

    expect(mockParseData).toHaveBeenCalledWith({
      id: 'pasta-carbonara',
      data: {
        title: 'Pasta Carbonara',
        lastModified: new Date('2025-01-02T00:00:00Z'),
      },
    });

    expect(mockStore.set).toHaveBeenCalledWith({
      id: 'pasta-carbonara',
      data: {
        title: 'Pasta Carbonara',
        lastModified: new Date('2025-01-02T00:00:00Z'),
      },
      rendered: {
        html: '<html><body>Content for doc-2</body></html>',
      },
    });

    expect(mockLogger.info).toHaveBeenCalledWith('Google Docs (2) successfully loaded into Content Layer!');
  });

  it('logs a warning when no Google Docs are found', async () => {
    mockList.mockResolvedValue({ data: { files: [] } });

    const loader = googleDriveLoader({
      folderId: 'empty-folder',
      serviceAccountEmail: 'service-account@test.com',
      privateKey: 'private-key',
    });

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fork: vi.fn(),
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
    };

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: vi.fn(),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.warn).toHaveBeenCalledWith('No Google Docs found in the specified folder or its subfolders.');
  });

  it('catches and logs API errors', async () => {
    mockList.mockRejectedValue(new Error('API quota exceeded'));

    const loader = googleDriveLoader({
      folderId: 'error-folder',
      serviceAccountEmail: 'service-account@test.com',
      privateKey: 'private-key',
    });

    const mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
    };

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: vi.fn(),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to load Google Docs: API quota exceeded');
  });
});
