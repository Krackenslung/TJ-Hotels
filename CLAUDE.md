# CLAUDE.md — TJ-Hotels

Guidance for working in this repository. (Note: the `CLAUDE.md` further up the tree describes an
unrelated "Recipe_app" project and does **not** apply here.)

## Project overview

**TJ-Hotels** is a web app for exploring hotels in Tijuana on an interactive map. Users register /
log in, browse nearby hotels pulled live from the **Google Maps Places API**, save favorites, and
send support messages. It is split into two independent Flask apps:

- **BackEnd Server** (port `5010`) — a JSON REST API backed by **SQL Server** (via `pyodbc`).
- **FrontEnd Server** (port `5020`) — a thin Flask app that serves HTML templates and static JS/CSS.
  Nearly all the interesting logic (maps, favorites, filters) runs client-side in the browser.

The frontend calls the backend cross-origin (`fetch` with `credentials: "include"`); the backend
sets permissive CORS headers scoped to `http://127.0.0.1:5020`.

## Running the app

Two servers, two terminals. Both are started by running their `server.py` directly (each file calls
`app.run(...)` at import time).

```powershell
# Terminal 1 — Backend API (http://127.0.0.1:5010)
cd "BackEnd Server"
python server.py

# Terminal 2 — Frontend (http://127.0.0.1:5020)
cd "FrontEnd Server"
python server.py
```

Open `http://127.0.0.1:5020` and use `/login`, `/register`, `/app`.

Backend dependencies are in `BackEnd Server/requirements.txt` (`pip install -r requirements.txt`).
The frontend needs only `flask`. The `SQLServerConnection` uses the **ODBC Driver 18 for SQL
Server**, which must be installed on the host. Both `server.py` files are guarded with
`if __name__ == "__main__"` — importing them does not launch the server.

## Database setup

Run `Hotels.sql` once in SSMS. It creates:

- Database **`Hotels`**
- Table **`Users`** (`id, name, lastname, dateOfBirth, username, password, phone, status`)
- Table **`Locations`** (`id, name, description, address, lat, lng, userID, status`, FK `userID → Users.id`)

There are no migrations — `Hotels.sql` is the schema source of truth. Passwords are stored as bcrypt
hashes; `Locations` are user-owned points intended to render on the map.

## Environment variables

Copy `BackEnd Server/.env.example` to `BackEnd Server/.env` and fill in real values. All config is
loaded once in `BackEnd Server/config.py`:

```
SQL_SERVER=       # e.g. localhost\SQLEXPRESS
SQL_DATABASE=Hotels
SQL_USER=
SQL_PASSWORD=
JWT_SECRET=       # required — the backend fails fast at import if missing
TOKEN_HOURS=2     # JWT expiry AND cookie max_age (single shared lifetime)
FRONTEND_ORIGIN=http://127.0.0.1:5020
```

`.env` is **gitignored** — never commit it. The frontend has no `.env`; the Google Maps browser key
lives in `FrontEnd Server/static/js/modules/config.js` (a Maps JS key is always visible client-side;
restrict it by HTTP referrer in Google Cloud Console).

## Architecture

### Backend (`BackEnd Server/`) — layered / MVC-ish

- **`server.py`** — `create_app()` app factory: registers blueprints, `/` health check, and the
  `after_request` CORS hook (origin from config). `app.run(host='127.0.0.1', port=5010, debug=True)`
  only under `if __name__ == "__main__"`.
- **`config.py`** — loads `.env` once; exposes SQL settings, `JWT_SECRET`, `TOKEN_HOURS` /
  `TOKEN_MAX_AGE_SECONDS`, `FRONTEND_ORIGIN`. Everything reads config from here, never `os.getenv`
  directly.
- **`utils.py`** — envelope helpers `ok()` / `fail()` and the `@handle_errors` decorator
  (record-not-found → 404, other exceptions → 500, always the JSON envelope). Routes use this
  instead of repeating try/except.
- **`controllers/`** — Flask **Blueprints** holding the routes:
  - `UserController.py` → `user_bp`: `GET/POST /users`, `GET /users/<id>`, `GET /me`,
    `POST /login`, `POST /logout`.
  - `LocationController.py` → `location_bp`: `GET/POST /locations`, `GET /locations/<id>`.
- **`models/`** — plain Python classes that own all SQL:
  - `SQLServerConnection.py` — static `get_connection()`; **raises `DatabaseConnectionError`** on
    missing config or connect failure (never returns `None`).
  - `User.py` — property-based model; bcrypt hashing happens in the `password` setter;
    `check_password`, `get_by_username`, `get_all[_json]`, `add`, `_load_by_id`. `to_json()`
    **excludes the password hash**.
  - `Location.py` — parallel model for map points; `get_all`, `get_by_user_id`, `add`, `_load_by_id`.
  - Both models raise a `RecordNotFound*` exception when a lookup misses.
- **`security/auth.py`** — JWT helpers (`generate_token`, `decode_token`) and the `require_auth`
  decorator. Secret and lifetime come from config; the module **fails fast at import** if
  `JWT_SECRET` is missing.

### Auth flow

1. `POST /login` verifies the username/password (bcrypt), then issues a JWT via `generate_token`.
2. The token is returned in an **httpOnly cookie named `auth_token`** (`secure`, `SameSite=Strict`).
   Cookie `max_age` and JWT expiry are the **same value** (`TOKEN_HOURS`, default 2 h).
3. Protected routes use the `@require_auth` decorator, which reads `auth_token` from
   `request.cookies`, decodes it, and stashes `request.user_id`. Missing/expired/invalid → `401`.
4. `GET /me` returns the current user for the cookie — the frontend hydrates its session from here
   on every page load instead of trusting `sessionStorage`.
5. `POST /logout` deletes the cookie.

### API response convention

Every endpoint returns a JSON envelope:

- Success: `{ "status": 0, "data": ... }` or `{ "status": 0, "message": ... }`
- Error: `{ "status": 1, "errorMessage": "..." }` (login uses `status: 2` for unexpected errors)

Use this shape for any new endpoints.

### Frontend (`FrontEnd Server/`)

- **`server.py`** — routes for `/`, `/login`, `/register`, `/app`, `/logout`; each renders a
  template. Runs on port `5020` with `debug=True` (guarded by `__main__`).
- **`templates/`** — `index.html`, `login.html`, `register.html`, `app.html`.
- **`static/js/`** — the `/app` SPA is split into **ES modules**:
  - `app.js` — thin entry point (`<script type="module">`): imports modules, wires the global
    input/click event delegation, boots with `hydrateSession()` + `setActiveView("inicio")`.
  - `modules/config.js` — `API_BASE`, Maps `API_KEY`, `DEFAULT_CENTER`.
  - `modules/dom.js` — the `$` id-selector helper.
  - `modules/session.js` — session cache (`sessionStorage` `tj_user`), `hydrateSession()` (GET
    `/me` — cookie is the source of truth), `updateUserInterface()`, `logout()`.
  - `modules/favorites.js` — favorites storage (`localStorage` `tj_favs`), pure; view refresh is
    the caller's job.
  - `modules/placeFilters.js` — shared client-side filters (`q`/rating/price/zone) over Places
    results, used by both maps.
  - `modules/hotelsMap.js` / `modules/favoritesMap.js` — the **`HotelsMap`** and **`FavoritesMap`**
    modules (Google Maps Places `nearbySearch` / `getDetails`).
  - `modules/views.js` — `setActiveView()`, featured/reviews lazy init, `applyFilters()`.
  - `modules/support.js` — support form (localStorage tickets + toast).
  - `auth.js` — login and register handlers (classic script, used by login/register pages).
  - `maps-loader.js`, `featured-places.js` — **classic (non-module) scripts** that expose
    `window.loadGoogleMapsOnce` / `window.FeaturedPlaces`; modules call them via `window`.
  - `map.js`, `login.js`, `script.js` — **legacy, unreferenced** by any template.
- **`static/styles/`** — `auth.css`, `app.css`, `ui.css`, `login_styles.css`.

Hotels are sourced **exclusively from the Google Places API** (the old `dummyHotels` array was
removed). Bootstrap, SweetAlert2 (`Swal`), and Bootstrap Icons are used from CDNs in the templates.

## Conventions

- **Preserve existing comments** when editing — including the commented-out alternate
  implementations (e.g. the header/Bearer version of `require_auth`, the old `login`). Do not delete them.
- Models expose data through Python `@property` getters/setters and serialize with a `to_json()`
  method; follow that pattern for new fields.
- SQL is always parameterized with `?` placeholders through `pyodbc` — keep it that way.
- Keep the `{ status, data | message | errorMessage }` response envelope on all routes.

## Known rough edges (do not "fix" silently — confirm intent first)

- The Google Maps browser key in `modules/config.js` is visible client-side by nature — it should be
  referrer-restricted in Google Cloud Console (cannot be fixed in code).
- `map.js`, `login.js`, `script.js` in `static/js/` and `BackEnd Server/security/Index.html` +
  `script.js` are legacy files referenced by nothing; kept on purpose, do not extend them.
- The `Locations` table/endpoints exist but the map UI sources hotels from Places only; `Locations`
  is reserved for future user-saved points.
- The support form stores tickets in `localStorage` only — there is no backend endpoint for it.
