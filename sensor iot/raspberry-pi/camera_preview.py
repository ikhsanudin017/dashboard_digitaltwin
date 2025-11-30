#!/usr/bin/env python3
"""
Simple Camera Preview - No YOLO, No MQTT
Just display camera feed
"""

import cv2

print("🎥 Starting camera preview...")
print("Press 'q' to quit")
print("-" * 50)

# Open camera (0 for default camera, /dev/video0 for Pi Camera)
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Cannot open camera")
    print("💡 Try: sudo modprobe bcm2835-v4l2")
    exit(1)

# Set resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("✅ Camera opened successfully")
print("📺 Displaying video feed...")

while True:
    ret, frame = cap.read()
    
    if not ret:
        print("❌ Failed to grab frame")
        break
    
    # Display frame
    cv2.imshow('Camera Preview', frame)
    
    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()

print("\n✅ Camera preview stopped")
