import os
from flask import Flask, render_template

from controllers.UserController import user_bp
from controllers.LocationController import location_bp

# =========================
# Paths (BackEnd Server -> ../FrontEnd Server)
# =========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONT_DIR = os.path.join(BASE_DIR, "..", "FrontEnd Server")

TEMPLATES_DIR = os.path.join(FRONT_DIR, "templates")
STATIC_DIR = os.path.join(FRONT_DIR, "static")

# =========================
# Flask App
# =========================
app = Flask(
    __name__,
    template_folder=TEMPLATES_DIR,
    static_folder=STATIC_DIR,
    static_url_path="/static"
)

# =========================
# Blueprints (API)
# =========================
app.register_blueprint(user_bp)
app.register_blueprint(location_bp)

# =========================
# Frontend Routes
# =========================
@app.get("/")
def index():
    # Página principal (tu index.html en FrontEnd Server/templates)
    # Si no existe, cambia a home.html o lo que tengas.
    return render_template("index.html")

@app.get("/login")
def login():
    return render_template("login.html")

@app.get("/register")
def register():
    return render_template("register.html")

@app.get("/app")
def app_page():
    return render_template("app.html")

# (opcional) healthcheck rápido backend (por si ocupas probar API)
@app.get("/api/health")
def api_health():
    return {"status": 0, "message": "Server is now up and running..."}

# =========================
# CORS
# =========================
@app.after_request
def add_cors_headers(response):
    # Si el frontend se sirve desde este mismo server (5010),
    # puedes dejar esto así o agregar 5010 también.
    response.headers["Access-Control-Allow-Origin"] = "http://127.0.0.1:5020"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response

# =========================
# Run
# =========================
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5010, debug=True)