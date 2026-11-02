<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { TwinEngine, type TransformMode } from '../engine/core/TwinEngine'

const emit = defineEmits<{
  select: [name: string | null]
}>()

const host = ref<HTMLDivElement | null>(null)

let engine: TwinEngine | null = null

onMounted(() => {
  if (!host.value) return

  engine = new TwinEngine(host.value, (name) => {
    emit('select', name)
  })
})

function loadModel(file: File) {
  if (!engine) {
    throw new Error('Three.js 引擎尚未初始化')
  }

  return engine.loadModel(file)
}

function setTransformMode(mode: TransformMode) {
  engine?.setTransformMode(mode)
}

onBeforeUnmount(() => {
  engine?.dispose()
  engine = null
})

defineExpose({
  loadModel,
  setTransformMode,
})
</script>

<template>
  <div ref="host" class="three-viewport"></div>
</template>

<style scoped>
.three-viewport {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background: #111827;
}

.three-viewport :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
