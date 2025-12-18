#!/usr/bin/env python3
"""
USB Webcam dengan People Detection AKURAT
Menggunakan YOLO v4-tiny (State-of-the-art object detection)
"""

import cv2
from flask import Flask, Response
from flask_cors import CORS
import threading
import time
import json
import paho.mqtt.client as mqtt
import ssl
from datetime import datetime
import numpy as np

# ===== KONFIGURASI =====
WEBCAM_PORT = 0
STREAM_PORT = 5000
FRAME_WIDTH = 320  # Resolusi kecil untuk performa tinggi
FRAME_HEIGHT = 240

# ===== MQTT =====
MQTT_BROKER = "aa736fd1494847d087ef6244a8428cf9.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USERNAME = "digitaltwin"
MQTT_PASSWORD = "Digitaltwin1"
MQTT_TOPIC = "sensor/camera/people"
MQTT_CLIENT_ID = "RASPBERRY_PI_CAMERA_001"

# ===== DETECTION =====
CONFIDENCE_THRESHOLD = 0.5  # 50% confidence minimum
NMS_THRESHOLD = 0.4  # Non-maximum suppression
PUBLISH_INTERVAL = 5
INPUT_SIZE = 224  # Input size untuk YOLO (kecil untuk speed)

# ===== INISIALISASI =====
app = Flask(__name__)
CORS(app)
camera = None
output_frame = None
lock = threading.Lock()
people_count = 0
mqtt_client = None
mqtt_connected = False
net = None
output_layers = None
classes = None

def download_yolo_files():
    """Download YOLO v4-tiny files"""
    import os
    import urllib.request
    
    files = {
        'yolov4-tiny.cfg': 'https://raw.githubusercontent.com/AlexeyAB/darknet/master/cfg/yolov4-tiny.cfg',
        'yolov4-tiny.weights': 'https://github.com/AlexeyAB/darknet/releases/download/darknet_yolo_v4_pre/yolov4-tiny.weights',
        'coco.names': 'https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names'
    }
    
    for filename, url in files.items():
        if not os.path.exists(filename):
            print(f"📥 Downloading {filename}...")
            try:
                urllib.request.urlretrieve(url, filename)
                print(f"✓ {filename} downloaded")
            except Exception as e:
                print(f"✗ Error downloading {filename}: {e}")
                return False
    
    return True

def init_yolo():
    """Inisialisasi YOLO v4-tiny"""
    global net, output_layers, classes
    
    print("🤖 Initializing YOLO v4-tiny detector...")
    
    if not download_yolo_files():
        print("✗ Failed to download YOLO files")
        return False
    
    try:
        # Load YOLO
        net = cv2.dnn.readNet("yolov4-tiny.weights", "yolov4-tiny.cfg")
        
        # Set backend and target
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        
        # Get output layers
        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
        
        # Load class names
        with open("coco.names", "r") as f:
            classes = [line.strip() for line in f.readlines()]
        
        print("✓ YOLO v4-tiny loaded successfully")
        print(f"  Classes: {len(classes)}")
        print(f"  Output layers: {len(output_layers)}")
        return True
        
    except Exception as e:
        print(f"✗ Error loading YOLO: {e}")
        return False

def on_connect(client, userdata, flags, rc):
    global mqtt_connected
    mqtt_connected = (rc == 0)
    if mqtt_connected:
        print("✓ MQTT connected")

def on_disconnect(client, userdata, rc):
    global mqtt_connected
    mqtt_connected = False

def init_mqtt():
    global mqtt_client
    print("🔌 Initializing MQTT...")
    mqtt_client = mqtt.Client(client_id=MQTT_CLIENT_ID)
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLSv1_2)
    mqtt_client.tls_insecure_set(False)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_disconnect = on_disconnect
    
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        return True
    except Exception as e:
        print(f"✗ MQTT error: {e}")
        return False

def publish_people_count(count):
    if not mqtt_connected:
        return
    try:
        payload = {
            "deviceId": MQTT_CLIENT_ID,
            "jumlahOrang": count,
            "timestamp": datetime.now().isoformat(),
            "location": "Ruang Server"
        }
        mqtt_client.publish(MQTT_TOPIC, json.dumps(payload), qos=1)
        print(f"✓ MQTT: {count} people")
    except Exception as e:
        print(f"✗ MQTT publish error: {e}")

def init_camera():
    global camera
    print("🎥 Initializing camera...")
    
    camera = cv2.VideoCapture(WEBCAM_PORT, cv2.CAP_V4L2)
    if not camera.isOpened():
        camera = cv2.VideoCapture(WEBCAM_PORT)
    
    if not camera.isOpened():
        print("✗ Cannot open camera")
        return False
    
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    camera.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
    
    # Warm-up
    for _ in range(5):
        ret, _ = camera.read()
        if ret:
            break
        time.sleep(0.5)
    
    print("✓ Camera initialized")
    return True

def detect_people_yolo(frame):
    """Deteksi orang dengan YOLO v4-tiny"""
    if net is None:
        return 0, frame
    
    height, width = frame.shape[:2]
    
    # Prepare input blob dengan size lebih kecil untuk speed
    blob = cv2.dnn.blobFromImage(frame, 1/255.0, (INPUT_SIZE, INPUT_SIZE), swapRB=True, crop=False)
    net.setInput(blob)
    
    # Forward pass
    outputs = net.forward(output_layers)
    
    # Process detections
    boxes = []
    confidences = []
    class_ids = []
    
    for output in outputs:
        for detection in output:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            # Filter: only person class (class_id = 0 in COCO) and high confidence
            if class_id == 0 and confidence > CONFIDENCE_THRESHOLD:
                # Get bounding box
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
                
                # Rectangle coordinates
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
                class_ids.append(class_id)
    
    # Apply Non-Maximum Suppression
    indices = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
    
    people_detected = 0
    if len(indices) > 0:
        for i in indices.flatten():
            x, y, w, h = boxes[i]
            confidence = confidences[i]
            
            # Draw bounding box
            color = (0, 255, 0)
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            
            # Draw label
            label = f"Person {confidence:.2f}"
            label_size, base_line = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            y_label = max(y, label_size[1])
            
            cv2.rectangle(frame, (x, y_label - label_size[1] - 10), 
                         (x + label_size[0], y_label + base_line - 10), color, cv2.FILLED)
            cv2.putText(frame, label, (x, y_label - 7), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
            
            people_detected += 1
    
    return people_detected, frame

def capture_frames():
    global camera, output_frame, lock, people_count
    
    print("📹 Starting capture and detection...")
    frame_count = 0
    start_time = time.time()
    last_publish = time.time()
    
    while True:
        try:
            ret, frame = camera.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            frame_count += 1
            current_time = time.time()
            
            # Perform detection SETIAP FRAME agar boxes smooth mengikuti pergerakan
            count, frame = detect_people_yolo(frame)
            people_count = count
            
            # Calculate FPS (only for tracking, not displayed)
            elapsed = current_time - start_time
            fps = frame_count / elapsed if elapsed > 0 else 0
            
            # No text overlays - clean video with boxes only
            
            # Publish to MQTT
            if current_time - last_publish > PUBLISH_INTERVAL:
                publish_people_count(people_count)
                last_publish = current_time
            
            with lock:
                output_frame = frame.copy()
            
            if frame_count >= 1000:
                frame_count = 0
                start_time = time.time()
                
        except Exception as e:
            print(f"⚠️  Capture error: {e}")
            time.sleep(1)

def generate_stream():
    global output_frame, lock
    while True:
        with lock:
            if output_frame is None:
                continue
            # Lower JPEG quality untuk streaming lebih lancar
            flag, encoded = cv2.imencode(".jpg", output_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            if not flag:
                continue
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + bytearray(encoded) + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_stream(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/')
def index():
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>YOLO People Counter</title>
        <style>
            body {{ font-family: Arial; background: #1a1a1a; color: white; text-align: center; padding: 20px; }}
            h1 {{ color: #00ff00; }}
            img {{ width: 100%; max-width: 640px; border: 3px solid #00ff00; border-radius: 8px; }}
            .info {{ background: #2a2a2a; padding: 15px; margin: 20px auto; max-width: 640px; border-radius: 8px; }}
            .status {{ color: #00ff00; font-weight: bold; font-size: 24px; }}
        </style>
        <script>
            setInterval(() => {{
                fetch('/count').then(r => r.json()).then(d => {{
                    document.getElementById('count').textContent = d.count;
                }});
            }}, 1000);
        </script>
    </head>
    <body>
        <h1>🎥 YOLO v4-tiny People Counter</h1>
        <p class="status">● LIVE | People: <span id="count">0</span></p>
        <img src="/video_feed">
        <div class="info">
            <h3>📌 Info</h3>
            <p><strong>Detection:</strong> YOLO v4-tiny (State-of-the-art)</p>
            <p><strong>Confidence:</strong> {CONFIDENCE_THRESHOLD*100:.0f}%</p>
            <p><strong>MQTT:</strong> {MQTT_TOPIC}</p>
        </div>
    </body>
    </html>
    """

@app.route('/status')
def status():
    return {
        'status': 'online',
        'people_count': people_count,
        'mqtt_connected': mqtt_connected,
        'detection': 'YOLO v4-tiny',
        'confidence_threshold': CONFIDENCE_THRESHOLD
    }

@app.route('/count')
def count():
    return {'count': people_count, 'mqtt': mqtt_connected}

def main():
    print("\n" + "="*60)
    print("YOLO v4-tiny PEOPLE COUNTER - HIGH ACCURACY")
    print("="*60)
    
    if not init_yolo():
        print("✗ Failed to initialize YOLO")
        return
    
    if not init_camera():
        print("✗ Failed to initialize camera")
        return
    
    init_mqtt()
    
    capture_thread = threading.Thread(target=capture_frames, daemon=True)
    capture_thread.start()
    
    # Wait for first frame
    print("\n⏳ Waiting for first frame...")
    for _ in range(100):
        if output_frame is not None:
            break
        time.sleep(0.1)
    
    if output_frame is None:
        print("✗ Timeout waiting for frame")
        return
    
    print("✓ First frame captured")
    print(f"\n🌐 Server running on port {STREAM_PORT}")
    print(f"📡 Stream: http://192.168.1.14:{STREAM_PORT}/video_feed")
    print(f"🏠 Home: http://192.168.1.14:{STREAM_PORT}/")
    print(f"👥 Count API: http://192.168.1.14:{STREAM_PORT}/count")
    print("\n💡 YOLO v4-tiny active - High accuracy people detection!")
    print("="*60 + "\n")
    
    try:
        app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True, debug=False)
    except KeyboardInterrupt:
        print("\n⏹️  Stopping...")
    finally:
        if camera:
            camera.release()
        if mqtt_client:
            mqtt_client.loop_stop()
            mqtt_client.disconnect()
        print("✓ Done")

if __name__ == '__main__':
    main()
