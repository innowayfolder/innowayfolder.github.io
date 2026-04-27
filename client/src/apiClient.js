import {
  clearAuthSession,
  getAccessToken,
  getStoredUsername,
  isAccessTokenExpired,
  setAuthSession,
} from './auth';

const API_BASE = '/api/v1';
const REFRESH_ENDPOINT = '/refresh';
const LOGOUT_ENDPOINT = '/logout';
export const AUTH_FAILURE_EVENT = 'innoway:auth-failure';

const dispatchAuthFailure = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_FAILURE_EVENT));
  }
};

const clearSessionAndNotifyAuthFailure = () => {
  clearAuthSession();
  dispatchAuthFailure();
};

const getApiUrl = (path) => `${API_BASE}${path}`;

const parseJsonResponse = async (response) => {
  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.message || payload.error || `Request failed (${response.status})`;

    if (response.status === 401 || response.status === 403) {
      clearSessionAndNotifyAuthFailure();
    }

    throw new Error(message);
  }

  return payload;
};

const getValidAccessToken = async () => {
  let token = getAccessToken();

  if (!token || isAccessTokenExpired()) {
    await refreshAuthToken();
    token = getAccessToken();
  }

  if (!token) {
    throw new Error('登录已失效，请重新登录');
  }

  return token;
};

const withAuthorizedRetry = async (requestFn) => {
  let token = await getValidAccessToken();

  try {
    return await requestFn(token);
  } catch (error) {
    if (error?.status !== 401) {
      throw error;
    }

    try {
      await refreshAuthToken();
      token = getAccessToken();
    } catch (refreshError) {
      clearSessionAndNotifyAuthFailure();
      throw refreshError;
    }

    if (!token) {
      clearSessionAndNotifyAuthFailure();
      throw new Error('登录已失效，请重新登录');
    }

    return requestFn(token);
  }
};

export const login = async (username, password) => {
  const response = await fetch(getApiUrl('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });

  const payload = await parseJsonResponse(response);

  setAuthSession({
    authToken: payload.auth_token,
    expiresAt: payload.expires_at,
    username: payload.username,
  });

  return payload;
};

export const refreshAuthToken = async () => {
  const username = getStoredUsername();

  const response = await fetch(getApiUrl(REFRESH_ENDPOINT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username }),
  });

  const payload = await parseJsonResponse(response);

  setAuthSession({
    authToken: payload.auth_token,
    expiresAt: payload.expires_at,
    username: payload.username ?? username,
  });

  return payload;
};

export const logoutRequest = async () => {
  const username = getStoredUsername();

  const response = await fetch(getApiUrl(LOGOUT_ENDPOINT), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      username,
    }),
  });

  await parseJsonResponse(response);
};

export const authorizedRequest = async (path, init = {}) => {
  return withAuthorizedRetry(async (token) => {
    const response = await fetch(getApiUrl(path), {
      ...init,
      credentials: init.credentials ?? 'include',
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.status = 401;
      throw unauthorizedError;
    }

    return parseJsonResponse(response);
  });
};

export const authorizedUploadRequest = async (path, formData, onProgress) => {
  return withAuthorizedRetry(
    (token) => new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('PUT', getApiUrl(path));
      request.responseType = 'json';
      request.withCredentials = true;
      request.setRequestHeader('Authorization', `Bearer ${token}`);

      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };

      request.onload = () => {
        const payload = request.response || {};

        if (request.status >= 200 && request.status < 300) {
          resolve(payload);
          return;
        }

        const message = payload.message || payload.error || `Request failed (${request.status})`;
        const error = new Error(message);
        error.status = request.status;
        reject(error);
      };

      request.onerror = () => {
        reject(new Error('图片上传失败，请检查网络连接'));
      };

      request.send(formData);
    }),
  );
};

export const publicRequest = async (path, init = {}) => {
  const response = await fetch(getApiUrl(path), {
    ...init,
    credentials: init.credentials ?? 'include',
    headers: {
      ...(init.headers || {}),
    },
  });

  return parseJsonResponse(response);
};