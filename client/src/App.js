import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { AUTH_FAILURE_EVENT, login } from './apiClient';
import { AuthProvider, useAuth } from './AuthContext';
import ArticleDashboard from './ArticleDashboard';
import ArticleDetail from './ArticleDetail';
import ArticleEditor from './ArticleEditor';
import Home from './Home';
import News from './News';
import NewsDetail from './NewsDetail';
import Contact from './Contact';
import Products from './Products';
import ProductDetails from './ProductDetails';

const StaticPageRedirect = ({ to }) => {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return null;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = await login(username, password);
      setCurrentUser(payload.username || username);
      setPassword('');
      navigate('/admin', { replace: true });
    } catch (error) {
      setErrorMessage(error.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1 className="auth-title">Admin Login</h1>

        <label className="auth-label" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          name="username"
          className="auth-input"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
        />

        <label className="auth-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="auth-input"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        <button type="submit" className="auth-button" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </main>
  );
};

const AdminRootPage = () => {
  const { currentUser, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return <ArticleDashboard />;
};

const RequireAdminAuth = ({ children }) => {
  const { currentUser, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/admin" replace />;
  }

  return children;
};

const AdminRouteContainer = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  useEffect(() => {
    const onAuthFailure = () => {
      setCurrentUser(null);
      navigate('/admin', { replace: true });
    };

    window.addEventListener(AUTH_FAILURE_EVENT, onAuthFailure);

    return () => {
      window.removeEventListener(AUTH_FAILURE_EVENT, onAuthFailure);
    };
  }, [navigate, setCurrentUser]);

  return <Outlet />;
};

const AdminRoutes = () => (
  <AuthProvider>
    <AdminRouteContainer />
  </AuthProvider>
);

const App = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/news" element={<News />} />
    <Route path="/news/:articleId" element={<NewsDetail />} />
    <Route path="/contact" element={<Contact />} />
    <Route path="/products" element={<Products />} />
    <Route path="/product-details" element={<ProductDetails />} />
    <Route path="/admin" element={<AdminRoutes />}>
      <Route index element={<AdminRootPage />} />
      <Route
        path="article/:articleId"
        element={(
          <RequireAdminAuth>
            <ArticleDetail />
          </RequireAdminAuth>
        )}
      />
      <Route
        path="editor/:articleId"
        element={(
          <RequireAdminAuth>
            <ArticleEditor />
          </RequireAdminAuth>
        )}
      />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;