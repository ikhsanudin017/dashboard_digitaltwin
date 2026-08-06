"""Azure Functions-compatible adapter for the prediction service.

The deployment wrapper can pass an ``azure.functions.HttpRequest`` instance to
``main``. Keeping Azure-specific imports outside this module makes core tests
independent from the cloud runtime.
"""

from __future__ import annotations

import json

from ml_models.contracts import ContractError
from ml_models.services.prediction_service import predict_all


def _response(status: int, payload: dict) -> dict:
    return {
        "status": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(payload),
    }


def main(req):
    try:
        result = predict_all(req.get_json())
        return _response(200, {"success": True, "data": result})
    except ContractError as exc:
        return _response(400, {"success": False, "error": "invalid_telemetry", "message": str(exc)})
    except Exception:
        # Do not leak implementation details or credentials in HTTP responses.
        return _response(500, {"success": False, "error": "prediction_failed"})
