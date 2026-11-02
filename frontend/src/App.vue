<script setup lang="ts">
import { ref } from 'vue'
import ThreeViewport from './components/ThreeViewport.vue'
import type { TransformMode } from './engine/core/TwinEngine'

const viewport = ref<InstanceType<typeof ThreeViewport> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedName = ref<string | null>(null)
const loading = ref(false)
const transformMode = ref<TransformMode>('translate')

function openFilePicker() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) return

  const lowerName = file.name.toLowerCase()
  if (!lowerName.endsWith('.glb') && !lowerName.endsWith('.gltf')) {
    window.alert('请选择 GLB 或 GLTF 文件')
    input.value = ''
    return
  }

  loading.value = true

  try {
    await viewport.value?.loadModel(file)
  } catch {
    window.alert('模型加载失败，请检查文件')
  } finally {
    loading.value = false
    input.value = ''
  }
}

function setMode(mode: TransformMode) {
  transformMode.value = mode
  viewport.value?.setTransformMode(mode)
}
</script>

<template>
  <div class="studio">
    <header class="toolbar">
      <div class="brand">
        <div class="brand-icon">T</div>
        <div>
          <strong>TwinStudio</strong>
          <small>Digital Twin Editor</small>
        </div>
      </div>

      <div class="toolbar-actions">
        <button type="button" @click="openFilePicker">
          <span>＋</span> 导入模型
        </button>
        <button
          type="button"
          :class="{ active: transformMode === 'translate' }"
          @click="setMode('translate')"
        >
          移动
        </button>
        <button
          type="button"
          :class="{ active: transformMode === 'rotate' }"
          @click="setMode('rotate')"
        >
          旋转
        </button>
        <button
          type="button"
          :class="{ active: transformMode === 'scale' }"
          @click="setMode('scale')"
        >
          缩放
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".glb,.gltf"
          hidden
          @change="onFileChange"
        />
      </div>

      <div class="toolbar-status">
        <span class="status-dot"></span>
        Engine Ready
      </div>
    </header>

    <main class="workspace">
      <aside class="side-panel">
        <div class="panel-title">场景资源</div>
        <div class="tree-item">▾ Scene</div>
        <div class="tree-item child">◈ 示例建筑</div>
        <div class="tree-item child">◈ Ground</div>
        <div class="tree-item child">◈ Grid</div>

        <div class="panel-divider"></div>

        <div class="panel-title">资源管理</div>
        <div class="empty-hint">可以导入 GLB / GLTF 模型</div>
      </aside>

      <section class="viewport-area">
        <div class="viewport-label">SCENE VIEWPORT</div>
        <ThreeViewport ref="viewport" @select="selectedName = $event" />
        <div v-if="loading" class="loading">正在加载模型...</div>
        <div class="viewport-footer">
          <span>Perspective</span>
          <span>World Coordinates</span>
        </div>
      </section>

      <aside class="side-panel inspector">
        <div class="panel-title">属性检查器</div>

        <div v-if="selectedName">
          <div class="property-label">当前选中对象</div>
          <div class="selected-object">{{ selectedName }}</div>
          <div class="property-label">对象状态</div>
          <div class="property-value">已选中</div>
        </div>
        <div v-else class="empty-hint">请在三维视口中选择一个对象</div>

        <div class="panel-divider"></div>

        <div class="panel-title">引擎信息</div>
        <div class="property-label">Rendering Engine</div>
        <div class="property-value">Three.js</div>
        <div class="property-label">Project</div>
        <div class="property-value">TwinStudio V0.1</div>
      </aside>
    </main>

    <footer class="console">
      <span>CONSOLE</span>
      <span>Engine initialized successfully.</span>
      <span>Three.js Viewport Ready</span>
    </footer>
  </div>
</template>
