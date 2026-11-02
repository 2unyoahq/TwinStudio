# TwinStudio

基于 Web 的通用数字孪生场景编辑平台。当前版本是 **Engine 0.1**：Three.js 引擎底座和编辑器外壳。

## 技术基线

- Vue 3.5 + TypeScript 5.9 + Vite 8
- Three.js 0.186（OrbitControls、TransformControls、GLTFLoader 使用官方 addons）

## 开发

```powershell
cd frontend
npm install
npm run dev
```

浏览器打开终端里的本地地址，通常是 http://localhost:5173/ 。

## 验收

```powershell
npm run typecheck
npm run build
npm run preview
```

V0.1 可以旋转、缩放、平移相机，点击选择示例建筑，并对选中对象移动、旋转、缩放，也可以导入本地 GLB / GLTF。左侧场景树仍是静态示例，场景保存和 BIM 不在本阶段范围内。
