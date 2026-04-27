jest.mock('./repository', () => ({
  findByUsername: jest.fn(),
  createRefreshToken: jest.fn(),
  getRefreshTokensByUsername: jest.fn(),
  deleteRefreshTokenByHash: jest.fn(),
  updateArticleId: jest.fn(),
  upsertArticle: jest.fn(),
  getArticleById: jest.fn(),
  getArticlePhotosById: jest.fn(),
  getAllArticles: jest.fn(),
}));

jest.mock('./aws', () => ({
  uploadToS3: jest.fn(),
  deleteStaleArticlePhotosInS3: jest.fn(),
}));

const { uploadToS3, deleteStaleArticlePhotosInS3 } = require('./aws');
const {
  upsertArticle: upsertArticleRecord,
  updateArticleId,
  getArticleById,
  getArticlePhotosById,
} = require('./repository');
const { upsertArticle, uploadArticlePhoto, getOneArticle } = require('./service');

describe('upsertArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reconciles stale S3 photos after successful article upsert', async () => {
    const upsertedArticle = {
      article_id: 'article-1',
      title: 'title',
      content: 'content',
      status: 'DRAFT',
      photos: [],
    };
    upsertArticleRecord.mockResolvedValue(upsertedArticle);
    deleteStaleArticlePhotosInS3.mockResolvedValue(undefined);

    const result = await upsertArticle(null, 'article-1', ' title ', 'content', 'DRAFT', [
      { rank: 2, fileName: 'keep-2.jpg', mimeType: 'image/jpeg' },
      { rank: 1, fileName: 'keep-1.jpg', mimeType: 'image/jpeg' },
    ], '2026-04-26');

    expect(upsertArticleRecord).toHaveBeenCalledWith(expect.objectContaining({
      publishedAt: '2026-04-26',
    }));
    expect(deleteStaleArticlePhotosInS3).toHaveBeenCalledWith('article-1', ['keep-1.jpg', 'keep-2.jpg']);
    expect(result).toBe(upsertedArticle);
  });

  it('keeps article upsert successful even when S3 cleanup fails', async () => {
    const upsertedArticle = {
      article_id: 'article-2',
      title: 'title',
      content: 'content',
      status: 'PUBLISHED',
      photos: [],
    };
    upsertArticleRecord.mockResolvedValue(upsertedArticle);
    deleteStaleArticlePhotosInS3.mockRejectedValue(new Error('delete failure'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await upsertArticle(null, 'article-2', 'title', 'content', 'PUBLISHED', []);

    expect(result).toBe(upsertedArticle);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('rejects invalid publishedAt values', async () => {
    await expect(upsertArticle(null, 'article-3', 'title', 'content', 'DRAFT', [], '2026-02-31'))
      .rejects
      .toThrow('publishedAt must be a valid calendar date when provided');
  });

  it('updates article id first when oldArticleId and articleId are different', async () => {
    upsertArticleRecord.mockResolvedValue({
      article_id: 'new-article-id',
      title: 'title',
      content: 'content',
      status: 'DRAFT',
      photos: [],
    });
    updateArticleId.mockResolvedValue(1);

    await upsertArticle('old-article-id', 'new-article-id', 'title', 'content', 'DRAFT', []);

    expect(updateArticleId).toHaveBeenCalledWith('old-article-id', 'new-article-id');
    expect(upsertArticleRecord).toHaveBeenCalledWith(expect.objectContaining({
      articleId: 'new-article-id',
    }));
  });
});

describe('uploadArticlePhoto', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes the file name into a URL-friendly slug and keeps the extension', async () => {
    uploadToS3.mockResolvedValue('https://example.com/articles/article-1/hello-world.png');

    const result = await uploadArticlePhoto(
      'article-1',
      '  Hello World!!.PNG  ',
      Buffer.from('image-data'),
      'image/png'
    );

    expect(uploadToS3).toHaveBeenCalledWith(
      expect.any(Buffer),
      'article-1',
      'hello-world.png',
      'image/png'
    );
    expect(result).toEqual({
      articleId: 'article-1',
      fileName: 'hello-world.png',
      mimeType: 'image/png',
      url: 'https://example.com/articles/article-1/hello-world.png',
    });
  });

  it('pads very short cleaned file names to at least five characters', async () => {
    uploadToS3.mockResolvedValue('https://example.com/articles/article-2/ab123.jpeg');

    const result = await uploadArticlePhoto(
      'article-2',
      'A!.jpeg',
      Buffer.from('image-data'),
      'image/jpeg'
    );

    expect(uploadToS3).toHaveBeenCalledWith(
      expect.any(Buffer),
      'article-2',
      expect.stringMatching(/^a[a-f0-9]{4}\.jpeg$/),
      'image/jpeg'
    );
    expect(result.fileName).toMatch(/^a[a-f0-9]{4}\.jpeg$/);
  });

  it('falls back to a generated base name when the cleaned name becomes empty', async () => {
    uploadToS3.mockResolvedValue('https://example.com/articles/article-3/filea.jpg');

    const result = await uploadArticlePhoto(
      'article-3',
      '!!!.jpg',
      Buffer.from('image-data'),
      'image/jpeg'
    );

    expect(uploadToS3).toHaveBeenCalledWith(
      expect.any(Buffer),
      'article-3',
      expect.stringMatching(/^file[a-f0-9]\.jpg$/),
      'image/jpeg'
    );
    expect(result.fileName).toMatch(/^file[a-f0-9]\.jpg$/);
  });
});

describe('getOneArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns article photos with upload-compatible fields', async () => {
    getArticleById.mockResolvedValue({
      article_id: '2026-04-26-152141',
      title: 'new article 20260425 e',
      content: '[{"insert":"2"},{"attributes":{"header":1},"insert":"\\n"}]',
      status: 'ARCHIVED',
      created_at: new Date('2026-04-25T00:00:00.000Z'),
      updated_at: new Date('2026-04-26T00:00:00.000Z'),
      published_at: null,
    });

    getArticlePhotosById.mockResolvedValue([
      { rank: 1, file_name: 'mm', mime_type: '' },
      { rank: 2, file_name: 'qq', mime_type: null },
    ]);

    const result = await getOneArticle('2026-04-26-152141');

    expect(getArticlePhotosById).toHaveBeenCalledWith('2026-04-26-152141');
    expect(result.photos).toEqual([
      { rank: 1, fileName: 'mm', mimeType: '' },
      { rank: 2, fileName: 'qq', mimeType: '' },
    ]);
  });
});