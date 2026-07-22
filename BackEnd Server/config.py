import os
from dotenv import load_dotenv

# Read env data once for the whole backend (every module imports from here)
load_dotenv()

# ===== SQL Server =====
SQL_SERVER = os.getenv("SQL_SERVER")
SQL_DATABASE = os.getenv("SQL_DATABASE")
SQL_USER = os.getenv("SQL_USER")
SQL_PASSWORD = os.getenv("SQL_PASSWORD")

# ===== Auth =====
# JWT signing secret — must come from .env, never hardcoded
JWT_SECRET = os.getenv("JWT_SECRET")

# JWT expiry and cookie max_age share this single lifetime (avoids the old
# 2-minute-token vs 10-hour-cookie mismatch that caused random 401s)
TOKEN_HOURS = int(os.getenv("TOKEN_HOURS", "2"))
TOKEN_MAX_AGE_SECONDS = TOKEN_HOURS * 60 * 60

# ===== CORS =====
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://127.0.0.1:5020")
