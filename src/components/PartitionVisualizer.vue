<template>
  <div class="partition-visualizer">
    <div
      v-for="(segment, index) in partitionSegments"
      :key="index"
      class="partition-segment"
      :style="{
        width: segment.width,
        backgroundColor: segment.color
      }"
      :title="segment.title"
    >
      {{ segment.name }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue';

export default defineComponent({
  name: 'PartitionVisualizer',
  props: {
    partitions: {
      type: Array as PropType<any[]>,
      required: true
    },
    flashSize: {
      type: Number,
      required: true
    }
  },
  computed: {
    flashSizeBytes(): number {
      return this.flashSize * 1024 * 1024- 0x1000;
    },
    partitionSegments() {
      return this.partitions.map((partition, index) => {
        const width = (partition.size / this.flashSizeBytes * 100) + '%';
        const color = this.getColor(index);
        const title = `${partition.name}: ${partition.size} bytes`;
        return { width, color, title, name: partition.name };
      });
    }
  },
  methods: {
    getColor(index: number): string {
      const colors = ['#ff9999', '#99ccff', '#99ff99', '#ffcc99', '#ccccff'];
      return colors[index % colors.length];
    }
  }
});
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
  color: white;
  text-align: center;
  font-size: 12px;
  overflow: hidden;
}
</style>
