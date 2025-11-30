#!/usr/bin/env node

const https = require('https');

const API_BASE = 'https://func-energymonitor-c9001a7e.azurewebsites.net/api';

async function testEndpoint(path, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 URL: ${API_BASE}${path}`);
    
    return new Promise((resolve) => {
        const startTime = Date.now();
        https.get(`${API_BASE}${path}`, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                const duration = Date.now() - startTime;
                console.log(`✅ Status: ${res.statusCode} (${duration}ms)`);
                
                try {
                    const json = JSON.parse(data);
                    console.log(`📊 Response:`, JSON.stringify(json, null, 2));
                } catch (e) {
                    console.log(`📄 Response:`, data.substring(0, 200));
                }
                resolve();
            });
        }).on('error', (err) => {
            console.log(`❌ Error: ${err.message}`);
            resolve();
        });
    });
}

async function runTests() {
    console.log('🚀 Testing Azure Function API Endpoints\n');
    console.log('=' .repeat(60));
    
    await testEndpoint('/telemetry/latest', 'Get Latest Telemetry');
    await testEndpoint('/telemetry/history?hours=1&limit=5', 'Get History (1 hour, 5 records)');
    await testEndpoint('/telemetry/stats?hours=24', 'Get Statistics (24 hours)');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!');
}

runTests();
