"""Prepare the ignored local model bundle that will be registered in Azure ML."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

EXPECTED = {
    "power_estimator": {
        "filename": "model_xgb_daya.json",
        "sha256": "6d361a5d4270e3d3817f7f72f4845ce9f376e9badd6902fe994fabcffb146b3b",
    },
    "forecast_30m": {
        "filename": "xgb_power_forecast.json",
        "sha256": "1bc35923c281987a9f24c71f2c90b99699955d3a5394e051d0a14f36e9e30195",
    },
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare(estimator: Path, forecast: Path, output: Path) -> Path:
    sources = {"power_estimator": estimator, "forecast_30m": forecast}
    for name, source in sources.items():
        if not source.is_file():
            raise FileNotFoundError(source)
        actual = sha256(source)
        if actual != EXPECTED[name]["sha256"]:
            raise ValueError(f"SHA-256 {name} tidak cocok: {actual}")

    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "bundle_name": "twinuvo-energy-model-bundle",
        "bundle_version": 1,
        "model_status": "candidate",
        "created_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "models": {},
    }
    for name, source in sources.items():
        destination_dir = output / name
        destination_dir.mkdir(exist_ok=True)
        destination = destination_dir / EXPECTED[name]["filename"]
        shutil.copy2(source, destination)
        manifest["models"][name] = {
            "file": str(destination.relative_to(output)),
            "sha256": sha256(destination),
            "xgboost_version": "3.3.0",
        }

    metadata_source = forecast.parent / "model_metadata.json"
    if metadata_source.is_file():
        shutil.copy2(metadata_source, output / "forecast_30m" / "model_metadata.json")

    manifest_path = output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--estimator", type=Path, required=True)
    parser.add_argument("--forecast", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "models" / "azure_bundle",
    )
    args = parser.parse_args()
    print(prepare(args.estimator, args.forecast, args.output))


if __name__ == "__main__":
    main()
