#!/bin/bash

# Setup script for Raspberry Pi People Counter
# Run this on Raspberry Pi: bash setup_raspberry.sh

echo "🚀 Setting up Raspberry Pi People Counter..."
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
sudo apt-get install -y python3-pip python3-opencv
pip3 install opencv-python numpy paho-mqtt

# Create directory for YOLO files
echo "📁 Creating YOLO directory..."
mkdir -p ~/yolo
cd ~/yolo

# Download YOLO files
echo "⬇️  Downloading YOLO model files (this may take a while)..."

# YOLOv3 weights (large file, ~200MB)
if [ ! -f "yolov3.weights" ]; then
    echo "Downloading YOLOv3 weights..."
    wget https://pjreddie.com/media/files/yolov3.weights
fi

# YOLOv3 config
if [ ! -f "yolov3.cfg" ]; then
    echo "Downloading YOLOv3 config..."
    wget https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3.cfg
fi

# COCO names
if [ ! -f "coco.names" ]; then
    echo "Downloading COCO names..."
    wget https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Edit people_counter.py and update MQTT credentials:"
echo "   - MQTT_USERNAME"
echo "   - MQTT_PASSWORD"
echo ""
echo "2. Run the people counter:"
echo "   python3 people_counter.py"
echo ""
echo "3. To run in background:"
echo "   nohup python3 people_counter.py > people_counter.log 2>&1 &"
