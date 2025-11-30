# Azure Digital Twins Queries

## 1. Physical Hierarchy (Struktur Gedung)
Menampilkan struktur fisik: Building → Room → Sensor

```sql
SELECT building, room, sensor
FROM DIGITALTWINS building
JOIN room RELATED building.hasRoom
JOIN sensor RELATED room.hasSensor
WHERE building.$dtId = 'BUILDING_MAIN'
```

## 2. Data Flow Infrastructure (Alur Data)
Menampilkan infrastructure: ESP32 → HiveMQ → Bridge → IoT Hub → ADT

```sql
SELECT sensor, broker, gateway, hub, adt
FROM DIGITALTWINS sensor
JOIN broker RELATED sensor.receivesFrom INCOMING
JOIN gateway RELATED broker.subscribesTo INCOMING
JOIN hub RELATED gateway.forwardsTo
JOIN adt RELATED hub.routesTo
WHERE sensor.$dtId = 'ESP32_ENERGY_MONITOR_001'
```

## 3. View Physical Assets Only
Hanya gedung, ruangan, dan sensor fisik

```sql
SELECT * FROM DIGITALTWINS
WHERE IS_OF_MODEL('dtmi:digitaltwin:energymonitor:Building;1')
   OR IS_OF_MODEL('dtmi:digitaltwin:energymonitor:Room;1')
   OR IS_OF_MODEL('dtmi:digitaltwin:energymonitor:EnergyMonitorSensor;1')
```

## 4. View Infrastructure Only
Hanya komponen IT infrastructure

```sql
SELECT * FROM DIGITALTWINS
WHERE IS_OF_MODEL('dtmi:digitaltwin:infrastructure:MqttBroker;1')
   OR IS_OF_MODEL('dtmi:digitaltwin:infrastructure:DataGateway;1')
   OR IS_OF_MODEL('dtmi:digitaltwin:infrastructure:IoTHub;1')
   OR IS_OF_MODEL('dtmi:digitaltwin:infrastructure:DigitalTwinsService;1')
```

## 5. Complete System View
Semua twins dan relationships

```sql
SELECT * FROM DIGITALTWINS
```

