import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Quill from 'quill';
import { publicRequest } from './apiClient';

const PHOTO_BASE_URL = 'https://innoway-photos.s3.ap-northeast-1.amazonaws.com/articles';

const normalizeRenderedHtml = (html) => String(html)
  .replaceAll('&nbsp;', ' ')
  .replaceAll('\u00a0', ' ');

const normalizeImageRanks = (imageList) => imageList.map((image, index) => ({
  ...image,
  rank: index + 1,
}));

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const formatPublishedDate = (publishedAt) => {
  if (!publishedAt) {
    return '';
  }

  const date = new Date(publishedAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getSemanticHtmlFromDelta = (rawContent) => {
  if (!rawContent) {
    return '';
  }

  try {
    const parsedContent = JSON.parse(rawContent);

    if (!Array.isArray(parsedContent)) {
      return `<p>${escapeHtml(rawContent)}</p>`;
    }

    const container = document.createElement('div');
    const quill = new Quill(container, { readOnly: true, theme: 'snow' });
    quill.setContents(parsedContent);
    return normalizeRenderedHtml(quill.getSemanticHTML());
  } catch {
    return `<p>${escapeHtml(rawContent).replaceAll('\n', '<br />')}</p>`;
  }
};

const NewsDetail = () => {
  const { articleId = '' } = useParams();
  const [article, setArticle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setIsLoading(true);
        setError('');

        const data = await publicRequest(`/article?articleId=${encodeURIComponent(articleId)}`);
        const fetchedImages = Array.isArray(data?.photos)
          ? normalizeImageRanks(
            [...data.photos]
              .sort((firstPhoto, secondPhoto) => (firstPhoto?.rank || 0) - (secondPhoto?.rank || 0))
              .map((photo) => ({
                id: photo.fileName,
                file: null,
                preview: `${PHOTO_BASE_URL}/${encodeURIComponent(articleId)}/${encodeURIComponent(photo.fileName)}`,
                name: photo.fileName,
                rank: photo.rank,
                mimeType: photo.mimeType,
                fetched: true,
              })),
          )
          : [];

        setArticle({
          ...data,
          photos: fetchedImages,
        });
      } catch (requestError) {
        setError(requestError.message || 'Failed to load news detail');
      } finally {
        setIsLoading(false);
      }
    };

    fetchArticle();
  }, [articleId]);

  const articleBodyHtml = useMemo(() => {
    return getSemanticHtmlFromDelta(article?.content || '');
  }, [article?.content]);

  return (
    <div className="main-content">
      <nav className="navbar navbar-expand-lg bg-primary fixed-top">
        <div className="navbar-brand logo">
          <a href="/"><img src={process.env.PUBLIC_URL + '/files/innoway.png'} alt="Innoway Logo" /></a>
        </div>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar-collapse" aria-controls="navbar-collapse" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbar-collapse">
          <ul className="navbar-nav me-auto nav-fill w-100">
            <li className="nav-item">
              <a className="nav-link" href="/">About Us</a>
            </li>
            <li id="myDropdown" className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" aria-current="page" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                Products
              </a>
              <ul id="list" className="dropdown-menu">
                <li>
                  <a className="dropdown-item" data-product-key="feeder" href="/products?p=feeder">Feeder</a>
                </li>
                <li>
                  <a className="dropdown-item" data-product-key="folder" href="/products?p=folder">Folder</a>
                </li>
                <li>
                  <a className="dropdown-item" data-product-key="ironer" href="/products?p=ironer">Ironer</a>
                </li>
                <li>
                  <a className="dropdown-item" data-product-key="scanner" href="/products?p=scanner">Scanner</a>
                </li>
                <li>
                  <a className="dropdown-item" data-product-key="separation" href="/products?p=separation">Linen Separator</a>
                </li>
                <li>
                  <a className="dropdown-item" data-product-key="conveyor" href="/products?p=conveyor">Conveyor</a>
                </li>
                <li>
                  <a className="dropdown-item" data-product-key="auxiliaries" href="/products?p=auxiliaries">Auxiliaries</a>
                </li>
              </ul>
            </li>
            <li className="nav-item">
              <a className="nav-link active" href="/news" aria-current="page">News</a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/contact">Contact</a>
            </li>
          </ul>

          <ul className="navbar-nav">
            <li className="nav-social-item">
              <a target="_blank" rel="noreferrer" href="https://www.youtube.com/@innowayfolder">
                <img src={process.env.PUBLIC_URL + '/files/youtube-logo.png'} alt="YouTube Logo" />
              </a>
            </li>
            <li className="nav-social-item">
              <a target="_blank" rel="noreferrer" href="https://www.linkedin.com/company/innoway-ltd/">
                <img src={process.env.PUBLIC_URL + '/files/linkedin-logo.svg'} alt="LinkedIn Logo" />
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <div className="news-article">
        <Link className="news-back" to="/news">&larr; Back to News</Link>

        {isLoading && <p className="page-loading">Loading article...</p>}

        {!isLoading && error && <p className="error-text">{error}</p>}

        {!isLoading && !error && article && (
          <>
            <h1>{article.title}</h1>
            <p className="news-date">{formatPublishedDate(article.publishedAt)}</p>

            <div className="news-body" dangerouslySetInnerHTML={{ __html: articleBodyHtml }} />

            {Array.isArray(article.photos) && article.photos.length > 0 && (
              <div className="news-images">
                {article.photos.map((image) => (
                  <img
                    key={image.id}
                    src={image.preview}
                    alt={image.name}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <div class="news-body">
                <h3>About Innoway</h3>
                <p>Innoway has over 20 years of expertise in R&D and manufacturing of automation technologies and products
                    for flatwork finishing processes in the laundry industry. As a top-tier manufacturer in China with
                    leading R&D capabilities in this field, the company consistently listens to customer needs and delivers
                    products and services driven by innovation and reliable quality. Its products are widely exported to
                    major global markets including the United States, Europe, and Southeast Asia.</p>
            </div>
          </>
        )}
      </div>

      <div className="footer">
        <div className="container">
          <h2>Innoway LTD.</h2>
          <div className="footer-content">
            <div className="footer-main">
              <div className="footer-info footer-address">
                <h5>Address</h5>
                <span>No.5 Jingsheng South 4th St, Tongzhou District, Beijing, China</span>
              </div>
              <div className="footer-info footer-email">
                <h5>Email</h5>
                <p>info@innowaycn.com</p>
              </div>
            </div>
            <div className="footer-social">
              <a target="_blank" rel="noreferrer" href="https://www.youtube.com/@innowayfolder"><img src={process.env.PUBLIC_URL + '/files/youtube-logo-full.png'} alt="YouTube Logo" /></a>
              <a target="_blank" rel="noreferrer" href="https://www.linkedin.com/company/innoway-ltd/"><img src={process.env.PUBLIC_URL + '/files/linkedin-logo-full.svg'} alt="LinkedIn Logo" /></a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsDetail;