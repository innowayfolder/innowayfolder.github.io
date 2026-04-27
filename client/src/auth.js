const USERNAME_KEY = 'innoway.username';

let accessToken = null;
let expiresAt = null;
// Username is not a secret — persist it so session restore works after page reload.
let storedUsername = typeof window !== 'undefined'
  ? window.localStorage.getItem(USERNAME_KEY)
  : null;

export const setAuthSession = ({ authToken, expiresAt: nextExpiresAt, username: nextUsername }) => {
  accessToken = authToken;
  expiresAt = nextExpiresAt;
  if (nextUsername !== undefined) {
    storedUsername = nextUsername;
    if (typeof window !== 'undefined') {
      if (nextUsername) {
        window.localStorage.setItem(USERNAME_KEY, nextUsername);
      } else {
        window.localStorage.removeItem(USERNAME_KEY);
      }
    }
  }
};

export const clearAuthSession = () => {
  accessToken = null;
  expiresAt = null;
  storedUsername = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USERNAME_KEY);
  }
};

export const getAccessToken = () => accessToken;

export const getStoredUsername = () => storedUsername;

export const isAccessTokenExpired = (bufferSeconds = 30) => {
  if (!expiresAt) {
    return true;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return true;
  }

  return Date.now() + bufferSeconds * 1000 >= expiresAtMs;
};