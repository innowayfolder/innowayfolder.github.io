import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authorizedRequest } from './apiClient';
import { useAuth } from './AuthContext';

const STATUS_LABELS = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
};

const truncateTitle = (title, maxWords = 10) => {
  const normalizedTitle = String(title || '').trim();

  if (!normalizedTitle) {
    return '';
  }

  const words = normalizedTitle.split(/\s+/);

  if (words.length <= maxWords) {
    return normalizedTitle;
  }

  return `${words.slice(0, maxWords).join(' ')}...`;
};

const formatDisplayDate = (dateValue) => {
  if (!dateValue) {
    return '-';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleDateString();
};

const getPublishedTimestamp = (article) => {
  const publishedAt = article?.publishedAt;

  if (!publishedAt) {
    return 0;
  }

  const timestamp = new Date(publishedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const ArticleDashboard = () => {
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await authorizedRequest('/articles');
        const sortedArticles = (Array.isArray(data) ? data : [])
          .slice()
          .sort((a, b) => getPublishedTimestamp(b) - getPublishedTimestamp(a));

        setArticles(sortedArticles);
      } catch (err) {
        setError(err.message || 'Failed to load articles');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/admin', { replace: true });
  };

  const getStatusLabel = (status) => STATUS_LABELS[status] || status || '未知状态';

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">文章列表</h1>
        <div className="dashboard-header-actions">
          <span className="dashboard-user">{currentUser}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLogout}
          >
            退出登录
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-toolbar">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/admin/editor/new')}
          >
            + 添加文章
          </button>
        </div>

        {isLoading && <p className="page-loading">Loading articles...</p>}

        {error && <p className="error-text">{error}</p>}

        {!isLoading && !error && articles.length === 0 && (
          <p className="empty-text">暂无文章。</p>
        )}

        {!isLoading && !error && articles.length > 0 && (
          <ul className="article-list">
            {articles.map((article) => (
              <li
                key={article.articleId}
                className="article-list-item"
                onClick={() => navigate(`/admin/article/${article.articleId}`)}
              >
                <span className="article-list-title">{truncateTitle(article.title)}</span>
                <div className="article-list-actions">
                  <span className={`status-badge status-${article.status?.toLowerCase() || 'unknown'}`}>
                    {getStatusLabel(article.status)}
                  </span>
                  <button
                    type="button"
                    className="article-edit-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/admin/editor/${article.articleId}`);
                    }}
                    aria-label={`Edit ${article.title}`}
                  >
                    Edit
                  </button>
                  <span className="article-list-date">
                    {formatDisplayDate(article.publishedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};

export default ArticleDashboard;
