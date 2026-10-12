"""Environment configuration.

Import this before reading any os.environ value so that backend/.env is loaded
first during local development. In deployed environments (Render) the variables
come from the platform and no .env file exists.
"""
import os
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
except ImportError:
    pass


def _require(name: str, hint: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"{name} is not set. {hint} "
            "Locally you can put it in backend/.env — see backend/.env.example."
        )
    return value


def normalise_database_url(url: str) -> str:
    """Coerce a stock Postgres URL into the async driver form asyncpg needs.

    Hosting dashboards (Render, Supabase, Neon) hand out `postgresql://...`
    URLs, often with an `sslmode` query param that psycopg2 understands and
    asyncpg rejects. Fix both here so the deployed value can be pasted as-is.
    """
    parts = urlsplit(url)

    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"

    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in ("sslmode", "channel_binding")]

    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


DATABASE_URL = normalise_database_url(
    _require(
        "DATABASE_URL",
        "Set it to your Postgres connection string, e.g. "
        "postgresql+asyncpg://user:pass@host:6543/postgres.",
    )
)

# No default: a shipped signing key would let anyone forge an admin token.
SECRET_KEY = _require(
    "SECRET_KEY",
    'Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.',
)

if len(SECRET_KEY.encode("utf-8")) < 32:
    if os.getenv("ENVIRONMENT") == "production":
        raise RuntimeError(
            "Insecure SECRET_KEY: Key must be at least 32 bytes (256 bits). "
            'Generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"`.'
        )

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Allowed CORS origins (trusted origins list)
_default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
if _env_origins.strip():
    CORS_ORIGINS = [orig.strip() for orig in _env_origins.split(",") if orig.strip()]
else:
    CORS_ORIGINS = _default_origins

# Pattern matching trusted production frontend platforms (Vercel, Render) and local dev
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"^https://([a-zA-Z0-9-]+\.)*vercel\.app$|^https://([a-zA-Z0-9-]+\.)*onrender\.com$|^http://(localhost|127\.0\.0\.1)(:\d+)?$"
)


