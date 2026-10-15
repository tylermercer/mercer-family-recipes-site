// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { googleDriveLoader } from './googleDriveLoader';

// Mock word-extractor using a class
vi.mock('word-extractor', () => {
  return {
    default: class MockWordExtractor {
      async extract(buffer: Buffer) {
        if (buffer.toString() === 'corrupted-doc-buffer') {
          throw new Error('WordExtractor parse error');
        }
        return {
          getBody: () => '# Converted DOC Text Content',
        };
      }
    },
  };
});

// Mock mammoth and turndown
vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn().mockImplementation(async () => ({
      value: '<h1>Converted DOCX HTML</h1>',
      messages: [{ message: 'test warning' }],
    })),
  },
}));

vi.mock('turndown', () => {
  return {
    default: vi.fn().mockImplementation(function () {
      return {
        turndown: vi.fn().mockImplementation((html: string) => `# Converted Markdown from HTML`),
      };
    }),
  };
});

// Mock googleapis
const mockList = vi.fn();
const mockExport = vi.fn();
const mockGet = vi.fn();
const mockCopy = vi.fn();
const mockDelete = vi.fn();

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
            get: mockGet,
            copy: mockCopy,
            delete: mockDelete,
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

  it('logs a warning when no documents are found', async () => {
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

    expect(mockLogger.warn).toHaveBeenCalledWith('No documents found in the specified folder or its subfolders.');
  });

  it('traverses folders and loads Google Doc, .docx, and .doc files using word-extractor', async () => {
    mockList.mockImplementation(async ({ q }) => {
      // Subfolder query
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        if (q.includes("'root-folder'")) {
          return { data: { files: [{ id: 'sub-folder-1', name: 'Sub Folder' }] } };
        }
        return { data: { files: [] } };
      }

      // Document query
      if (q.includes("'root-folder'")) {
        return {
          data: {
            files: [
              {
                id: 'doc-gdoc-1',
                name: 'Grandma\'s Cookies',
                mimeType: 'application/vnd.google-apps.document',
                modifiedTime: '2025-01-01T00:00:00Z',
                webViewLink: 'https://docs.google.com/document/d/doc-gdoc-1/edit',
              },
              {
                id: 'doc-docx-2',
                name: 'Chocolate Cake.docx',
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                modifiedTime: '2025-01-02T00:00:00Z',
              },
            ],
          },
        };
      }

      if (q.includes("'sub-folder-1'")) {
        return {
          data: {
            files: [
              {
                id: 'doc-legacy-3',
                name: 'Apple Pie.doc',
                mimeType: 'application/msword',
                modifiedTime: '2025-01-03T00:00:00Z',
              },
            ],
          },
        };
      }

      return { data: { files: [] } };
    });

    mockExport.mockImplementation(async ({ fileId }) => {
      return { data: `# Content for ${fileId}` };
    });

    mockGet.mockImplementation(async () => {
      return { data: new ArrayBuffer(8) };
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
    };

    const mockStore = {
      clear: vi.fn(),
      set: vi.fn(),
    };

    const mockParseData = vi.fn().mockImplementation(async ({ id, data }) => data);
    const mockRenderMarkdown = vi.fn().mockImplementation(async (content) => ({ html: `<p>${content}</p>` }));

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

    // 1. Google Doc
    expect(mockParseData).toHaveBeenCalledWith({
      id: 'grandma-s-cookies',
      data: {
        title: "Grandma's Cookies",
        lastModified: new Date('2025-01-01T00:00:00Z'),
        driveUrl: 'https://docs.google.com/document/d/doc-gdoc-1/edit',
      },
    });

    // 2. .docx file (stripped extension)
    expect(mockGet).toHaveBeenCalledWith({ fileId: 'doc-docx-2', alt: 'media' }, { responseType: 'arraybuffer' });
    expect(mockParseData).toHaveBeenCalledWith({
      id: 'chocolate-cake',
      data: {
        title: 'Chocolate Cake',
        lastModified: new Date('2025-01-02T00:00:00Z'),
        driveUrl: 'https://drive.google.com/file/d/doc-docx-2/view',
      },
    });

    // 3. .doc file parsed with word-extractor (no copy needed)
    expect(mockGet).toHaveBeenCalledWith({ fileId: 'doc-legacy-3', alt: 'media' }, { responseType: 'arraybuffer' });
    expect(mockParseData).toHaveBeenCalledWith({
      id: 'apple-pie',
      data: {
        title: 'Apple Pie',
        lastModified: new Date('2025-01-03T00:00:00Z'),
        driveUrl: 'https://drive.google.com/file/d/doc-legacy-3/view',
      },
    });

    expect(mockStore.set).toHaveBeenCalledTimes(3);
    expect(mockLogger.info).toHaveBeenCalledWith('3/3 documents loaded into Content Layer!');
  });

  it('falls back to Drive API copy-convert if word-extractor fails on a .doc file', async () => {
    mockList.mockImplementation(async ({ q }) => {
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return { data: { files: [] } };
      }
      return {
        data: {
          files: [
            {
              id: 'doc-corrupt',
              name: 'Tricky.doc',
              mimeType: 'application/msword',
            },
          ],
        },
      };
    });

    mockGet.mockResolvedValue({ data: Buffer.from('corrupted-doc-buffer') });
    mockCopy.mockResolvedValue({ data: { id: 'temp-copy-id-999' } });
    mockExport.mockResolvedValue({ data: '# Fallback Content' });
    mockDelete.mockResolvedValue({});

    const loader = googleDriveLoader({
      folderId: 'folder',
      serviceAccountEmail: 'email@test.com',
      privateKey: 'key',
    });

    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const mockStore = { clear: vi.fn(), set: vi.fn() };

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: vi.fn().mockImplementation(async ({ id, data }) => data),
      renderMarkdown: vi.fn().mockResolvedValue('html'),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('word-extractor failed for "Tricky.doc"')
    );

    expect(mockCopy).toHaveBeenCalledWith({
      fileId: 'doc-corrupt',
      requestBody: {
        name: 'tmp-convert-Tricky.doc',
        mimeType: 'application/vnd.google-apps.document',
        parents: ['folder'],
      },
      fields: 'id',
      supportsAllDrives: true,
    });

    expect(mockDelete).toHaveBeenCalledWith({ fileId: 'temp-copy-id-999', supportsAllDrives: true });
    expect(mockStore.set).toHaveBeenCalledTimes(1);
  });

  it('handles duplicate titles/slugs gracefully', async () => {
    mockList.mockImplementation(async ({ q }) => {
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) {
        return { data: { files: [] } };
      }

      return {
        data: {
          files: [
            {
              id: 'file-id-11111',
              name: 'Secret Recipe.docx',
              mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            },
            {
              id: 'file-id-22222',
              name: 'Secret Recipe.doc',
              mimeType: 'application/msword',
            },
          ],
        },
      };
    });

    mockGet.mockResolvedValue({ data: new ArrayBuffer(8) });
    mockCopy.mockResolvedValue({ data: { id: 'temp-222' } });
    mockExport.mockResolvedValue({ data: 'Content' });
    mockDelete.mockResolvedValue({});

    const loader = googleDriveLoader({
      folderId: 'folder',
      serviceAccountEmail: 'email@test.com',
      privateKey: 'key',
    });

    const mockStore = { clear: vi.fn(), set: vi.fn() };
    const mockParseData = vi.fn().mockImplementation(async ({ id, data }) => data);

    await loader.load({
      store: mockStore as any,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as any,
      parseData: mockParseData,
      renderMarkdown: vi.fn().mockResolvedValue('html'),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockParseData).toHaveBeenNthCalledWith(1, {
      id: 'secret-recipe',
      data: expect.objectContaining({ title: 'Secret Recipe' }),
    });

    expect(mockParseData).toHaveBeenNthCalledWith(2, {
      id: 'secret-recipe-file-id-',
      data: expect.objectContaining({ title: 'Secret Recipe' }),
    });
  });

  it('logs error for individual file failure without stopping overall sync', async () => {
    mockList.mockImplementation(async ({ q }) => {
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) return { data: { files: [] } };
      return {
        data: {
          files: [
            { id: 'bad-doc', name: 'Corrupted.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
            { id: 'good-doc', name: 'Good.gdoc', mimeType: 'application/vnd.google-apps.document' },
          ],
        },
      };
    });

    mockGet.mockRejectedValue(new Error('Corrupted binary file'));
    mockExport.mockResolvedValue({ data: 'Good content' });

    const loader = googleDriveLoader({
      folderId: 'folder',
      serviceAccountEmail: 'email@test.com',
      privateKey: 'key',
    });

    const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    const mockStore = { clear: vi.fn(), set: vi.fn() };

    await loader.load({
      store: mockStore as any,
      logger: mockLogger as any,
      parseData: vi.fn().mockImplementation(async ({ id, data }) => data),
      renderMarkdown: vi.fn().mockResolvedValue('html'),
      meta: {} as any,
      generateDigest: vi.fn() as any,
      config: {} as any,
      cache: {} as any,
      watcher: {} as any,
    });

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to load "Corrupted.docx": Corrupted binary file');
    expect(mockStore.set).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('1/2 documents loaded into Content Layer!');
  });

  it('catches and logs top-level API errors', async () => {
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

    expect(mockLogger.error).toHaveBeenCalledWith('Failed to load documents: API quota exceeded');
  });
});
