#!/usr/bin/env python3
"""
Script untuk test koneksi kamera Raspberry Pi
Jalankan ini di Raspberry Pi untuk memastikan semuanya berfungsi
"""

import cv2
import sys
import os
from flask import Flask, Response
from flask_cors import CORS
import socket

print("="*60)
print("🔍 RASPBERRY PI CAMERA TROUBLESHOOTING")
print("="*60)

def get_local_ip():
    """Dapatkan IP lokal Raspberry Pi"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

def test_webcam():
    """Test apakah webcam bisa dibuka"""
    print("\n1️⃣  Testing Webcam...")
    
    # Test berbagai port USB
    for port in [0, 1, 2]:
        print(f"   Trying port {port}...")
        cap = cv2.VideoCapture(port)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print(f"   ✅ Webcam found on port {port}!")
                print(f"   📐 Resolution: {int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))}x{int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))}")
                cap.release()
                return port
            cap.release()
    
    print("   ❌ No webcam detected!")
    print("\n💡 Troubleshooting:")
    print("   - Pastikan webcam USB terhubung")
    print("   - Jalankan: ls /dev/video*")
    print("   - Coba restart Raspberry Pi")
    return None

def test_yolo_files():
    """Test apakah YOLO files ada"""
    print("\n2️⃣  Checking YOLO Files...")
    
    files = ['yolov3-tiny.cfg', 'yolov3-tiny.weights', 'coco.names']
    all_exist = True
    
    for f in files:
        if os.path.exists(f):
            size = os.path.getsize(f) / (1024*1024)  # MB
            print(f"   ✅ {f} ({size:.1f} MB)")
        else:
            print(f"   ❌ {f} - NOT FOUND")
            all_exist = False
    
    if not all_exist:
        print("\n💡 Troubleshooting:")
        print("   - Files akan didownload otomatis saat script dijalankan")
        print("   - Atau download manual dari:")
        print("     https://pjreddie.com/media/files/yolov3-tiny.weights")
    
    return all_exist

def test_flask_server():
    """Test Flask server"""
    print("\n3️⃣  Testing Flask Server...")
    
    try:
        app = Flask(__name__)
        CORS(app)
        
        @app.route('/')
        def index():
            return "OK"
        
        print("   ✅ Flask server initialized")
        return True
    except Exception as e:
        print(f"   ❌ Flask error: {e}")
        return False

def test_network():
    """Test network configuration"""
    print("\n4️⃣  Network Configuration...")
    
    ip = get_local_ip()
    print(f"   📍 Local IP: {ip}")
    print(f"   🌐 Stream URL: http://{ip}:5000/video_feed")
    print(f"   👥 Count API: http://{ip}:5000/count")
    
    print("\n💡 Gunakan IP ini di file .env:")
    print(f"   VITE_RASPBERRY_PI_IP={ip}")
    
    return ip

def run_simple_stream_test():
    """Jalankan server sederhana untuk test"""
    print("\n5️⃣  Starting Simple Stream Test...")
    
    port = test_webcam()
    if port is None:
        return False
    
    app = Flask(__name__)
    CORS(app)
    
    camera = cv2.VideoCapture(port)
    camera.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
    
    def generate():
        while True:
            success, frame = camera.read()
            if not success:
                break
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
    
    @app.route('/video_feed')
    def video_feed():
        return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')
    
    @app.route('/count')
    def count():
        return {'count': 0, 'status': 'test mode'}
    
    @app.route('/')
    def index():
        return f"""
        <html>
        <body style="background: #000; color: #0f0; text-align: center; padding: 50px;">
            <h1>✅ Camera Test - Working!</h1>
            <img src="/video_feed" style="max-width: 100%; border: 3px solid #0f0;">
            <p>IP: {get_local_ip()}:5000</p>
        </body>
        </html>
        """
    
    ip = get_local_ip()
    print(f"\n✅ Test server starting on http://{ip}:5000")
    print(f"   Buka di browser: http://{ip}:5000")
    print(f"   Untuk stop: Ctrl+C")
    print("="*60)
    
    try:
        app.run(host='0.0.0.0', port=5000, debug=False)
    except KeyboardInterrupt:
        print("\n⏹️  Stopped")
        camera.release()

def main():
    """Main troubleshooting function"""
    
    # Run all tests
    webcam_port = test_webcam()
    yolo_ok = test_yolo_files()
    flask_ok = test_flask_server()
    ip = test_network()
    
    print("\n" + "="*60)
    print("📋 SUMMARY")
    print("="*60)
    
    if webcam_port is not None:
        print("✅ Webcam: OK")
    else:
        print("❌ Webcam: NOT DETECTED")
    
    if yolo_ok:
        print("✅ YOLO Files: OK")
    else:
        print("⚠️  YOLO Files: Missing (akan didownload otomatis)")
    
    if flask_ok:
        print("✅ Flask Server: OK")
    else:
        print("❌ Flask Server: ERROR")
    
    print(f"✅ Network: OK (IP: {ip})")
    
    print("\n" + "="*60)
    
    if webcam_port is not None:
        print("\n💡 Next Steps:")
        print(f"   1. Update .env file: VITE_RASPBERRY_PI_IP={ip}")
        print("   2. Run: python3 people_counter_yolo.py")
        print("   3. Atau test simple stream: gunakan opsi --test")
        
        response = input("\n❓ Jalankan test stream sederhana? (y/n): ")
        if response.lower() == 'y':
            run_simple_stream_test()
    else:
        print("\n❌ Fix webcam issue dulu sebelum lanjut!")
        print("\n💡 Common Solutions:")
        print("   - sudo apt-get install fswebcam")
        print("   - sudo usermod -a -G video $USER")
        print("   - sudo reboot")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        # Direct test mode
        run_simple_stream_test()
    else:
        main()
