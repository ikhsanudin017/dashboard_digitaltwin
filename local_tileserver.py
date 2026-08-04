"""
MBTiles Tile Server untuk Digital Twin Dashboard
Serve local tiles dari file yogyakarta.mbtiles

Run: python local_tileserver.py
Akses: http://localhost:8080/tiles/{z}/{x}/{y}.png
"""

from flask import Flask, send_file, abort
import sqlite3
import os

app = Flask(__name__)

# Path ke file MBTiles
MBTILES_PATH = os.path.join(
    os.path.dirname(__file__),
    '..',
    'yogyakarta.mbtiles'
)


def get_tile(z, x, y):
    """Ambil tile dari MBTiles. y dinverted karena MBTiles pakai TMS format."""
    conn = sqlite3.connect(MBTILES_PATH)
    cur = conn.cursor()
    # MBTiles standard: row dihitung dari bawah (TMS format)
    tms_y = (2 ** z) - 1 - y
    cur.execute(
        'SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?',
        (z, x, tms_y)
    )
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


@app.route('/tiles/<int:z>/<int:x>/<int:y>.png')
def tile_png(z, x, y):
    data = get_tile(z, x, y)
    if data:
        # Detect mimetype from first bytes
        if data[:3] == b'\xff\xd8\xff':
            return send_file(data, mimetype='image/jpeg')
        return send_file(data, mimetype='image/png')
    return '', 404


@app.route('/tiles/<int:z>/<int:x>/<int:y>.jpg')
@app.route('/tiles/<int:z>/<int:x>/<int:y>.jpeg')
def tile_jpg(z, x, y):
    data = get_tile(z, x, y)
    if data:
        return send_file(data, mimetype='image/jpeg')
    return '', 404


@app.route('/metadata')
def metadata():
    """Info tentang tile set"""
    conn = sqlite3.connect(MBTILES_PATH)
    cur = conn.cursor()
    cur.execute('SELECT name, value FROM metadata')
    meta = {name: value for name, value in cur.fetchall()}
    conn.close()
    return meta


@app.route('/')
def index():
    return {
        'name': 'Digital Twin Yogyakarta Tiles',
        'endpoints': [
            '/tiles/{z}/{x}/{y}.png',
            '/tiles/{z}/{x}/{y}.jpg',
            '/metadata'
        ]
    }


if __name__ == '__main__':
    print(f'🗺️  MBTiles Tile Server')
    print(f'   File: {MBTILES_PATH}')
    print(f'   URL:  http://localhost:8080/tiles/{{z}}/{{x}}/{{y}}.png')
    print()
    app.run(host='0.0.0.0', port=8080, debug=False)