#!/bin/bash

echo "🚀 Setting up Raspberry Pi Camera People Counter..."
echo "========================================================"
echo ""

# Check Python3
python3 --version || { echo "❌ Python3 not found"; exit 1; }

echo ""
echo "📦 Step 1: Installing Python packages via pip..."
echo "This will install: opencv-python, numpy, paho-mqtt"
echo ""

# Install dengan pip (tidak perlu apt-get update)
pip3 install --user opencv-python numpy paho-mqtt || {
    echo "⚠️  pip install failed, trying alternative..."
    pip3 install --break-system-packages opencv-python numpy paho-mqtt
}

echo ""
echo "📦 Step 2: Checking if system OpenCV available..."
python3 -c "import cv2; print('✅ OpenCV:', cv2.__version__)" 2>/dev/null || {
    echo "⚠️  OpenCV not detected from pip install"
    echo "💡 Trying system package..."
    sudo apt-get install -y python3-opencv 2>/dev/null || echo "Skip system opencv"
}

echo ""
echo "📁 Step 3: Creating YOLO directory..."
mkdir -p ~/yolo
cd ~/yolo

echo ""
echo "📥 Step 4: Downloading YOLO model files..."
echo "This will download ~237MB, may take 5-10 minutes..."
echo ""

# Download YOLO weights (large file)
if [ ! -f "yolov3.weights" ]; then
    echo "Downloading yolov3.weights..."
    wget --show-progress https://pjreddie.com/media/files/yolov3.weights || {
        echo "❌ Download failed. Try manual download:"
        echo "   wget https://pjreddie.com/media/files/yolov3.weights"
    }
else
    echo "✅ yolov3.weights already exists"
fi

# Download YOLO config
if [ ! -f "yolov3.cfg" ]; then
    echo "Downloading yolov3.cfg..."
    wget -q https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3.cfg || {
        echo "❌ Download failed"
    }
else
    echo "✅ yolov3.cfg already exists"
fi

# Download COCO names
if [ ! -f "coco.names" ]; then
    echo "Downloading coco.names..."
    wget -q https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names || {
        echo "❌ Download failed"
    }
else
    echo "✅ coco.names already exists"
fi

echo ""
echo "========================================================"
echo "✅ Setup Complete!"
echo "========================================================"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Enable Camera (if using Pi Camera Module):"
echo "   sudo raspi-config"
echo "   → Interface Options → Camera → Enable"
echo ""
echo "2. Verify YOLO files in ~/yolo/:"
echo "   ls -lh ~/yolo/"
echo ""
echo "3. Test the camera:"
echo "   python3 ~/people_counter.py"
echo ""
echo "4. Press Ctrl+C to stop"
echo ""
