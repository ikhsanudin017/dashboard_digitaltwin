const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
    // Enable CORS
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

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

        const action = context.bindingData.action || 'latest';
        const hours = parseInt(req.query.hours) || 24;
        const limit = parseInt(req.query.limit) || 100;

        context.log(`API called: action=${action}, hours=${hours}, limit=${limit}`);

        switch (action) {
            case 'latest':
                await handleLatest(context, tableClient);
                break;
            case 'history':
                await handleHistory(context, tableClient, hours, limit);
                break;
            case 'stats':
                await handleStats(context, tableClient, hours);
                break;
            default:
                context.res.status = 400;
                context.res.body = { error: "Invalid action. Use: latest, history, or stats" };
        }

    } catch (error) {
        context.log.error('Error:', error);
        context.res.status = 500;
        context.res.body = { error: error.message };
    }
};

async function handleLatest(context, tableClient) {
    const entities = tableClient.listEntities({
        queryOptions: { filter: "PartitionKey eq 'ESP32_ENERGY_MONITOR_001'" }
    });

    let latest = null;
    for await (const entity of entities) {
        if (!latest || new Date(entity.timestamp) > new Date(latest.timestamp)) {
            latest = entity;
        }
    }

    if (latest) {
        context.res.status = 200;
        context.res.body = {
            success: true,
            data: {
                timestamp: latest.timestamp,
                suhu: latest.suhu,
                kelembaban: latest.kelembaban,
                tegangan: latest.tegangan,
                arus: latest.arus,
                daya: latest.daya,
                deviceId: latest.deviceId || latest.PartitionKey
            }
        };
    } else {
        context.res.status = 404;
        context.res.body = { error: "No data found" };
    }
}

async function handleHistory(context, tableClient, hours, limit) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const entities = tableClient.listEntities({
        queryOptions: { filter: "PartitionKey eq 'ESP32_ENERGY_MONITOR_001'" }
    });

    const data = [];
    for await (const entity of entities) {
        if (new Date(entity.timestamp) >= cutoffTime) {
            data.push({
                timestamp: entity.timestamp,
                suhu: entity.suhu,
                kelembaban: entity.kelembaban,
                tegangan: entity.tegangan,
                arus: entity.arus,
                daya: entity.daya
            });
        }
        if (data.length >= limit) break;
    }

    // Sort by timestamp descending
    data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    context.res.status = 200;
    context.res.body = {
        success: true,
        count: data.length,
        hours: hours,
        data: data
    };
}

async function handleStats(context, tableClient, hours) {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const entities = tableClient.listEntities({
        queryOptions: { filter: "PartitionKey eq 'ESP32_ENERGY_MONITOR_001'" }
    });

    let count = 0;
    let totalSuhu = 0, totalKelembaban = 0, totalTegangan = 0, totalArus = 0, totalDaya = 0;
    let maxSuhu = -Infinity, minSuhu = Infinity;
    let maxDaya = -Infinity, minDaya = Infinity;

    for await (const entity of entities) {
        if (new Date(entity.timestamp) >= cutoffTime) {
            count++;
            totalSuhu += entity.suhu || 0;
            totalKelembaban += entity.kelembaban || 0;
            totalTegangan += entity.tegangan || 0;
            totalArus += entity.arus || 0;
            totalDaya += entity.daya || 0;

            maxSuhu = Math.max(maxSuhu, entity.suhu || 0);
            minSuhu = Math.min(minSuhu, entity.suhu || 0);
            maxDaya = Math.max(maxDaya, entity.daya || 0);
            minDaya = Math.min(minDaya, entity.daya || 0);
        }
    }

    if (count > 0) {
        context.res.status = 200;
        context.res.body = {
            success: true,
            hours: hours,
            count: count,
            averages: {
                suhu: parseFloat((totalSuhu / count).toFixed(2)),
                kelembaban: parseFloat((totalKelembaban / count).toFixed(2)),
                tegangan: parseFloat((totalTegangan / count).toFixed(2)),
                arus: parseFloat((totalArus / count).toFixed(4)),
                daya: parseFloat((totalDaya / count).toFixed(2))
            },
            ranges: {
                suhu: { min: minSuhu, max: maxSuhu },
                daya: { min: minDaya, max: maxDaya }
            }
        };
    } else {
        context.res.status = 404;
        context.res.body = { error: "No data found for the specified time range" };
    }
}
