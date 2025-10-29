<script setup lang="ts">
import { onMounted, watch } from 'vue';
import RoomSummaryCards from '@/components/RoomSummaryCards.vue';
import RealtimeCharts from '@/components/RealtimeCharts.vue';
import HistoryPanel from '@/components/HistoryPanel.vue';
import AlertsPanel from '@/components/AlertsPanel.vue';
import DigitalTwin3D from '@/components/DigitalTwin3D.vue';
import { useTelemetryStore } from '@/stores/useTelemetryStore';
import { useConfigStore } from '@/stores/useConfigStore';

const telemetry = useTelemetryStore();
const config = useConfigStore();

const ensureMode = () => {
  telemetry.setMode(config.mode);
  telemetry.setRoom(config.roomId);
  if (config.mode === 'mock') {
    telemetry.startMock();
  } else {
    telemetry.stopMock();
  }
};

onMounted(() => {
  ensureMode();
});

watch(
  () => config.mode,
  () => {
    ensureMode();
  }
);

watch(
  () => config.roomId,
  () => {
    telemetry.setRoom(config.roomId);
    if (config.mode === 'mock') {
      telemetry.startMock();
    }
  }
);
</script>

<template>
  <section class="flex flex-col gap-6">
    <RoomSummaryCards />
    <RealtimeCharts />
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <HistoryPanel />
      <AlertsPanel />
    </div>
    <DigitalTwin3D />
  </section>
</template>
