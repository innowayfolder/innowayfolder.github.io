/**
 * AuthContext.js
 * 
 * This module handles user authentication state management for the entire application.
 * It provides a React Context-based system to:
 * - Store the current authenticated user
 * - Manage user login/logout state
 * - Restore sessions from persistent storage (refresh tokens)
 * - Share auth state across all components without prop drilling
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { logoutRequest, refreshAuthToken } from './apiClient';
import { clearAuthSession, getAccessToken, getStoredUsername, isAccessTokenExpired } from './auth';

/**
 * AuthContext - React Context object that holds authentication state
 * Components can subscribe to this context to access auth data
 * Initial value is null until AuthProvider initializes
 */
const AuthContext = createContext(null);

/**
 * AuthProvider - Component that wraps the application and provides authentication context
 * 
 * This component should be placed at the root level of your app (typically in App.js or main index.js)
 * so all child components have access to auth state.
 * 
 * Example:
 *   <AuthProvider>
 *     <App />
 *   </AuthProvider>
 * 
 * Props:
 *   - children: React components that will have access to the auth context
 */
export const AuthProvider = ({ children }) => {
  /**
   * currentUser - Stores the username of the logged-in user
   * - null when no user is logged in
   * - string (username) when user is authenticated
   */
  const [currentUser, setCurrentUser] = useState(null);

  /**
   * isInitializing - Flag that indicates the app is checking for an existing session
   * - true during initial session restoration from refresh token
   * - false once the session check is complete (whether user was restored or not)
   * 
   * This is useful for showing loading screens while checking auth status
   * Prevents flickering or showing content before auth state is determined
   */
  const [isInitializing, setIsInitializing] = useState(true);

  /**
   * Session Restoration Effect
   * 
   * This effect runs once when AuthProvider mounts (on app startup).
   * It checks if there's an existing refresh token and tries to restore the user session.
   * 
   * Flow:
   * 1. Check if a refresh token exists in persistent storage
   * 2. If yes, use it to get a new access token and user data
   * 3. Set currentUser to the restored username
   * 4. If refresh fails, clear all auth data and session
   * 5. Mark initialization as complete so UI knows auth state is determined
   * 6. Only runs once ([] dependency array)
   */
  useEffect(() => {
    /**
     * cancelled - Flag to prevent state updates if component unmounts
     * This prevents "memory leak" warnings when async operations complete
     * after the component is destroyed
     */
    let cancelled = false;

    /**
     * tryRestoreSession - Async function that attempts to restore a saved session
     * 
     * Why it's needed:
     * - Users shouldn't need to re-login every time they refresh the page
     * - Refresh tokens can restore access tokens without requiring credentials
     */
    const tryRestoreSession = async () => {
      const storedUsername = getStoredUsername();

      if (!storedUsername) {
        if (!cancelled) setIsInitializing(false);
        return;
      }

      if (getAccessToken() && !isAccessTokenExpired()) {
        if (!cancelled) {
          setCurrentUser(storedUsername);
          setIsInitializing(false);
        }
        return;
      }

      try {
        // Step 2: Attempt to refresh the auth token using the stored refresh token
        // This communicates with the backend using the refresh cookie
        // and get a new access token
        const refreshed = await refreshAuthToken();
        
        // Step 3: If successful, restore the user's session
        // The username is extracted from the refreshed token response
        if (!cancelled) setCurrentUser(refreshed.username);
      } catch {
        // Step 4: If refresh fails (token expired, revoked, etc.)
        // Clear all stored auth data to ensure clean state
        if (!cancelled) clearAuthSession();
      } finally {
        // Step 5: Always mark initialization as complete once the attempt is done
        // This happens whether session was restored, refresh failed, or no token existed
        if (!cancelled) setIsInitializing(false);
      }
    };

    tryRestoreSession();

    // Cleanup function: prevents state updates if component unmounts before async operation completes
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * logout - Function that handles user logout
   * 
   * This function:
   * 1. Notifies the backend that the user is logging out (invalidates refresh token)
   * 2. Clears authentication data from local storage
   * 3. Resets the currentUser state to null
   * 
   * useCallback ensures this function's reference remains stable across re-renders,
   * which prevents unnecessary re-renders of components that use this function
   * 
   * Error handling:
   * - If the backend logout fails, we still clear the local session
   * - This ensures the user can log out even if the server is unreachable
   * - The user's session is cleaned up locally, even if the refresh token isn't invalidated on the server
   */
  const logout = useCallback(async () => {
    try {
      // Notify backend to invalidate the refresh token
      await logoutRequest();
    } catch {
      // Clear local session even when backend logout fails.
      // This ensures the user is logged out on the frontend regardless of server issues
    }

    // Clear all auth data from persistent storage
    clearAuthSession();
    
    // Reset the current user state to null (logged out state)
    setCurrentUser(null);
  }, []);

  /**
   * AuthContext.Provider - Shares auth state with all child components
   * 
   * The value object contains the (auth data and methods that components need:
   * - currentUser: The logged-in user's username (or null if not logged in)
   * - setCurrentUser: Function to manually set the current user (used internally or after login)
   * - logout: Function to log out the user
   * - isInitializing: Boolean flag indicating if session restoration is in progress
   * 
   * Components can access these values using the useAuth() hook
   */
  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, logout, isInitializing }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth - Custom React hook to access authentication context
 * 
 * Usage in any component:
 *   const { currentUser, logout, isInitializing } = useAuth();
 * 
 * This hook makes it easy to:
 * - Check if a user is logged in (currentUser !== null)
 * - Get the current username
 * - Call logout()
 * - Wait for initial session restoration (isInitializing)
 * 
 * Example component:
 *   function Profile() {
 *     const { currentUser, logout } = useAuth();
 *     if (!currentUser) return <p>Please log in</p>;
 *     return (
 *       <div>
 *         <p>Welcome, {currentUser}</p>
 *         <button onClick={logout}>Logout</button>
 *       </div>
 *     );
 *   }
 */
export const useAuth = () => useContext(AuthContext);
