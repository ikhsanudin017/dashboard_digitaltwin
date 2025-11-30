#!/usr/bin/env python3
"""
Raspberry Pi Camera Stream with YOLO v3 People Detection
High accuracy people detection using YOLO
"""

import numpy as np
import time
import json
from datetime import datetime
import paho.mqtt.client as mqtt
import ssl
from flask import Flask, Response
import threading
from picamera2 import Picamera2
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
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.4

# ===== Global Variables =====
people_count = 0
output_frame = None
lock = threading.Lock()
mqtt_client = None

# ===== Flask App =====
app = Flask(__name__)

# ===== MQTT Functions =====
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to HiveMQ Cloud MQTT Broker")
        print(f"📡 Publishing to topic: {MQTT_TOPIC}")
    else:
        print(f"❌ Connection failed with code {rc}")

def on_publish(client, userdata, mid):
    print(f"📤 Message published (mid: {mid})")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️  Disconnected from MQTT broker (code: {rc})")

def init_mqtt():
    global mqtt_client
    
    mqtt_client = mqtt.Client(client_id=DEVICE_ID)
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)
    
    mqtt_client.on_connect = on_connect
    mqtt_client.on_publish = on_publish
    mqtt_client.on_disconnect = on_disconnect
    
    try:
        print(f"🔌 Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        return True
    except Exception as e:
        print(f"❌ MQTT Connection Error: {e}")
        return False

# ===== YOLO Functions =====
def load_yolo_model():
    print("🔄 Loading YOLO v3 model...")
    try:
        net = cv2.dnn.readNet(YOLO_WEIGHTS, YOLO_CONFIG)
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        
        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
        
        with open(YOLO_NAMES, "r") as f:
            classes = [line.strip() for line in f.readlines()]
        
        print("✅ YOLO model loaded successfully")
        return net, output_layers, classes
    
    except Exception as e:
        print(f"❌ Error loading YOLO model: {e}")
        return None, None, None

def detect_people(frame, net, output_layers):
    height, width = frame.shape[:2]
    
    # Use smaller input size for faster processing (320x320 instead of 416x416)
    blob = cv2.dnn.blobFromImage(frame, 1/255.0, (320, 320), swapRB=True, crop=False)
    net.setInput(blob)
    outputs = net.forward(output_layers)
    
    # Process detections
    boxes = []
    confidences = []
    
    for output in outputs:
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
                
                x = int(center_x - w/2)
                y = int(center_y - h/2)
                
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
    
    # Apply Non-Maximum Suppression
    indices = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
    
    people_boxes = []
    if len(indices) > 0:
        for i in indices.flatten():
            people_boxes.append(boxes[i])
    
    return len(people_boxes), people_boxes

def publish_people_count(count):
    global mqtt_client
    
    if mqtt_client is None or not mqtt_client.is_connected():
        return
    
    # Rate limiting: publish max every 5 seconds
    current_time = time.time()
    if not hasattr(publish_people_count, 'last_publish_time'):
        publish_people_count.last_publish_time = 0
    
    if current_time - publish_people_count.last_publish_time < 5:
        return
    
    payload = {
        "deviceId": DEVICE_ID,
        "jumlahOrang": count,
        "timestamp": datetime.now().astimezone().isoformat(),
        "location": "Ruang Server"
    }
    
    try:
        result = mqtt_client.publish(MQTT_TOPIC, json.dumps(payload), qos=1)
        
        if result.rc == mqtt.MQTT_ERR_SUCCESS:
            print(f"👥 People detected: {count} | Published at {datetime.now().strftime('%H:%M:%S')}")
        else:
            print(f"⚠️  Publish failed with code: {result.rc}")
    
    except Exception as e:
        print(f"❌ Error publishing: {e}")
    
    publish_people_count.last_publish_time = current_time

# ===== Video Capture Thread =====
def capture_video(net, output_layers):
    global output_frame, people_count
    
    print("📷 Initializing Picamera2...")
    picam2 = Picamera2()
    
    # Configure camera for 640x480 @ 30fps
    config = picam2.create_preview_configuration(
        main={"size": (640, 480), "format": "RGB888"},
        controls={"FrameRate": 30}
    )
    picam2.configure(config)
    
    print("✅ Starting camera...")
    picam2.start()
    time.sleep(2)  # Camera warmup
    
    print("✅ Camera initialized")
    print("🚀 Starting YOLO detection and streaming...")
    
    frame_count = 0
    detected_boxes = []
    last_detection_time = time.time()
    
    while True:
        try:
            # Capture frame from Picamera2
            frame = picam2.capture_array()
            
            frame_count += 1
            if frame_count % 100 == 1:
                print(f"📸 Frame {frame_count} captured")
            
            # Convert RGB to BGR for OpenCV
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            
            # Run YOLO detection every 30 frames OR every 1 second (whichever is longer)
            # This ensures smooth video while still getting accurate detection
            current_time = time.time()
            if frame_count % 30 == 0 or (current_time - last_detection_time) >= 1.0:
                # Use smaller frame for YOLO processing (huge speed boost)
                small_frame = cv2.resize(frame_bgr, (320, 240))
                
                count, boxes = detect_people(small_frame, net, output_layers)
                
                # Scale boxes back to original size
                detected_boxes = []
                for box in boxes:
                    x, y, w, h = box
                    x, y, w, h = x*2, y*2, w*2, h*2
                    detected_boxes.append([x, y, w, h])
                
                people_count = count
                last_detection_time = current_time
                
                # Publish to MQTT
                publish_people_count(count)
            
            # Draw bounding boxes on every frame
            for box in detected_boxes:
                x, y, w, h = box
                cv2.rectangle(frame_bgr, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame_bgr, "Person", (x, y - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            # Add overlay text
            cv2.putText(frame_bgr, f"People: {people_count}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame_bgr, datetime.now().strftime("%H:%M:%S"), (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            cv2.putText(frame_bgr, "YOLO Detection", (10, 85),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Update global frame
            with lock:
                output_frame = frame_bgr.copy()
        
        except Exception as e:
            print(f"⚠️ Error in capture loop: {e}")
            time.sleep(0.1)
            continue
        
        # Small delay to prevent CPU overload
        time.sleep(0.005)

# ===== Flask Routes =====
def generate_frames():
    # Wait for first frame to be available
    while output_frame is None:
        time.sleep(0.1)
    
    while True:
        with lock:
            if output_frame is None:
                time.sleep(0.1)
                continue
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ret:
                time.sleep(0.1)
                continue
            
            frame_bytes = buffer.tobytes()
        
        # Yield frame in MJPEG format
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        
        time.sleep(0.02)  # ~50 FPS max

@app.route('/video_feed')
def video_feed():
    response = Response(generate_frames(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/snapshot')
def snapshot():
    """Return single JPEG frame"""
    with lock:
        if output_frame is None:
            return Response(b'', mimetype='image/jpeg', status=503)
        else:
            ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if ret:
                response = Response(buffer.tobytes(), mimetype='image/jpeg')
            else:
                response = Response(b'', mimetype='image/jpeg', status=500)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def index():
    return '''
    <html>
    <head><title>Raspberry Pi YOLO Detection</title></head>
    <body style="background: #000; color: #fff; font-family: Arial; text-align: center;">
    <h1>🎥 Live Camera - YOLO People Detection</h1>
    <img src="/video_feed" style="max-width: 90%; border: 2px solid #00ff00;">
    <p style="color: #00ff00;">✅ YOLO v3 Active</p>
    </body>
    </html>
    '''

# ===== Main Function =====
def main():
    print("=" * 60)
    print("🎥 Raspberry Pi Camera + YOLO v3 Detection")
    print("=" * 60)
    
    # Initialize MQTT
    if not init_mqtt():
        print("⚠️  Starting without MQTT")
    else:
        time.sleep(2)  # Wait for MQTT connection
    
    # Load YOLO model
    net, output_layers, classes = load_yolo_model()
    if net is None:
        print("❌ Cannot start without YOLO model")
        if mqtt_client:
            mqtt_client.loop_stop()
        return
    
    # Start video capture thread
    capture_thread = threading.Thread(target=capture_video, args=(net, output_layers))
    capture_thread.daemon = True
    capture_thread.start()
    
    # Wait for first frame to be captured
    print("⏳ Waiting for first frame...")
    while output_frame is None:
        time.sleep(0.1)
    print("✅ First frame captured")
    
    # Start Flask server
    print(f"\n🌐 Video stream: http://192.168.1.8:{STREAM_PORT}/video_feed")
    print(f"📺 Web interface: http://192.168.1.8:{STREAM_PORT}/")
    print(f"📸 Snapshot: http://192.168.1.8:{STREAM_PORT}/snapshot")
    print("\nPress Ctrl+C to stop\n")
    
    try:
        app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True, debug=False)
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    finally:
        if mqtt_client:
            mqtt_client.loop_stop()
        print("👋 Shutting down...")

if __name__ == "__main__":
    main()
