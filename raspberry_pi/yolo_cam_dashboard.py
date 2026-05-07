#!/usr/bin/env python3
"""
YOLO Camera - dengan /frame endpoint untuk dashboard integration
"""
import os
os.environ["TORCH_LOAD_WEIGHTS_ONLY"] = "false"
import cv2
import numpy as np
import threading
import time
from flask import Flask, jsonify, Response, send_file
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)  # Allow all origins for development
CAM = 0
CONF = 0.35
MODEL = "yolov8n.pt"
W, H = 480, 360

people_count = 0
detections = []
latest_frame = None
processed_frame = None
flock = threading.Lock()
dlock = threading.Lock()
model = None
frame_cache = None
cache_time = 0

def load_model():
    global model
    import urllib.request
    if not os.path.exists(MODEL):
        print("Downloading YOLOv8 model...")
        urllib.request.urlretrieve("https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt", MODEL)
    model = YOLO(MODEL)
    print("YOLOv8 loaded")

def capture_loop():
    global latest_frame
    while model is None:
        time.sleep(0.1)

    cap = cv2.VideoCapture(CAM)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, H)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    print(f"Camera {W}x{H}")

    while True:
        ret, frame = cap.read()
        if ret:
            with flock:
                latest_frame = frame
        time.sleep(0.033)

def detect_loop():
    global people_count, detections, processed_frame, frame_cache, cache_time
    while model is None:
        time.sleep(0.1)

    last_detect = 0
    while True:
        with flock:
            frame = latest_frame

        if frame is None:
            time.sleep(0.1)
            continue

        now = time.time()
        if now - last_detect >= 0.15:
            last_detect = now
            try:
                results = model(frame, conf=CONF, classes=[0], imgsz=320, verbose=False)
                boxes = []
                count = 0
                proc = frame.copy()
                for r in results:
                    if r.boxes is not None:
                        for box in r.boxes:
                            if int(box.cls[0]) == 0:
                                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                                conf = float(box.conf[0])
                                boxes.append({"bbox": [int(x1), int(y1), int(x2), int(y2)], "conf": round(conf, 2)})
                                count += 1
                                cv2.rectangle(proc, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                                cv2.putText(proc, str(round(conf, 2)), (int(x1), int(y1)-5),
                                          cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)
                with dlock:
                    people_count = count
                    detections = boxes

                # Add count overlay
                cv2.rectangle(proc, (5, 5), (100, 40), (0, 0, 0), -1)
                cv2.putText(proc, str(count), (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                with dlock:
                    processed_frame = proc

                # Cache the processed frame for /frame endpoint
                ret, buf = cv2.imencode(".jpg", proc, [cv2.IMWRITE_JPEG_QUALITY, 75])
                if ret:
                    frame_cache = buf.tobytes()
                    cache_time = now
            except:
                pass

        time.sleep(0.01)

def gen():
    """MJPEG generator for direct streaming"""
    while True:
        with dlock:
            frame = processed_frame
        with flock:
            if frame is None:
                frame = latest_frame
        if frame is None:
            frame = np.zeros((H, W, 3), dtype=np.uint8)

        cv2.rectangle(frame, (5, 5), (100, 40), (0, 0, 0), -1)
        cv2.putText(frame, str(people_count), (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        ret, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
        if ret:
            yield(b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + buf.tobytes() + b"\r\n")

        time.sleep(0.05)

@app.route("/frame")
def frame():
    """Single frame endpoint - return cached processed frame"""
    global frame_cache, cache_time

    # Return cached frame if fresh (< 1s)
    if frame_cache and (time.time() - cache_time) < 1.0:
        return Response(frame_cache, mimetype='image/jpeg')

    # Generate new frame if cache stale
    with dlock:
        f = processed_frame
    if f is None:
        with flock:
            f = latest_frame
    if f is None:
        f = np.zeros((H, W, 3), dtype=np.uint8)

    ret, buf = cv2.imencode(".jpg", f, [cv2.IMWRITE_JPEG_QUALITY, 75])
    if ret:
        return Response(buf.tobytes(), mimetype='image/jpeg')
    return Response(b'', mimetype='image/jpeg')

@app.route("/")
def index():
    return '''<!DOCTYPE html>
<html><head><title>YOLO CCTV</title>
<style>
*{margin:0;padding:0}
body{background:#111;text-align:center;font-family:Arial}
img{max-width:100%;border:2px solid #0f0}
.c{color:#0f0;font-size:24px;padding:15px}
</style>
</head><body>
<h2 style="color:#0f0;padding:10px">YOLOv8</h2>
<img src="/mjpeg">
<div class="c">People: <span id="c">0</span></div>
<script>
setInterval(()=>fetch("/count").then(r=>r.json()).then(d=>{
    document.getElementById("c").textContent=d.count;
}).catch(()=>{}),500);
</script></body></html>'''

@app.route("/mjpeg")
def mjpeg():
    return Response(gen(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/count")
def count():
    with dlock:
        return jsonify({"count": people_count, "detections": detections})

@app.route("/status")
def status():
    return jsonify({"status": "ok", "ip": "192.168.1.14", "model": "yolov8n"})

if __name__ == "__main__":
    print("YOLOv8 v8 - Dashboard Ready")
    load_model()
    t1 = threading.Thread(target=capture_loop, daemon=True)
    t2 = threading.Thread(target=detect_loop, daemon=True)
    t1.start()
    t2.start()
    print("Open: http://192.168.1.2:5000/")
    app.run(host="0.0.0.0", port=5000, threaded=True)