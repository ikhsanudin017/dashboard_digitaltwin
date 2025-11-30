#!/bin/bash

echo "🚀 Setting up Raspberry Pi People Counter (Offline Mode)..."
echo ""

# Check if Python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install manually."
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"

# Install pip if not available
if ! command -v pip3 &> /dev/null; then
    echo "⚠️  pip3 not found, trying to install..."
    sudo apt-get install -y python3-pip || echo "Please install pip3 manually"
fi

# Install Python packages
echo ""
echo "📦 Installing Python packages..."
pip3 install --user opencv-python numpy paho-mqtt

# Check if OpenCV is already installed
python3 -c "import cv2; print('✅ OpenCV version:', cv2.__version__)" 2>/dev/null || {
    echo "⚠️  OpenCV not found. Trying apt installation..."
    sudo apt-get install -y python3-opencv
}

# Create YOLO directory
echo ""
echo "📁 Creating YOLO directory..."
mkdir -p ~/yolo
cd ~/yolo

# Download YOLO files (if internet works)
echo ""
echo "📥 Downloading YOLO model files..."
echo "This may take 10-15 minutes..."

# Try to download, but don't fail if it doesn't work
wget -q --show-progress https://pjreddie.com/media/files/yolov3.weights 2>/dev/null || {
    echo "⚠️  Cannot download yolov3.weights (network issue)"
    echo "💡 Alternative: Download from another device and transfer via USB/SCP"
}

wget -q https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3.cfg 2>/dev/null || {
    echo "⚠️  Cannot download yolov3.cfg"
}

wget -q https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names 2>/dev/null || {
    echo "⚠️  Cannot download coco.names"
}

echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo "=========================================="
echo ""
echo "📝 Next steps:"
echo "1. Make sure YOLO files are in ~/yolo/:"
echo "   - yolov3.weights (~237MB)"
echo "   - yolov3.cfg"
echo "   - coco.names"
echo ""
echo "2. Edit MQTT credentials in people_counter.py"
echo ""
echo "3. Test camera:"
echo "   python3 ~/people_counter.py"
echo ""
echo "4. If network issues persist, download YOLO files manually:"
echo "   https://pjreddie.com/media/files/yolov3.weights"
echo ""
