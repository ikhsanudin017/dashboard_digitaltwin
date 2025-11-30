#!/usr/bin/env python3
"""
Raspberry Pi People Counter with Camera
Detects and counts people using YOLO object detection
Publishes count to HiveMQ Cloud MQTT
"""

import cv2
import numpy as np
import time
import json
from datetime import datetime
import paho.mqtt.client as mqtt
import ssl

# ===== MQTT Configuration =====
MQTT_BROKER = "02cd9f1cff1343ed8f68b7e5820a46d5.s1.eu.hivemq.cloud"
MQTT_PORT = 8883
MQTT_USERNAME = "digitaltwin"
MQTT_PASSWORD = "Digitaltwin1"
MQTT_TOPIC = "sensor/camera/people"
DEVICE_ID = "RASPBERRY_PI_CAMERA_001"

# ===== YOLO Configuration =====
# Download YOLO files:
# wget https://pjreddie.com/media/files/yolov3.weights
# wget https://github.com/pjreddie/darknet/blob/master/cfg/yolov3.cfg
# wget https://github.com/pjreddie/darknet/blob/master/data/coco.names

YOLO_CONFIG = "/home/digitaltwin/yolo/yolov3.cfg"
YOLO_WEIGHTS = "/home/digitaltwin/yolo/yolov3.weights"
COCO_NAMES = "/home/digitaltwin/yolo/coco.names"

# ===== Detection Parameters =====
CONFIDENCE_THRESHOLD = 0.5
NMS_THRESHOLD = 0.4
PERSON_CLASS_ID = 0  # Person class in COCO dataset

# ===== Global Variables =====
mqtt_client = None
people_count = 0
last_publish_time = 0
PUBLISH_INTERVAL = 5  # Publish every 5 seconds (match ESP32)

# ===== MQTT Callbacks =====
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Connected to HiveMQ Cloud MQTT Broker")
        print(f"📡 Publishing to topic: {MQTT_TOPIC}")
    else:
        print(f"❌ Connection failed with code {rc}")

def on_publish(client, userdata, mid):
    print(f"📤 Message published (mid: {mid})")

def on_disconnect(client, userdata, rc):
    print(f"⚠️  Disconnected from MQTT broker (code: {rc})")

# ===== Initialize MQTT =====
def init_mqtt():
    global mqtt_client
    
    mqtt_client = mqtt.Client(client_id=DEVICE_ID)
    mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    
    # Enable TLS/SSL
    mqtt_client.tls_set(cert_reqs=ssl.CERT_NONE)
    mqtt_client.tls_insecure_set(True)
    
    mqtt_client.on_connect = on_connect
    mqtt_client.on_publish = on_publish
    mqtt_client.on_disconnect = on_disconnect
    
    try:
        print(f"🔌 Connecting to {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        return True
    except Exception as e:
        print(f"❌ MQTT connection error: {e}")
        return False

# ===== Load YOLO Model =====
def load_yolo_model():
    print("🔄 Loading YOLO model...")
    
    try:
        # Load COCO class names
        with open(COCO_NAMES, 'r') as f:
            classes = [line.strip() for line in f.readlines()]
        
        # Load YOLO network
        net = cv2.dnn.readNet(YOLO_WEIGHTS, YOLO_CONFIG)
        net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
        net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
        
        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
        
        print("✅ YOLO model loaded successfully")
        return net, output_layers, classes
    
    except Exception as e:
        print(f"❌ Error loading YOLO model: {e}")
        return None, None, None

# ===== Detect People =====
def detect_people(frame, net, output_layers):
    height, width, channels = frame.shape
    
    # Prepare image for YOLO
    blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outs = net.forward(output_layers)
    
    # Process detections
    class_ids = []
    confidences = []
    boxes = []
    
    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            # Filter for person class with high confidence
            if class_id == PERSON_CLASS_ID and confidence > CONFIDENCE_THRESHOLD:
                # Object detected
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
    indexes = cv2.dnn.NMSBoxes(boxes, confidences, CONFIDENCE_THRESHOLD, NMS_THRESHOLD)
    
    # Count people
    people_detected = len(indexes)
    
    # Draw bounding boxes
    if len(indexes) > 0:
        for i in indexes.flatten():
            x, y, w, h = boxes[i]
            confidence = confidences[i]
            
            # Draw rectangle
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            # Draw label
            label = f"Person: {confidence:.2f}"
            cv2.putText(frame, label, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    return people_detected, frame

# ===== Publish to MQTT =====
def publish_people_count(count):
    global last_publish_time
    
    current_time = time.time()
    
    # Publish every PUBLISH_INTERVAL seconds
    if current_time - last_publish_time >= PUBLISH_INTERVAL:
        timestamp = datetime.utcnow().isoformat() + 'Z'
        
        payload = {
            "deviceId": DEVICE_ID,
            "jumlahOrang": count,
            "timestamp": timestamp,
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
        
        last_publish_time = current_time

# ===== Main Function =====
def main():
    global people_count
    
    print("=" * 60)
    print("🎥 Raspberry Pi People Counter - Digital Twin")
    print("=" * 60)
    
    # Initialize MQTT
    if not init_mqtt():
        print("❌ Cannot start without MQTT connection")
        return
    
    time.sleep(2)  # Wait for MQTT connection
    
    # Load YOLO model
    net, output_layers, classes = load_yolo_model()
    if net is None:
        print("❌ Cannot start without YOLO model")
        mqtt_client.loop_stop()
        return
    
    # Initialize camera
    print("📷 Initializing camera...")
    cap = cv2.VideoCapture(0)  # Use default camera (0)
    
    if not cap.isOpened():
        print("❌ Cannot open camera")
        mqtt_client.loop_stop()
        return
    
    # Set camera resolution
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    print("✅ Camera initialized")
    print("🚀 Starting detection...")
    print("\nPress 'q' to quit\n")
    
    frame_count = 0
    fps_start_time = time.time()
    fps = 0
    
    try:
        while True:
            ret, frame = cap.read()
            
            if not ret:
                print("⚠️  Failed to grab frame")
                break
            
            # Detect people every frame
            people_count, annotated_frame = detect_people(frame, net, output_layers)
            
            # Calculate FPS
            frame_count += 1
            if frame_count >= 30:
                fps = 30 / (time.time() - fps_start_time)
                fps_start_time = time.time()
                frame_count = 0
            
            # Display info on frame (commented out for headless mode)
            # cv2.putText(annotated_frame, f"People: {people_count}", (10, 30), 
            #            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            # cv2.putText(annotated_frame, f"FPS: {fps:.1f}", (10, 60), 
            #            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            
            # Show frame (disabled for headless mode)
            # cv2.imshow('People Counter - Digital Twin', annotated_frame)
            
            # Publish to MQTT
            publish_people_count(people_count)
            
            # Small delay to prevent CPU overload
            time.sleep(0.1)
    
    except KeyboardInterrupt:
        print("\n⚠️  Interrupted by user")
    
    finally:
        # Cleanup
        cap.release()
        cv2.destroyAllWindows()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("✅ Cleanup complete")

if __name__ == "__main__":
    main()
