import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

/**
 * ProtectedRoute - A route wrapper component that protects routes from unauthorized access
 *
 * @param {Object} props - The component props
 * @param {React.ReactNode} props.children - The child components to render if user is authenticated
 * @returns {React.ReactNode} Loading state, redirect to login, or protected children based on auth state
 *
 * @description
 * This component acts as a guard for protected routes. It checks the authentication state
 * and handles three scenarios:
 * 1. While initializing: displays a loading indicator
 * 2. No authenticated user: redirects to the login page
 * 3. Authenticated user: renders the protected children
 *
 * @note
 * When `isInitializing` is updated in AuthContext, this component will re-render because it
 * consumes the `useAuth()` hook. The component subscribes to AuthContext updates, so any change
 * to `isInitializing` or `currentUser` will trigger a re-evaluation of the component's logic.
 *
 * @example
 * <ProtectedRoute>
 *   <ArticleDashboard />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ children }) => {
  const { currentUser, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
