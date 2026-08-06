# Twinuvo BIM asset

This directory contains the web-ready Twinuvo house BIM exported directly
from the active Autodesk Revit 2025 model. The dashboard loads one GLB at a
time so switching LoD does not keep unused building geometry in memory.

## Source and accuracy

- Site anchor: `-7.722901841918586, 110.51870499972996` (user supplied).
- Metric CRS: WGS 84 / UTM zone 49S (`EPSG:32749`).
- Footprint: OpenStreetMap way `1017791778`, checked against Esri World
  Imagery in QGIS.
- Footprint dimensions: approximately `6.706 m x 22.366 m`.
- Horizontal geometry is desktop-digitized and is not a cadastral or field
  survey.
- Wall and roof heights remain design assumptions until field measurements
  are available: wall `3.100 m`, gable roof `1.050 m`.

## Level of detail assets

- `twinuvo_lod1.glb` / `DT_LOD1`: 1 mass element, 12 triangles.
- `twinuvo_lod2.glb` / `DT_LOD2`: native shell, openings, roof, and foundations.
- `twinuvo_lod3.glb` / `DT_LOD3`: LoD2 plus native roof structural framing.
- `twinuvo_lod4.glb` / `DT_LOD4`: LoD3 plus operational data, electrical,
  and lighting assets.

All assets use metres, glTF Y-up coordinates, Revit material colors, and BIM
metadata on nodes (`revitElementId`, category, family, type, mark, comments,
and LoD). Re-export them with `tools/revit_export_twinuvo_glb.py` through the
local Revit MCP after the source BIM changes.

The machine-readable spatial and semantic contract is in
`twin-manifest.json`.
