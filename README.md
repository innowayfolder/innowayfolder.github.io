# innowayfolder.com

Innoway's marketing site and admin portal.

frontend:
- innoway home page
- innoway products page
- innoway news page
- innoway contact page
- innoway admin page
- - articles dashbaord
- - article detail
- - article editor

backend:
- admin login API
- file upload to AWS
- DB operations


## Pages

Public: home, products, news, about, contact.
Admin (`/admin`, login required): article dashboard, article detail, editor.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/health` | – | Health check |
| GET | `/api/v1/articles` | optional | List articles (published only when anonymous) |
| GET | `/api/v1/article?articleId=` | optional | One article (published only when anonymous) |
| POST | `/api/v1/login` | – | Admin login |
| POST | `/api/v1/refresh` | refresh cookie | Rotate tokens |
| POST | `/api/v1/logout` | access token | Revoke the current session |
| PUT | `/api/v1/article` | access token | Create or update an article |
| DELETE | `/api/v1/article?articleId=` | access token | Delete an article and its S3 files |
| POST | `/api/v1/photo/upload-url` | access token | Presigned S3 upload URL (primary upload path) |
| PUT | `/api/v1/photo` | access token | Multipart upload fallback (< 4 MB) |

Access tokens are short-lived and held in memory only. The refresh token lives in
an `HttpOnly`, `Secure`, `SameSite=Lax` cookie scoped to `/api/v1`, is stored
only as a bcrypt hash, and is rotated on every refresh.
