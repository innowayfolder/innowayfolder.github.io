import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicRequest } from './apiClient';

const EXCERPT_MAX_LENGTH = 200;

const truncateExcerpt = (text) => {
    const normalizedText = String(text).replaceAll('\u00a0', ' ').replaceAll('\n', ' ').trim();

    if (normalizedText.length <= EXCERPT_MAX_LENGTH) {
        return normalizedText;
    }

    const truncatedText = normalizedText.slice(0, EXCERPT_MAX_LENGTH);
    const lastSpaceIndex = truncatedText.lastIndexOf(' ');

    if (lastSpaceIndex <= 0) {
        return `${truncatedText.trim()}...`;
    }

    return `${truncatedText.slice(0, lastSpaceIndex).trim()}...`;
};

const getNewsExcerpt = (rawContent) => {
    if (!rawContent) {
        return '';
    }

    try {
        const parsedContent = JSON.parse(rawContent);

        if (Array.isArray(parsedContent) && parsedContent.length > 0) {
            const firstOp = parsedContent[0];

            if (typeof firstOp?.insert === 'string') {
                return truncateExcerpt(firstOp.insert);
            }
        }
    } catch (error) {
        // Fallback to raw text when content is not valid Quill Delta JSON.
    }

    return truncateExcerpt(rawContent);
};

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

const getPublishedTimestamp = (article) => {
    const publishedAt = article?.publishedAt;

    if (!publishedAt) {
        return 0;
    }

    const timestamp = new Date(publishedAt).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

const News = () => {
    const [articles, setArticles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchArticles = async () => {
            try {
                const data = await publicRequest('/articles');
                const publishedArticles = Array.isArray(data)
                    ? data
                        .filter((article) => article?.status === 'PUBLISHED')
                        .slice()
                        .sort((a, b) => getPublishedTimestamp(b) - getPublishedTimestamp(a))
                    : [];
                setArticles(publishedArticles);
            } catch (err) {
                setError(err.message || 'Failed to load news');
            } finally {
                setIsLoading(false);
            }
        };

        fetchArticles();
    }, []);

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
                            <a className="nav-link" href="/about">About Us</a>
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
                            <span className="nav-link active" href="#" aria-current="page">News</span>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/contact">Contact</a>
                        </li>
                    </ul>

                    <ul className="navbar-nav">
                        <li className="nav-social-item">
                            <a target="_blank" href="https://www.youtube.com/@innowayfolder">
                                <img src={process.env.PUBLIC_URL + '/files/youtube-logo.png'} alt="YouTube Logo" />
                            </a>
                        </li>
                        <li className="nav-social-item">
                            <a target="_blank" href="https://www.linkedin.com/company/innoway-ltd/">
                                <img src={process.env.PUBLIC_URL + '/files/linkedin-logo.svg'} alt="LinkedIn Logo" />
                            </a>
                        </li>
                    </ul>
                </div>
            </nav>
            <div className="container main">
                <h2>News</h2>
                <div className="news-grid">
                    {isLoading && <p className="page-loading">Loading news...</p>}

                    {!isLoading && error && <p className="error-text">{error}</p>}

                    {!isLoading && !error && articles.length === 0 && (
                        <p className="empty-text">No news articles found.</p>
                    )}

                    {!isLoading && !error && articles.map((article) => (
                        <Link key={article.articleId} className="news-card" to={`/news/${encodeURIComponent(article.articleId)}`}>
                            <h3>{article.title}</h3>
                            <p className="news-date">{formatPublishedDate(article.publishedAt)}</p>
                            <p className="news-excerpt">{getNewsExcerpt(article.content)}</p>
                            <span className="news-read-more">Read more &rarr;</span>
                        </Link>
                    ))}
                </div>
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
                            <a target="_blank" href="https://www.youtube.com/@innowayfolder"><img src={process.env.PUBLIC_URL + '/files/youtube-logo-full.png'} alt="YouTube Logo" /></a>
                            <a target="_blank" href="https://www.linkedin.com/company/innoway-ltd/"><img src={process.env.PUBLIC_URL + '/files/linkedin-logo-full.svg'} alt="LinkedIn Logo" /></a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default News;