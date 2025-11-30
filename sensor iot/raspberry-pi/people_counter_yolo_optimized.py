#!/usr/bin/env python3
"""
Raspberry Pi Camera Stream with YOLO v3 (Ultra Optimized)
Separate threads for camera streaming and YOLO detection
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

# ===== Flask App =====
app = Flask(__name__)

# ===== MQTT Functions =====
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to HiveMQ Cloud MQTT Broker")
    else:
        print(f"❌ Connection failed with code {rc}")

def on_publish(client, userdata, mid):
    pass  # Suppress verbose logging

def on_disconnect(client, userdata, rc):
    if rc != 0:
        print(f"⚠️  Disconnected from MQTT broker")

def init_mqtt():
    global mqtt_client
    
    mqtt_client = mqtt.Client(client_id=DEVICE_ID)
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    mqtt_client.tls_set(cert_reqs=ssl.CERT_REQUIRED, tls_version=ssl.PROTOCOL_TLS)
    
    mqtt_client.on_connect = on_connect
    mqtt_client.on_publish = on_publish
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
    """Run YOLO detection on frame"""
    height, width = frame.shape[:2]
    
    # Use very small input for speed (256x256)
    blob = cv2.dnn.blobFromImage(frame, 1/255.0, (256, 256), swapRB=True, crop=False)
    net.setInput(blob)
    outputs = net.forward(output_layers)
    
    boxes = []
    confidences = []
    
    for output in outputs:
        for detection in output:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            # Class 0 is 'person'
            if class_id == 0 and confidence > CONFIDENCE_THRESHOLD:
                center_x = int(detection[0] * width)
                center_y = int(detection[1] * height)
                w = int(detection[2] * width)
                h = int(detection[3] * height)
                
                x = int(center_x - w/2)
                y = int(center_y - h/2)
                
                boxes.append([x, y, w, h])
                confidences.append(float(confidence))
    
    # NMS
    indices = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
    
    result_boxes = []
    if len(indices) > 0:
        for i in indices.flatten():
            result_boxes.append(boxes[i])
    
    return len(result_boxes), result_boxes

def publish_people_count(count):
    global mqtt_client
    
    if mqtt_client is None or not mqtt_client.is_connected():
        return
    
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
        mqtt_client.publish(MQTT_TOPIC, json.dumps(payload), qos=1)
        print(f"👥 People: {count} | {datetime.now().strftime('%H:%M:%S')}")
    except Exception as e:
        pass
    
    publish_people_count.last_publish_time = current_time

# ===== Detection Thread (runs YOLO separately) =====
def detection_thread(net, output_layers):
    """Separate thread for YOLO detection - doesn't block streaming"""
    global detection_frame, detected_boxes, people_count
    
    print("🔍 Detection thread started")
    
    while True:
        try:
            with detection_lock:
                if detection_frame is None:
                    time.sleep(0.1)
                    continue
                
                # Copy frame for detection
                frame_to_detect = detection_frame.copy()
            
            # Resize to small size for YOLO (huge speed boost)
            small = cv2.resize(frame_to_detect, (320, 240))
            
            # Run YOLO
            count, boxes = detect_people_yolo(small, net, output_layers)
            
            # Scale boxes back to 640x480
            scaled_boxes = []
            for box in boxes:
                x, y, w, h = box
                scaled_boxes.append([x*2, y*2, w*2, h*2])
            
            # Update global state
            with lock:
                detected_boxes = scaled_boxes
                people_count = count
            
            # Publish
            publish_people_count(count)
            
            # Sleep to limit detection frequency (2 times per second max)
            time.sleep(0.5)
            
        except Exception as e:
            print(f"⚠️ Detection error: {e}")
            time.sleep(1)

# ===== Camera Capture Thread (fast streaming) =====
def capture_video():
    """Camera capture and frame drawing - no YOLO here = fast!"""
    global output_frame, detection_frame
    
    print("📷 Initializing camera...")
    picam2 = Picamera2()
    
    config = picam2.create_preview_configuration(
        main={"size": (640, 480), "format": "RGB888"},
        controls={"FrameRate": 30}
    )
    picam2.configure(config)
    
    picam2.start()
    time.sleep(2)
    
    print("✅ Camera ready - streaming started")
    
    frame_count = 0
    
    while True:
        try:
            # Capture frame
            frame = picam2.capture_array()
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
            
            frame_count += 1
            
            # Send frame to detection thread every 15 frames
            if frame_count % 15 == 0:
                with detection_lock:
                    detection_frame = frame_bgr.copy()
            
            # Draw boxes (from previous detection)
            with lock:
                boxes_to_draw = detected_boxes.copy()
                count_to_show = people_count
            
            for box in boxes_to_draw:
                x, y, w, h = box
                cv2.rectangle(frame_bgr, (x, y), (x+w, y+h), (0, 255, 0), 2)
                cv2.putText(frame_bgr, "Person", (x, y-10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
            
            # Overlay
            cv2.putText(frame_bgr, f"People: {count_to_show}", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame_bgr, datetime.now().strftime("%H:%M:%S"), (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            # Update output
            with lock:
                output_frame = frame_bgr.copy()
            
            # No sleep - maximum FPS!
            
        except Exception as e:
            print(f"⚠️ Capture error: {e}")
            time.sleep(0.1)

# ===== Flask Routes =====
def generate_frames():
    while output_frame is None:
        time.sleep(0.1)
    
    while True:
        with lock:
            if output_frame is None:
                time.sleep(0.05)
                continue
            
            ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 65])
            if not ret:
                continue
            
            frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    response = Response(generate_frames(),
                        mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Cache-Control'] = 'no-cache'
    return response

@app.route('/snapshot')
def snapshot():
    with lock:
        if output_frame is None:
            return Response(b'', mimetype='image/jpeg', status=503)
        ret, buffer = cv2.imencode('.jpg', output_frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret:
            response = Response(buffer.tobytes(), mimetype='image/jpeg')
        else:
            response = Response(b'', mimetype='image/jpeg', status=500)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Cache-Control'] = 'no-cache'
    return response

@app.route('/')
def index():
    return '''
    <html>
    <head><title>YOLO Detection</title></head>
    <body style="background:#000;color:#fff;font-family:Arial;text-align:center;">
    <h1>🎥 YOLO v3 - Optimized</h1>
    <img src="/video_feed" style="max-width:90%;border:2px solid #0f0;">
    </body>
    </html>
    '''

# ===== Main =====
def main():
    print("=" * 60)
    print("🎥 Raspberry Pi + YOLO v3 (Ultra Optimized)")
    print("=" * 60)
    
    # MQTT
    init_mqtt()
    time.sleep(1)
    
    # Load YOLO
    net, output_layers = load_yolo_model()
    if net is None:
        print("❌ Cannot start without YOLO")
        return
    
    # Start camera thread (streaming)
    capture_thread = threading.Thread(target=capture_video, daemon=True)
    capture_thread.start()
    
    # Wait for first frame
    print("⏳ Waiting for camera...")
    while output_frame is None:
        time.sleep(0.1)
    print("✅ Ready!")
    
    # Start detection thread (YOLO runs here, separate from streaming)
    detect_thread = threading.Thread(target=detection_thread, args=(net, output_layers), daemon=True)
    detect_thread.start()
    
    print(f"\n🌐 Stream: http://192.168.1.8:{STREAM_PORT}/video_feed")
    print("Press Ctrl+C to stop\n")
    
    try:
        app.run(host='0.0.0.0', port=STREAM_PORT, threaded=True, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Stopping...")
    finally:
        if mqtt_client:
            mqtt_client.loop_stop()

if __name__ == "__main__":
    main()
