"""
Google Earth Engine Server for Digital Twin Dashboard
Serves GEE analysis as tile layers for Cesium visualization

Location: -7.722649267245097, 110.51904046867396 (Yogyakarta, Indonesia)

Usage:
    1. Authenticate: earthengine authenticate
    2. Run: python gee_server.py
    3. Access: http://localhost:5000
"""

import os
import flask
from flask import jsonify, request
import json

# Try to import earthengine-api
try:
    import ee
    GEE_AVAILABLE = True
except ImportError:
    GEE_AVAILABLE = False
    print("⚠️ earthengine-api not installed. Run: pip install earthengine-api")

# Target location (Digital Twin Home)
LOCATION = {
    'lat': -7.722649267245097,
    'lon': 110.51904046867396,
    'name': 'Digital Twin Home, Yogyakarta'
}

# Region of interest (small area around location)
ROI = ee.Geometry.Point([LOCATION['lon'], LOCATION['lat']]).buffer(500)  # 500m radius

app = flask.Flask(__name__)

def initialize_gee():
    """Initialize GEE with service account or user credentials"""
    if not GEE_AVAILABLE:
        return False

    try:
        # Try to initialize with default credentials
        ee.Initialize(
            project='ee-digitaltwin-dashboard',
            opt_url='https://earthengine.googleapis.com'
        )
        return True
    except Exception as e:
        print(f"⚠️ GEE init failed: {e}")
        try:
            # Fallback: Initialize with default project
            ee.Initialize()
            return True
        except Exception as e2:
            print(f"⚠️ GEE init fallback failed: {e2}")
            return False

# Initialize on module load
gee_initialized = initialize_gee() if GEE_AVAILABLE else False

@app.route('/')
def index():
    """Health check and API info"""
    return jsonify({
        'status': 'running',
        'service': 'GEE Server for Digital Twin',
        'gee_available': GEE_AVAILABLE,
        'gee_initialized': gee_initialized,
        'location': LOCATION,
        'endpoints': {
            '/api/health': 'Health check',
            '/api/location': 'Get target location info',
            '/api/gee/ndvi': 'Get NDVI tile URL for Cesium',
            '/api/gee/landsat': 'Get Landsat imagery tile URL',
            '/api/gee/terrain': 'Get SRTM terrain visualization',
            '/api/gee/analysis': 'Get all analysis layers'
        }
    })

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'gee_available': GEE_AVAILABLE,
        'gee_initialized': gee_initialized
    })

@app.route('/api/location')
def get_location():
    """Get Digital Twin location info"""
    return jsonify({
        'location': LOCATION,
        'roi': {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [LOCATION['lon'], LOCATION['lat']]
            },
            'properties': {
                'name': LOCATION['name'],
                'buffer_meters': 500
            }
        }
    })

@app.route('/api/gee/ndvi')
def get_ndvi():
    """
    Get NDVI (Normalized Difference Vegetation Index) tile URL
    Uses Landsat 8/9 Surface Reflectance
    """
    if not gee_initialized:
        return jsonify({
            'error': 'GEE not initialized',
            'fallback': True,
            'mock_url': 'https://tile.openstreetmap.de/{z}/{x}/{y}.png'
        }), 503

    try:
        # Use Landsat 8/9 Collection 2 Level 2 (Surface Reflectance)
        # Path 123, Row 45 covers Yogyakarta area
        landsat = ee.Image('LANDSAT/LC09/C02/T1_L2/LC09_123045_20231015')

        # Calculate NDVI: (NIR - Red) / (NIR + Red)
        # Band 5 = NIR, Band 4 = Red
        ndvi = landsat.normalizedDifference(['SR_B5', 'SR_B4'])

        # Get map ID with color palette
        # Green = high vegetation, Red = low/urban
        ndvi_vis = {
            'min': -0.5,
            'max': 1.0,
            'palette': 'red,orange,yellow,lightgreen,green,darkgreen'
        }

        map_id = ndvi.getMapId(ndvi_vis)

        return jsonify({
            'status': 'success',
            'layer': 'NDVI',
            'source': 'Landsat 9 (LC09)',
            'date': '2023-10-15',
            'location': LOCATION,
            'tile_url': map_id['tile_fetcher url_format'],
            'legend': {
                'low': 'red',
                'medium': 'yellow',
                'high': 'green'
            },
            'description': 'Normalized Difference Vegetation Index - Higher values indicate healthier vegetation'
        })

    except Exception as e:
        return jsonify({
            'error': str(e),
            'fallback': True
        }), 500

@app.route('/api/gee/landsat')
def get_landsat():
    """
    Get Landsat natural color composite tile URL
    """
    if not gee_initialized:
        return jsonify({
            'error': 'GEE not initialized',
            'fallback': True
        }), 503

    try:
        # Landsat 8/9 with natural color (RGB)
        landsat = ee.Image('LANDSAT/LC09/C02/T1_L2/LC09_123045_20231015')

        # Natural color visualization
        # Band 4 = Red, Band 3 = Green, Band 2 = Blue
        landsat_rgb = landsat.select(['SR_B4', 'SR_B3', 'SR_B2'])

        map_id = landsat_rgb.getMapId({
            'min': 5000,
            'max': 15000
        })

        return jsonify({
            'status': 'success',
            'layer': 'Landsat True Color',
            'source': 'Landsat 9 (LC09)',
            'date': '2023-10-15',
            'location': LOCATION,
            'tile_url': map_id['tile_fetcher url_format'],
            'description': 'Natural color satellite imagery from Landsat 9'
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/gee/terrain')
def get_terrain():
    """
    Get SRTM terrain visualization
    """
    if not gee_initialized:
        return jsonify({
            'error': 'GEE not initialized',
            'fallback': True
        }), 503

    try:
        # NASA SRTM Digital Elevation Model 30m
        dem = ee.Image('USGS/SRTMGL1_003')

        # Apply hillshade for 3D effect
        hillshade = ee.Terrain.hillshade(dem)

        map_id = hillshade.getMapId({
            'min': 150,
            'max': 200,
            'palette': 'white,gray,darkgray,brown'
        })

        return jsonify({
            'status': 'success',
            'layer': 'Terrain Elevation',
            'source': 'NASA SRTM 30m',
            'location': LOCATION,
            'tile_url': map_id['tile_fetcher url_format'],
            'description': 'Digital Elevation Model with hillshade visualization'
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/gee/analysis')
def get_all_analysis():
    """
    Get all GEE analysis layers
    """
    if not gee_initialized:
        return jsonify({
            'error': 'GEE not initialized',
            'layers': []
        }), 503

    try:
        # Get multiple layers
        landsat = ee.Image('LANDSAT/LC09/C02/T1_L2/LC09_123045_20231015')
        dem = ee.Image('USGS/SRTMGL1_003')

        # NDVI
        ndvi = landsat.normalizedDifference(['SR_B5', 'SR_B4'])
        ndvi_map = ndvi.getMapId({
            'min': -0.5, 'max': 1.0,
            'palette': 'red,orange,yellow,green'
        })

        # Natural Color
        rgb = landsat.select(['SR_B4', 'SR_B3', 'SR_B2'])
        rgb_map = rgb.getMapId({'min': 5000, 'max': 15000})

        # Terrain
        hillshade = ee.Terrain.hillshade(dem)
        terrain_map = hillshade.getMapId({
            'min': 150, 'max': 200,
            'palette': 'white,brown'
        })

        return jsonify({
            'status': 'success',
            'location': LOCATION,
            'layers': [
                {
                    'id': 'ndvi',
                    'name': 'Vegetation Index (NDVI)',
                    'tile_url': ndvi_map['tile_fetcher url_format'],
                    'description': 'Plant health indicator'
                },
                {
                    'id': 'landsat',
                    'name': 'Landsat True Color',
                    'tile_url': rgb_map['tile_fetcher url_format'],
                    'description': 'Natural color satellite'
                },
                {
                    'id': 'terrain',
                    'name': 'Terrain Elevation',
                    'tile_url': terrain_map['tile_fetcher url_format'],
                    'description': 'Digital elevation model'
                }
            ]
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/gee/timeseries')
def get_timeseries():
    """
    Get time-series data for the location
    Landsat historical from 2015-2024
    """
    if not gee_initialized:
        return jsonify({
            'error': 'GEE not initialized',
            'fallback': True
        }), 503

    try:
        # Filter Landsat collection for the location
        collection = (ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
                     .filterDate('2015-01-01', '2024-12-31')
                     .filterBounds(ROI))

        # Get NDVI time series
        def add_ndvi(img):
            ndvi = img.normalizedDifference(['SR_B5', 'SR_B4']).rename('ndvi')
            return img.addBands(ndvi)

        with_ndvi = collection.map(add_ndvi)

        # Extract time series for point location
        time_series = with_ndvi.select('ndvi').getRegion(ROI.centroid(), 30)

        return jsonify({
            'status': 'success',
            'location': LOCATION,
            'dates': ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
            'note': 'Time series extraction in progress - use GEE Code Editor for full analysis'
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/api/gee/lulc')
def get_landcover():
    """
    Get Land Use/Land Cover classification
    """
    if not gee_initialized:
        return jsonify({
            'error': 'GEE not initialized'
        }), 503

    try:
        # Copernicus Global Land Cover
        lulc = ee.Image('COPERNICUS/Landcover/100m/Proba-V-C3/Global')

        # Annual classification
        map_id = lulc.getMapId({
            'min': 0,
            'max': 200,
            'palette': 'green,forest,olive,orange,urban'
        })

        return jsonify({
            'status': 'success',
            'layer': 'Land Use/Land Cover',
            'source': 'Copernicus Global Land Cover 100m',
            'location': LOCATION,
            'tile_url': map_id['tile_fetcher url_format'],
            'description': 'Land cover classification including forest, agriculture, urban'
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 50)
    print("🌍 GEE Server for Digital Twin Dashboard")
    print("=" * 50)
    print(f"Location: {LOCATION['name']}")
    print(f"Coordinates: {LOCATION['lat']}, {LOCATION['lon']}")
    print(f"GEE Status: {'✅ Connected' if gee_initialized else '⚠️ Not initialized'}")
    print()
    print("Endpoints:")
    print("  GET /api/health - Health check")
    print("  GET /api/location - Location info")
    print("  GET /api/gee/ndvi - Vegetation Index")
    print("  GET /api/gee/landsat - Satellite imagery")
    print("  GET /api/gee/terrain - Terrain elevation")
    print("  GET /api/gee/analysis - All layers")
    print("  GET /api/gee/lulc - Land cover")
    print()
    print("Server running on http://localhost:5000")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)