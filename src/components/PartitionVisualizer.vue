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
import { computed } from 'vue';
import { partitionStore } from '@/store'

const store = partitionStore();

const partitionSegments = computed(() => {
  const partitions = store.partitionTables.getPartitions();
  const flashSizeBytes = store.flashSizeBytes;
  const segments = [];
  
  if (partitions.length > 0) {
    const firstPartitionOffset = partitions[0].offset;
    const freeSpace = firstPartitionOffset;
    const freeSpacePercentage = (freeSpace / flashSizeBytes) * 100;

    segments.push({
      name: 'Offset table',
      width: `${freeSpacePercentage}%`,
      color: 'black',
      title: `Offset table: ${freeSpace} bytes`
    });
  }

  partitions.forEach((partition, index) => {
    const width = (partition.size / flashSizeBytes * 100) + '%';
    const color = getColor(index);
    const title = `${partition.name}: ${partition.size} bytes (${store.hintDisplaySize(partition.size)})`;
    segments.push({ width, color, title, name: partition.name });
  });

  return segments;
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
}

.partition-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  color: black;
  text-align: center;
  overflow: hidden;
  cursor: pointer; 
}
</style>
