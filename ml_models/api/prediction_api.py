from flask import Blueprint, jsonify, request

from ml_models.contracts import ContractError
from ml_models.services.prediction_service import (
    model_info,
    predict_ac,
    predict_all,
    predict_energy,
    reload_models,
)

prediction_bp = Blueprint("prediction", __name__)


def _json_payload():
    return request.get_json(silent=True)


def _prediction_response(predictor):
    try:
        return jsonify(predictor(_json_payload()))
    except ContractError as exc:
        return jsonify({"error": "invalid_telemetry", "message": str(exc)}), 400


@prediction_bp.get("/health")
def health():
    return jsonify({"status": "healthy", "service": "Twinuvo Prediction API"})


@prediction_bp.get("/model/info")
def info():
    return jsonify(model_info())


@prediction_bp.post("/reload")
def reload():
    return jsonify({"success": True, "models": reload_models()})


@prediction_bp.post("/predict/energy")
def energy():
    return _prediction_response(predict_energy)


@prediction_bp.post("/predict/ac")
def ac():
    return _prediction_response(predict_ac)


@prediction_bp.post("/predict/all")
def all_prediction():
    return _prediction_response(predict_all)
