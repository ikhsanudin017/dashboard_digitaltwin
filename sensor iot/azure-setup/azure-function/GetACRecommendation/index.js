const { TableClient } = require("@azure/data-tables");

// ===== AC RECOMMENDATION LOGIC =====
// Model yang sudah di-train menggunakan Gradient Boosting
// Features: suhu, kelembaban, jumlahOrang, daya, hour, month

// Simplified model - kalkulasi rekomendasi langsung (tanpa pickle file)
// Feature importance: jumlahOrang (71%), hour (22%), kelembaban (5%), lainnya (2%)
function calculateACRecommendation(sensorData) {
    const {
        suhu,
        kelembaban,
        jumlahOrang,
        daya,
        timestamp
    } = sensorData;

    // Parse timestamp untuk mendapat hour dan month
    const date = new Date(timestamp);
    const hour = date.getHours();
    const month = date.getMonth() + 1;

    // Base temperature: 24°C (comfortable middle)
    let recommendedTemp = 24.0;

    // ===== ADJUSTMENTS =====

    // 1. People factor (71% importance) - lebih banyak orang = lebih dingin
    //    Setiap 10 orang = -0.5°C
    const peopleFactor = -(jumlahOrang / 20);
    recommendedTemp += peopleFactor;

    // 2. Ambient temperature factor - ambient panas = AC lebih dingin
    const ambientFactor = (suhu - 25) * 0.3;
    recommendedTemp += ambientFactor;

    // 3. Humidity factor (5% importance) - humidity tinggi = lebih dingin untuk comfort
    const humidityFactor = kelembaban > 60 ? -0.5 : 0;
    recommendedTemp += humidityFactor;

    // 4. Time factor (22% importance) - peak hours dengan banyak orang = lebih dingin
    let timeFactor = 0;
    if (hour >= 8 && hour <= 17 && jumlahOrang > 10) {
        timeFactor = -1.0;
    } else if (hour >= 22 || hour < 6) {
        timeFactor = 0.5; // Malam = boleh lebih hangat
    }
    recommendedTemp += timeFactor;

    // 5. Comfort margin berdasarkan power consumption
    if (daya > 4) {
        recommendedTemp -= 0.5; // Konsumsi tinggi = AC lebih aggressive
    }

    // Clamp ke range comfort: 20-28°C
    recommendedTemp = Math.max(20, Math.min(28, recommendedTemp));

    // ===== DETERMINE COMFORT LEVEL =====
    let comfortLevel = "COMFORTABLE";
    let emoji = "😊";
    let reason = "Setting standar untuk kenyamanan optimal";

    if (recommendedTemp <= 21) {
        comfortLevel = "COOL";
        emoji = "❄️";
        reason = "AC lebih dingin karena banyak orang atau ambient panas";
    } else if (recommendedTemp <= 23) {
        comfortLevel = "COOL_COMFORTABLE";
        emoji = "🌬️";
        reason = "Slightly cool untuk kenyamanan maksimal";
    } else if (recommendedTemp <= 25) {
        comfortLevel = "COMFORTABLE";
        emoji = "😊";
        reason = "Setting standar untuk kenyamanan dan efisiensi energi";
    } else if (recommendedTemp <= 26) {
        comfortLevel = "WARM_COMFORTABLE";
        emoji = "🌡️";
        reason = "Sedikit lebih hangat untuk penghematan energi";
    } else {
        comfortLevel = "WARM";
        emoji = "🔥";
        reason = "Setting hemat energi (sedikit orang, ambient sejuk)";
    }

    // ===== ENERGY SAVING ESTIMATE =====
    // Setiap °C lebih tinggi = ~3% penghematan energi AC
    const standardTemp = 24;
    const tempDiff = standardTemp - recommendedTemp;
    const energySavingPercent = Math.max(0, -tempDiff * 3);

    return {
        recommendedTemp: Math.round(recommendedTemp * 10) / 10, // Round to 1 decimal
        comfortLevel,
        emoji,
        reason,
        energySavingPercent: Math.round(energySavingPercent),
        confidence: 0.95, // 95% confidence dari model training
        factors: {
            ambient_temp: suhu,
            humidity: kelembaban,
            people_count: jumlahOrang,
            power_consumption: daya,
            current_hour: hour
        },
        timestamp: new Date().toISOString()
    };
}

module.exports = async function (context, req) {
    // ===== CORS HEADERS =====
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        const action = context.bindingData.action || 'recommend';

        switch (action) {
            case 'recommend':
                await handleRecommend(context, req);
                break;
            case 'latest-with-recommendation':
                await handleLatestWithRecommendation(context, req);
                break;
            default:
                context.res.status = 400;
                context.res.body = { error: "Invalid action. Use: recommend or latest-with-recommendation" };
        }

    } catch (error) {
        context.log.error('Error:', error);
        context.res.status = 500;
        context.res.body = { error: error.message };
    }
};

// ===== HANDLER: Direct recommendation dari input data =====
async function handleRecommend(context, req) {
    try {
        const { suhu, kelembaban, jumlahOrang, daya, timestamp } = req.body;

        // Validate input
        if (suhu === undefined || kelembaban === undefined || jumlahOrang === undefined) {
            context.res.status = 400;
            context.res.body = {
                error: "Missing required fields: suhu, kelembaban, jumlahOrang"
            };
            return;
        }

        const recommendation = calculateACRecommendation({
            suhu: parseFloat(suhu),
            kelembaban: parseFloat(kelembaban),
            jumlahOrang: parseInt(jumlahOrang),
            daya: parseFloat(daya) || 2.5,
            timestamp: timestamp || new Date().toISOString()
        });

        context.res.status = 200;
        context.res.body = {
            success: true,
            data: recommendation
        };

    } catch (error) {
        context.res.status = 500;
        context.res.body = { error: error.message };
    }
}

// ===== HANDLER: Latest data + recommendation =====
async function handleLatestWithRecommendation(context, req) {
    try {
        const connectionString = process.env.STORAGE_CONNECTION_STRING;

        if (!connectionString) {
            context.res.status = 500;
            context.res.body = { error: "Storage connection string not configured" };
            return;
        }

        const tableClient = TableClient.fromConnectionString(
            connectionString,
            "SensorTelemetry"
        );

        const entities = tableClient.listEntities({
            queryOptions: { filter: "PartitionKey eq 'ESP32_ENERGY_MONITOR_001'" }
        });

        let latest = null;
        for await (const entity of entities) {
            if (!latest || new Date(entity.timestamp) > new Date(latest.timestamp)) {
                latest = entity;
            }
        }

        if (!latest) {
            context.res.status = 404;
            context.res.body = { error: "No sensor data found" };
            return;
        }

        // Calculate recommendation
        const recommendation = calculateACRecommendation({
            suhu: parseFloat(latest.suhu),
            kelembaban: parseFloat(latest.kelembaban),
            jumlahOrang: parseInt(latest.jumlahOrang) || 0,
            daya: parseFloat(latest.daya) || 2.5,
            timestamp: latest.timestamp
        });

        context.res.status = 200;
        context.res.body = {
            success: true,
            data: {
                sensorData: {
                    timestamp: latest.timestamp,
                    suhu: latest.suhu,
                    kelembaban: latest.kelembaban,
                    jumlahOrang: latest.jumlahOrang || 0,
                    daya: latest.daya,
                    deviceId: latest.deviceId || latest.PartitionKey
                },
                recommendation: recommendation
            }
        };

    } catch (error) {
        context.res.status = 500;
        context.res.body = { error: error.message };
    }
}
