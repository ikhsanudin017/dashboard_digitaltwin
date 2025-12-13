#!/usr/bin/env python3
"""
Raspberry Pi People Counter - Flexible Version
Supports: Picamera2, USB Webcam, or Dummy Data
"""

import numpy as np
import time
import json
from datetime import datetime
import paho.mqtt.client as mqtt
import ssl
from flask import Flask, Response
import threading
import cv2

# ===== MQTT Configuration =====
MQTT_BROKER = "02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USERNAME = "digitaltwin"
MQTT_PASSWORD = "Digitaltwin1"
MQTT_TOPIC = "sensor/camera/people"
DEVICE_ID = "RASPBERRY_PI_CAMERA_001"

# ===== HTTP Stream Configuration =====
STREAM_PORT = 5000

# ===== YOLO Configuration =====
YOLO_PATH = "/home/digitaltwin/yolo/"
YOLO_WEIGHTS = YOLO_PATH + "yolov3.weights"
YOLO_CONFIG = YOLO_PATH + "yolov3.cfg"
YOLO_NAMES = YOLO_PATH + "coco.names"
CONFIDENCE_THRESHOLD = 0.4
NMS_THRESHOLD = 0.3

# ===== Global Variables =====
people_count = 0
output_frame = None
detection_frame = None
detected_boxes = []
lock = threading.Lock()
detection_lock = threading.Lock()
mqtt_client = None
camera_type = None  # Will be detected: 'picamera2', 'usb', or 'dummy'

# ===== Flask App =====
app = Flask(__name__)

# ===== MQTT Functions =====
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to HiveMQ Cloud MQTT Broker")
    else:
        print(f"❌ Connection failed with code {rc}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️  Disconnected from MQTT broker")

def init_mqtt():
    global mqtt_client
    
    mqtt_client = mqtt.Client(client_id=DEVICE_ID, callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)
    
    mqtt_client.on_connect = on_connect
    mqtt_client.on_disconnect = on_disconnect
    
    try:
        print(f"🔌 Connecting to MQTT...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        return True
    except Exception as e:
        print(f"❌ MQTT Error: {e}")
        return False

# ===== YOLO Functions =====
def load_yolo_model():
    print("🔄 Loading YOLO v3...")
    try:
        net = cv2.dnn.readNet(YOLO_WEIGHTS, YOLO_CONFIG)
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        
        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
        
        print("✅ YOLO loaded")
        return net, output_layers
    
    except Exception as e:
        print(f"❌ YOLO load error: {e}")
        return None, None

def detect_people_yolo(frame, net, output_layers):
    global people_count, detected_boxes
    
    height, width = frame.shape[:2]
    
    # Prepare image for YOLO
    blob = cv2.dnn.blobFromImage(frame, 1/255.0, (320, 320), swapRB=True, crop=False)
    net.setInput(blob)
    layer_outputs = net.forward(output_layers)
    
    # Process detections
    boxes = []
    confidences = []
    
    for output in layer_outputs:
        for detection in output:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            # Class 0 is 'person' in COCO dataset
            if class_id == 0 and confidence > CONFIDENCE_THRESHOLD:
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
                x = int(center_x - w / 2)
                y = int(center_y - h / 2)
                
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
    
    # Non-maximum suppression
    indices = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
    
    final_boxes = []
    if len(indices) > 0:
        for i in indices.flatten():
            final_boxes.append(boxes[i])
    
    with detection_lock:
        detected_boxes = final_boxes
        people_count = len(final_boxes)
    
    return final_boxes

# ===== Camera Detection =====
def detect_camera():
    """Detect available camera type"""
    print("🔍 Detecting camera...")
    
    # Try Picamera2
    try:
        from picamera2 import Picamera2
        cameras = Picamera2.global_camera_info()
        if len(cameras) > 0:
            print("✅ Picamera2 detected")
            return 'picamera2', Picamera2
    except Exception as e:
        print(f"⚠️  Picamera2 not available: {e}")
    
    # Try USB/V4L2
    try:
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            cap.release()
            if ret:
                print("✅ USB Camera detected")
                return 'usb', None
    except Exception as e:
        print(f"⚠️  USB camera not available: {e}")
    
    # Fallback to dummy
    print("⚠️  No camera detected, using DUMMY data mode")
    return 'dummy', None

# ===== Camera Capture Functions =====
def capture_picamera2(Picamera2Class, net, output_layers):
    global output_frame, detection_frame
    
    picam2 = Picamera2Class()
    config = picam2.create_preview_configuration(main={"size": (640, 480)})
    picam2.configure(config)
    picam2.start()
    
    print("✅ Picamera2 started")
    
    while True:
        frame = picam2.capture_array()
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        
        # Detection
        boxes = detect_people_yolo(frame, net, output_layers)
        
        # Draw boxes
        for box in boxes:
            x, y, w, h = box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        
        # Add info
        cv2.putText(frame, f"People: {people_count}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        with lock:
            output_frame = frame.copy()

def capture_usb(net, output_layers):
    global output_frame, detection_frame
    
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("✅ USB Camera started")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            continue
        
        # Detection
        boxes = detect_people_yolo(frame, net, output_layers)
        
        # Draw boxes
        for box in boxes:
            x, y, w, h = box
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
        
        # Add info
        cv2.putText(frame, f"People: {people_count}", (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        with lock:
            output_frame = frame.copy()

def capture_dummy(net, output_layers):
    global output_frame, people_count
    
    print("✅ DUMMY mode started (simulated data)")
    
    import random
    
    while True:
        # Create dummy frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        
        # Simulate random people count
        people_count = random.randint(0, 10)
        
        # Draw dummy info
        cv2.putText(frame, "DUMMY MODE", (200, 100),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
        cv2.putText(frame, f"Simulated People: {people_count}", (150, 250),
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        cv2.putText(frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), (150, 350),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        with lock:
            output_frame = frame.copy()
        
        time.sleep(2)  # Update every 2 seconds

# ===== MQTT Publishing =====
def publish_data():
    while True:
        try:
            data = {
                "deviceId": DEVICE_ID,
                "timestamp": datetime.now().isoformat(),
                "peopleCount": people_count,
                "cameraType": camera_type
            }
            
            mqtt_client.publish(MQTT_TOPIC, json.dumps(data), qos=1)
            
        except Exception as e:
            print(f"❌ Publish error: {e}")
        
        time.sleep(5)

# ===== Flask Routes =====
def generate_frames():
    while True:
        with lock:
            if output_frame is None:
                continue
            
            ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            frame = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        
        time.sleep(0.1)

@app.route('/video')
def video_feed():
    return Response(generate_frames(),
                   mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def status():
    return {
        "peopleCount": people_count,
        "cameraType": camera_type,
        "timestamp": datetime.now().isoformat()
    }

@app.route('/')
def index():
    return f"""
    <html>
    <head><title>Raspberry Pi Camera</title></head>
    <body style="background:#000; color:#fff; text-align:center; padding:50px;">
        <h1>🎥 Raspberry Pi People Counter</h1>
        <h2>Camera Type: {camera_type.upper()}</h2>
        <img src="/video" style="max-width:90%; border:2px solid #0f0;">
        <p><a href="/status" style="color:#0f0;">View Status JSON</a></p>
    </body>
    </html>
    """

# ===== Main =====
def main():
    global camera_type
    
    print("=" * 60)
    print("🎥 Raspberry Pi People Counter (Flexible)")
    print("=" * 60)
    
    # Initialize MQTT
    if not init_mqtt():
        print("❌ Cannot start without MQTT")
        return
    
    # Load YOLO
    net, output_layers = load_yolo_model()
    if net is None:
        print("⚠️  Running without YOLO detection")
    
    # Detect camera
    camera_type, camera_class = detect_camera()
    
    # Start camera thread
    print("📷 Starting camera thread...")
    if camera_type == 'picamera2':
        camera_thread = threading.Thread(target=capture_picamera2, args=(camera_class, net, output_layers), daemon=True)
    elif camera_type == 'usb':
        camera_thread = threading.Thread(target=capture_usb, args=(net, output_layers), daemon=True)
    else:
        camera_thread = threading.Thread(target=capture_dummy, args=(net, output_layers), daemon=True)
    
    camera_thread.start()
    
    # Start MQTT publisher
    mqtt_thread = threading.Thread(target=publish_data, daemon=True)
    mqtt_thread.start()
    
    # Wait for camera to initialize
    time.sleep(3)
    
    # Start Flask
    print(f"\n✅ System ready!")
    print(f"📹 Camera type: {camera_type}")
    print(f"🌐 Stream: http://digitaltwin.local:{STREAM_PORT}/video")
    print(f"📊 Status: http://digitaltwin.local:{STREAM_PORT}/status")
    print(f"📡 MQTT Topic: {MQTT_TOPIC}")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True)

if __name__ == "__main__":
    main()
