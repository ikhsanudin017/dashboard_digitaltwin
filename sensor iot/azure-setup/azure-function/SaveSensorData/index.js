const { TableClient } = require("@azure/data-tables");

/**
 * Azure Function: Save Sensor Data (Anonymous)
 * Receives sensor data via HTTP POST and stores to Azure Storage Table
 * This endpoint doesn't require authentication - for ESP32 direct posting
 */
module.exports = async function (context, req) {
    // Enable CORS
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    context.log('📥 Sensor data received via HTTP');

    try {
        // Validasi request body
        if (!req.body) {
            context.log.error('❌ No request body provided');
            context.res.status = 400;
            context.res.body = { error: "Request body is required" };
            return;
        }

        // Parse data 
        const sensorData = req.body;
        context.log('📊 Received:', JSON.stringify(sensorData));

        // Validasi data sensor
        if (sensorData.suhu === undefined && sensorData.jumlahOrang === undefined) {
            context.res.status = 400;
            context.res.body = { error: "Invalid sensor data - need suhu or jumlahOrang" };
            return;
        }

        // Simpan ke Storage Table
        const connectionString = process.env.STORAGE_CONNECTION_STRING;
        
        if (!connectionString) {
            throw new Error("STORAGE_CONNECTION_STRING not configured");
        }

        const tableClient = TableClient.fromConnectionString(connectionString, "SensorTelemetry");

        // Create table if not exists
        await tableClient.createTable().catch(() => {});

        // Fungsi untuk mendapatkan waktu WIB (UTC+7)
        const getWIBTime = () => {
            const now = new Date();
            const wibOffset = 7 * 60 * 60 * 1000; // UTC+7 dalam milliseconds
            const wibTime = new Date(now.getTime() + wibOffset);
            return wibTime.toISOString().replace('Z', ' WIB');
        };

        // Prepare entity
        const deviceId = sensorData.deviceId || "ESP32_ENERGY_MONITOR_001";
        const timestamp = sensorData.timestamp || getWIBTime();
        
        const entity = {
            partitionKey: deviceId,
            rowKey: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            timestamp: timestamp,
            deviceId: deviceId,
            receivedAt: getWIBTime()
        };

        // Add sensor fields
        if (sensorData.suhu !== undefined) {
            entity.suhu = parseFloat(sensorData.suhu);
            entity.kelembaban = parseFloat(sensorData.kelembaban || 0);
            entity.tegangan = parseFloat(sensorData.tegangan || 0);
            entity.arus = parseFloat(sensorData.arus || 0);
            entity.daya = parseFloat(sensorData.daya || 0);
            entity.status_tegangan = sensorData.status_tegangan || "unknown";
            entity.status_arus = sensorData.status_arus || "unknown";
        }

        // Add people count if present
        if (sensorData.jumlahOrang !== undefined) {
            entity.jumlahOrang = parseInt(sensorData.jumlahOrang);
        }

        // Insert to table
        await tableClient.createEntity(entity);

        context.log('✅ Data saved to Storage Table');
        context.log(`   - Device: ${deviceId}`);
        context.log(`   - Suhu: ${sensorData.suhu}°C`);

        context.res.status = 200;
        context.res.body = { 
            success: true, 
            message: "Data saved",
            timestamp: timestamp
        };

    } catch (error) {
        context.log.error('❌ Error:', error);
        context.res.status = 500;
        context.res.body = { error: error.message };
    }
};
