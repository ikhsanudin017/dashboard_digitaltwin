const { TableClient } = require("@azure/data-tables");

/**
 * Azure Function: IoT Hub to Storage Table
 * Receives data from Azure IoT Hub (Event Hub-compatible endpoint) 
 * and stores to Azure Storage Table
 */
module.exports = async function (context, eventHubMessages) {
    context.log(`📥 Processing ${eventHubMessages.length} messages from IoT Hub`);

    try {
        // Dapatkan Storage Connection String
        const connectionString = process.env.STORAGE_CONNECTION_STRING;
        
        if (!connectionString) {
            throw new Error("STORAGE_CONNECTION_STRING not configured");
        }

        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "SensorTelemetry"
        );

        // Create table jika belum ada
        await tableClient.createTable().catch(() => {
            context.log('ℹ️  Table SensorTelemetry already exists');
        });

        // Process setiap message
        for (const message of eventHubMessages) {
            try {
                context.log('📊 Processing message:', JSON.stringify(message));

                // Parse data jika berupa string
                const sensorData = typeof message === 'string' ? JSON.parse(message) : message;
                
                // Ambil device ID dari system properties atau dari payload
                const deviceId = context.bindingData.systemPropertiesArray?.[0]?.['iothub-connection-device-id'] 
                    || sensorData.deviceId 
                    || "UNKNOWN_DEVICE";
                
                const timestamp = sensorData.timestamp || new Date().toISOString();
                
                // Prepare entity untuk Storage Table
                const entity = {
                    partitionKey: deviceId,
                    rowKey: Date.now().toString() + Math.random().toString(36).substring(2, 7), // Unique ID
                    timestamp: timestamp,
                    deviceId: deviceId,
                    receivedAt: new Date().toISOString()
                };
                
                // Tambahkan field sensor jika ada (support kedua format: Indonesia dan English)
                if (sensorData.suhu !== undefined || sensorData.temperature !== undefined) {
                    entity.suhu = parseFloat(sensorData.suhu ?? sensorData.temperature);
                    entity.kelembaban = parseFloat(sensorData.kelembaban ?? sensorData.humidity);
                    entity.tegangan = parseFloat(sensorData.tegangan ?? sensorData.voltage);
                    entity.arus = parseFloat(sensorData.arus ?? sensorData.current);
                    entity.daya = parseFloat(sensorData.daya ?? sensorData.power);
                    entity.status_tegangan = sensorData.status_tegangan || "normal";
                    entity.status_arus = sensorData.status_arus || "normal";
                    
                    // Tambahan field jika ada
                    if (sensorData.energy !== undefined) {
                        entity.energy = parseFloat(sensorData.energy);
                    }
                }
                
                // Tambahkan field people count jika ada
                if (sensorData.jumlahOrang !== undefined) {
                    entity.jumlahOrang = parseInt(sensorData.jumlahOrang);
                }

                // Insert ke Storage Table
                await tableClient.createEntity(entity);
                
                context.log('✅ Data saved to Storage Table');
                context.log(`   - Device: ${deviceId}`);
                if (sensorData.suhu !== undefined) {
                    context.log(`   - Suhu: ${sensorData.suhu}°C`);
                    context.log(`   - Daya: ${sensorData.daya}W`);
                }
                if (sensorData.jumlahOrang !== undefined) {
                    context.log(`   - Jumlah Orang: ${sensorData.jumlahOrang}`);
                }

            } catch (err) {
                context.log.error(`❌ Error processing message: ${err.message}`);
                context.log.error(err.stack);
                // Continue processing other messages
            }
        }

        context.log('✅ All messages processed successfully');

    } catch (error) {
        context.log.error('❌ Fatal error:', error.message);
        context.log.error(error.stack);
        throw error; // Re-throw untuk retry
    }
};
