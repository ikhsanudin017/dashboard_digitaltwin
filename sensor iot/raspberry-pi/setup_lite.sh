#!/bin/bash

echo "🚀 Quick Setup - Raspberry Pi People Counter (LITE)"
echo "===================================================="
echo ""

# Check Python3
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found"
    exit 1
fi

echo "✅ Python3: $(python3 --version)"

# Install only paho-mqtt (minimal requirement)
echo ""
echo "📦 Installing paho-mqtt..."
pip3 install --user paho-mqtt

echo ""
echo "===================================================="
echo "✅ Setup complete!"
echo "===================================================="
echo ""
echo "📝 To run:"
echo "   python3 ~/people_counter_lite.py"
echo ""
echo "💡 This is LITE version for testing MQTT connection"
echo "   No camera/YOLO required - sends simulated data"
echo ""
