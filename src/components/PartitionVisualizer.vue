<template>
  <div class="partition-visualizer">
    <div v-for="(segment, index) in partitionSegments" :key="index" class="partition-segment" :style="{
      width: segment.width,
      backgroundColor: segment.color
    }" :title="segment.title">
      {{ segment.name }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import { partitionStore } from '@/store'


const store = partitionStore();

const partitionSegments = computed(() => {
  return store.partitions.map((partition, index) => {
    const width = (partition.size / store.flashSizeBytes * 100) + '%';
    const color = getColor(index);
    const title = `${partition.name}: ${partition.size} bytes`;
    return { width, color, title, name: partition.name };
  });
});

function getColor(index: number): string {
  const colors = ['#ff9999', '#99ccff', '#99ff99', '#ffcc99', '#ccccff'];
  return colors[index % colors.length];
}

</script>

<style scoped>
.partition-visualizer {
  display: flex;
  width: 100%;
  height: 50px;
  border: 1px solid #ccc;
  margin-bottom: 20px;
}

.partition-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  text-align: center;
  overflow: hidden;
}
</style>
