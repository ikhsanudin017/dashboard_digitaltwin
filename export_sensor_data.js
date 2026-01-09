const { TableClient } = require("@azure/data-tables");
const fs = require("fs");
const path = require("path");

// Load .env file
require('dotenv').config();

const conn = process.env.STORAGE_CONNECTION_STRING;
if (!conn) {
  console.error("❌ STORAGE_CONNECTION_STRING not set");
  process.exit(1);
}

(async () => {
  try {
    console.log("📊 Mengambil data dari SensorTelemetry...\n");
    
    const client = TableClient.fromConnectionString(conn, "SensorTelemetry");
    const entities = [];
    
    for await (const entity of client.listEntities()) {
      entities.push(entity);
    }
    
    if (entities.length === 0) {
      console.log("⚠️  Tidak ada data di tabel SensorTelemetry");
      process.exit(0);
    }
    
    console.log(`✅ Ditemukan ${entities.length} entitas\n`);
    console.log("Sample data (5 entitas pertama):");
    entities.slice(0, 5).forEach((e, i) => {
      console.log(`${i+1}. DeviceId: ${e.deviceId || e.PartitionKey}, Suhu: ${e.suhu}°C, Daya: ${e.daya}W, Timestamp: ${e.timestamp}`);
    });
    
    // Prepare CSV
    const headers = ["timestamp", "deviceId", "suhu", "kelembaban", "tegangan", "arus", "daya", "status_tegangan", "status_arus", "receivedAt"];
    const rows = entities.map(e => [
      e.timestamp || "",
      e.deviceId || e.PartitionKey || "",
      e.suhu || "",
      e.kelembaban || "",
      e.tegangan || "",
      e.arus || "",
      e.daya || "",
      e.status_tegangan || "",
      e.status_arus || "",
      e.receivedAt || ""
    ]);
    
    // Write CSV
    const csvContent = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const filename = `sensor_telemetry_${new Date().toISOString().split('T')[0]}.csv`;
    const filepath = path.join(__dirname, filename);
    
    fs.writeFileSync(filepath, csvContent, "utf-8");
    
    console.log(`\n✅ CSV exported: ${filepath}`);
    console.log(`📦 Total records: ${entities.length}`);
    console.log(`📄 File size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
