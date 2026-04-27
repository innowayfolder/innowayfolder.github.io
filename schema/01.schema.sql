CREATE SCHEMA innoway;

ALTER DATABASE postgres SET search_path TO innoway, public;

-- Articles main record
CREATE TABLE innoway.articles (
	article_id VARCHAR(100) PRIMARY KEY,
	title VARCHAR(255) NOT NULL,
    content text NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
	created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	published_at timestamp NULL,
	CONSTRAINT chk_articles_status
		CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

-- Images that appear at the end of article, in display order
CREATE TABLE innoway.article_photo (
	article_id VARCHAR(100) NOT NULL,
	rank INT NOT NULL,
	file_name VARCHAR(100) NOT NULL,
	mime_type VARCHAR(100) NULL,
	created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_article_photo
		PRIMARY KEY (article_id, rank),
	CONSTRAINT fk_article_photo_article
		FOREIGN KEY (article_id) REFERENCES innoway.articles(article_id)
		ON UPDATE CASCADE
		ON DELETE CASCADE
);

-- admin schema
CREATE TABLE innoway.users (
	username VARCHAR(50) PRIMARY KEY UNIQUE,
	password VARCHAR(100),
    createdate TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE innoway.auth_refresh_token (
	username TEXT NOT NULL,
	refresh_token_hash TEXT NOT NULL,
	expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
	device_name TEXT,
    ip_address INET,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (username, refresh_token_hash),
	FOREIGN KEY (username) REFERENCES innoway.users (username)
		ON DELETE CASCADE
		ON UPDATE CASCADE
);
CREATE INDEX idx_auth_refresh_token_username ON innoway.auth_refresh_token (username);
CREATE INDEX idx_auth_refresh_token_expires_at ON innoway.auth_refresh_token (expires_at);
