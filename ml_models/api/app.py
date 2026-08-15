import os

from flask import Flask, request

try:
    from .prediction_api import prediction_bp
except ImportError:  # Support `python ml_models/api/app.py` from repository root.
    from ml_models.api.prediction_api import prediction_bp


def create_app():
    app = Flask(__name__)

    allowed_origins = {
        origin.strip()
        for origin in os.getenv("ML_CORS_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    }

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    # Register Blueprint
    app.register_blueprint(prediction_bp, url_prefix="/api")

    return app


app = create_app()


if __name__ == "__main__":

    print("=" * 50)
    print("      ML Prediction API")
    print("=" * 50)
    print("Server : http://localhost:5000")
    print()
    print("Endpoints:")
    print("GET  /api/health")
    print("GET  /api/model/info")
    print("POST /api/predict/energy")
    print("POST /api/predict/ac")
    print("POST /api/predict/all")
    print("POST /api/reload")
    print("=" * 50)

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )
