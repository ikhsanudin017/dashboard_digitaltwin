const fs = require("fs");
const path = require("path");

// Generate realistic sensor data for ML training
function generateSensorData(days = 30, samplesPerDay = 288) {
  const data = [];
  const now = new Date();
  
  for (let d = 0; d < days; d++) {
    for (let s = 0; s < samplesPerDay; s++) {
      const timestamp = new Date(now.getTime() - (days - d) * 24 * 60 * 60 * 1000 - (samplesPerDay - s) * 5 * 60 * 1000);
      const hour = timestamp.getHours();
      
      // Realistic temperature (18-28°C, higher during day)
      const suhu = 20 + 6 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 2;
      
      // Realistic humidity (40-80%, inverse to temperature)
      const kelembaban = 60 - 15 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 5;
      
      // People count (0-50, peak at 8-17)
      const basePeople = hour >= 8 && hour <= 17 ? Math.floor(20 + 15 * Math.sin((hour - 8) * Math.PI / 9)) : 5;
      const jumlahOrang = Math.max(0, basePeople + Math.floor((Math.random() - 0.5) * 10));
      
      // Power consumption (1-5kW, correlates with people and temperature)
      const daya = 2 + (jumlahOrang / 50) * 2 + (Math.max(suhu, 24) - 24) * 0.3 + (Math.random() - 0.5) * 0.5;
      
      data.push({
        timestamp: timestamp.toISOString(),
        deviceId: "ESP32_ENERGY_MONITOR_001",
        suhu: suhu.toFixed(2),
        kelembaban: kelembaban.toFixed(2),
        jumlahOrang: jumlahOrang,
        daya: daya.toFixed(2),
        tegangan: (220 + (Math.random() - 0.5) * 10).toFixed(2),
        arus: (daya / 220).toFixed(2),
        status: "ok"
      });
    }
  }
  
  return data;
}

// Write to CSV
const data = generateSensorData(30, 288); // 30 days, 5 minutes interval (288 samples/day)

const headers = ["timestamp", "deviceId", "suhu", "kelembaban", "jumlahOrang", "daya", "tegangan", "arus", "status"];
const csvContent = [
  headers.join(","),
  ...data.map(row => 
    headers.map(h => {
      const val = row[h];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(",")
  )
].join("\n");

const filename = `sensor_data_sample_${new Date().toISOString().split('T')[0]}.csv`;
const filepath = path.join(__dirname, filename);

fs.writeFileSync(filepath, csvContent, "utf-8");

console.log(`✅ Sample data generated!`);
console.log(`📄 File: ${filename}`);
console.log(`📦 Records: ${data.length}`);
console.log(`📊 Duration: 30 days (5-minute intervals)`);
console.log(`📈 Size: ${(fs.statSync(filepath).size / 1024 / 1024).toFixed(2)} MB`);
console.log(`\n📥 Ready untuk ML training:`);
console.log(`   - Suhu (°C)`);
console.log(`   - Kelembaban (%)`);
console.log(`   - Jumlah Orang`);
console.log(`   - Konsumsi Daya (kW)`);
