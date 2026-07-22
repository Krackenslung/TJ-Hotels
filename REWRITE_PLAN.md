# TJ-Hotels — Rewrite Plan

A staged plan to rewrite TJ-Hotels with the architecture corrections. The goal is **not** a
from-scratch rebuild: it keeps the existing feature set, the SQL Server + Flask + vanilla-JS stack,
and the project's conventions, while fixing the structural, security, and correctness problems
documented in `CLAUDE.md`.

## Guiding principles

- **Preserve behavior.** Same features (register, login, hotel map via Google Places, favorites,
  support form). No visible feature regressions.
- **Preserve conventions.** Keep the `{ status, data | message | errorMessage }` response envelope,
  parameterized SQL (`?` placeholders), property-based models with `to_json()`, and **keep existing
  comments** (including the commented-out alternate implementations).
- **Small, verifiable steps.** Each phase leaves the app runnable. Don't merge phases.
- **Config over hardcoding.** No secrets in source; no `app.run()` at import time.

## Target architecture (what changes vs. today)

| Area | Today | After rewrite |
|------|-------|---------------|
| Secrets | `SECRET_KEY` + Maps `API_KEY` hardcoded, `.env` committed | All from `.env`; `.env` gitignored; `.env.example` shipped |
| Backend entry | `app.run()` runs at import | `create_app()` factory + `if __name__ == "__main__"` guard |
| Dependencies | none declared | `requirements.txt` (backend) |
| Config | scattered `os.getenv` + hardcoded secret | single `config.py` reading `.env` once |
| DB connection | new ODBC connection per query; returns `None` on failure | reusable helper; **raises** on failure |
| Errors | same `try/except` copied into every route | central `@errorhandler` + envelope helper |
| Auth | cookie `require_auth` active, Bearer version commented; frontend trusts `sessionStorage` | cookie is source of truth; add `GET /me`; frontend hydrates from `/me` |
| Token vs cookie | token 2 min, cookie 10 h → random 401s | single aligned lifetime (e.g. 2 h) |
| Known bugs | `GET /locations/<id>` ignores id; `Location.__load_by_id` name-mangled | both fixed |
| Frontend JS | one ~1400-line `app.js` | split into ES modules |
| Hotel data | dummy JS + live Places + unused `Locations` table | one documented source of truth |

## Proposed folder structure

### Backend (`BackEnd Server/`)

```
BackEnd Server/
  server.py              # thin: create_app() + __main__ guard only
  config.py              # NEW — loads .env once, exposes Config object
  requirements.txt       # NEW
  .env.example           # NEW — documents required vars, no real values
  .gitignore             # NEW — ignores .env, __pycache__, venv
  app/                   # NEW package (or keep flat if preferred)
    __init__.py          # create_app() factory: registers blueprints, CORS, error handlers
    extensions.py        # shared helpers (envelope, error handlers)
  controllers/
    UserController.py     # user_bp — adds GET /me
    LocationController.py  # location_bp — GET /locations/<id> fixed
  models/
    SQLServerConnection.py # raises on failure; reusable connection
    User.py
    Location.py            # _load_by_id fixed (no name-mangling)
  security/
    auth.py               # SECRET_KEY from config; aligned token lifetime
```

> Keeping the flat `controllers/ models/ security/` layout is fine — the important change is the
> `create_app()` factory and `config.py`, not moving files. Adopt the `app/` package only if it
> feels natural.

### Frontend (`FrontEnd Server/`)

```
FrontEnd Server/
  server.py
  static/js/
    app.js               # thin bootstrap: wire events, call setActiveView
    modules/             # NEW
      views.js           # setActiveView, hideAllViews, router
      hotelsMap.js       # HotelsMap module
      favoritesMap.js    # FavoritesMap module
      favorites.js       # getFavs/setFavs/toggleFavorite (localStorage)
      session.js         # getSession/clearSession + /me hydration
      support.js         # support form
    maps-loader.js       # unchanged
    auth.js              # unchanged (or fold into modules/session.js)
```

## Endpoints after rewrite

Existing (unchanged contract):

- `GET  /` — health check
- `GET  /users` — list users *(auth)*
- `GET  /users/<id>` — user + their locations *(auth)*
- `POST /users` — register
- `POST /login` — sets `auth_token` cookie
- `POST /logout` — clears cookie
- `GET  /locations` — list locations
- `GET  /locations/<id>` — **fixed** to actually load by id
- `POST /locations` — add location

New:

- `GET /me` — returns the current user from the `auth_token` cookie *(auth)*. Frontend calls this on
  load instead of trusting `sessionStorage`.

All responses keep the `{ status, data | message | errorMessage }` envelope.

## Implementation phases

Each phase is independently committable and leaves the app runnable.

### Phase 0 — Safety net
- `git rm --cached "BackEnd Server/.env"`, add `.gitignore`, add `.env.example`.
- Add `requirements.txt` (`flask`, `pyodbc`, `python-dotenv`, `bcrypt`, `pyjwt`).
- **Verify:** fresh clone → `pip install -r requirements.txt` → both servers start.

### Phase 1 — Config & entry point
- Add `config.py` reading `.env` once (SQL creds, `SECRET_KEY`, token lifetime, CORS origin).
- Convert backend `server.py` to a `create_app()` factory; guard `app.run()` with `__main__`.
- Move `SECRET_KEY` in `security/auth.py` to read from config.
- **Verify:** backend starts, `/login` still issues a cookie, protected route still works.

### Phase 2 — DB connection & error handling
- `SQLServerConnection.get_connection()` **raises** a clear exception on missing config / connect
  failure instead of returning `None`.
- Add a central error handler + envelope helper; remove the repeated `try/except` from controllers.
- **Verify:** stop SQL Server → requests return a clean `{status:1, errorMessage}` instead of a
  `NoneType` crash.

### Phase 3 — Fix known bugs
- `LocationController.get_location_by_id`: load the real record by id.
- `Location`: rename `__load_by_id` → `_load_by_id` (or fix the caller) so `Location([id])` works.
- **Verify:** `GET /locations/<id>` returns the requested row; loading a location by id doesn't
  throw `AttributeError`.

### Phase 4 — Auth consolidation
- Align token and cookie lifetimes (pick one, e.g. 2 h).
- Add `GET /me`.
- Frontend: hydrate session from `/me` on load; keep `sessionStorage` only as a UI cache, not the
  source of truth.
- **Verify:** log in, wait past old 2-min window, refresh `/app` → still authenticated; clearing
  `sessionStorage` and reloading re-hydrates from `/me`.

### Phase 5 — Frontend modularization *(optional, do only if actively working in `app.js`)*
- Split `app.js` into `modules/` as above; remove the `setActiveView` monkeypatch at the bottom in
  favor of a small event/router.
- **Verify:** every view (inicio, hoteles, favoritos, zonas, ofertas, soporte) still works;
  favorites persist; maps load once.

### Phase 6 — Data source decision *(product call, not just code)*
- Decide: are hotels sourced from **Google Places** (current live behavior) or curated in the
  **`Locations`** table? Document the decision and remove the two dead paths (dummy JS array and/or
  unused table) so there's one source of truth.

## Out of scope (explicitly not doing now)

- Switching frameworks, ORM, or database.
- Rewriting the frontend to a SPA framework (React/Vue).
- Real hosting / HTTPS / production hardening beyond secret management.
- Migrations tooling — `Hotels.sql` stays the schema source of truth.

## Definition of done

- No secrets in source; `.env` gitignored with a committed `.env.example`.
- `pip install -r requirements.txt` from a clean clone gets the backend running.
- Backend importable without launching (factory + `__main__` guard).
- The two known bugs are fixed and verified.
- One auth mechanism; no unexpected `401`s from lifetime mismatch.
- All endpoints keep the response envelope; existing comments preserved.
