// Simplified Azure Function - just receive and acknowledge data
// The bridge script already handles Digital Twins and Storage
module.exports = async function (context, req) {
    context.log('MQTT data received from bridge');

    try {
        // Validasi request body
        if (!req.body) {
            context.log.error('No request body provided');
            context.res = {
                status: 400,
                body: { error: "Request body is required" }
            };
            return;
        }

        // Parse data dari MQTT
        const sensorData = req.body;
        
        // Log received data
        context.log('Received sensor data:', JSON.stringify(sensorData));
        
        // Validasi data sensor (optional - lebih flexible)
        const requiredFields = ['suhu', 'kelembaban', 'tegangan', 'arus', 'daya'];
        const missingFields = requiredFields.filter(field => sensorData[field] === undefined);
        
        if (missingFields.length > 0) {
            context.log.warn(`Missing fields: ${missingFields.join(', ')}`);
        }

        // Tambahkan timestamp jika belum ada
        const enrichedData = {
            ...sensorData,
            timestamp: sensorData.timestamp || new Date().toISOString(),
            deviceId: sensorData.deviceId || process.env.DEVICE_ID || "ESP32_ENERGY_MONITOR_001",
            processedBy: "AzureFunction"
        };

        context.log('Processed data successfully:', JSON.stringify(enrichedData));

        // Response sukses - tidak perlu forward ke IoT Hub
        // karena bridge sudah handle Digital Twins dan Storage
        context.res = {
            status: 200,
            body: {
                success: true,
                message: "Data received and logged successfully",
                data: enrichedData,
                timestamp: new Date().toISOString()
            }
        };

    } catch (error) {
        context.log.error('Error processing request:', error.message);
        context.log.error('Stack trace:', error.stack);
        context.res = {
            status: 500,
            body: {
                success: false,
                error: "Internal server error",
                message: error.message
            }
        };
    }
};
