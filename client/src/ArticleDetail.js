import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Quill from 'quill';
import { authorizedRequest } from './apiClient';

const STATUS_LABELS = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

const normalizeRenderedHtml = (html) => String(html)
  .replaceAll('&nbsp;', ' ')
  .replaceAll('\u00a0', ' ');

const escapeHtml = (text) => {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const getArticleSemanticHtml = (rawContent) => {
  if (!rawContent) {
    return '';
  }

  try {
    const parsedContent = JSON.parse(rawContent);

    if (Array.isArray(parsedContent)) {
      const container = document.createElement('div');
      const quill = new Quill(container, { readOnly: true, theme: 'snow' });
      quill.setContents(parsedContent);
      return normalizeRenderedHtml(quill.getSemanticHTML());
    }
  } catch (error) {
    // Fallback to plain text rendering when content is not a valid Delta payload.
  }

  return `<p>${escapeHtml(rawContent).replaceAll('\n', '<br/>')}</p>`;
};

const ArticleDetail = () => {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const articleHtml = useMemo(() => getArticleSemanticHtml(article?.content), [article?.content]);
  const statusLabel = STATUS_LABELS[article?.status] || article?.status || '未知状态';

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const data = await authorizedRequest(`/article?articleId=${encodeURIComponent(articleId)}`);
        setArticle(data);
      } catch (err) {
        setError(err.message || 'Failed to load article');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  return (
    <div className="detail-page">
      <header className="detail-header">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/admin')}
        >
          ← 返回
        </button>
      </header>

      <main className="detail-main">
        {isLoading && <p className="page-loading">正在加载文章...</p>}

        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && article && (
          <>
            <h1 className="detail-title">{article.title}</h1>

            <div className="detail-meta">
              <span className={`status-badge status-${article.status?.toLowerCase()}`}>
                {statusLabel}
              </span>
              {article.publishedAt && (
                <span className="detail-date">
                  发布时间: {new Date(article.publishedAt).toLocaleDateString()}
                </span>
              )}
              <span className="detail-date">
                创建日期: {new Date(article.createdAt).toLocaleString()}
              </span>
            </div>

            {articleHtml ? (
              <div
                className="detail-content"
                dangerouslySetInnerHTML={{ __html: articleHtml }}
              />
            ) : (
              <p className="empty-text">(无内容)</p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default ArticleDetail;
