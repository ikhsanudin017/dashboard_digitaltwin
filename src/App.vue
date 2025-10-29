<script setup lang="ts">
import HeaderBar from '@/components/HeaderBar.vue';
import ConnectionBar from '@/components/ConnectionBar.vue';
import Dashboard from '@/pages/Dashboard.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <HeaderBar />
    <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-12 pt-6">
      <ConnectionBar />
      <Dashboard />
    </main>
  </div>
</template>
