import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export type TransformMode = 'translate' | 'rotate' | 'scale'

/**
 * TwinStudio Engine 0.1
 *
 * 集中式三维引擎底座。V0.2 再拆成独立 Manager，
 * 这里先把场景、相机、渲染、拾取、变换和资源释放跑通。
 */
export class TwinEngine {
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer

  private orbitControls: OrbitControls
  private transformControls: TransformControls

  private loader = new GLTFLoader()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private pointerDown = new THREE.Vector2()

  private selectedObject: THREE.Object3D | null = null
  private selectionHelper: THREE.BoxHelper | null = null

  private host: HTMLElement
  private resizeObserver: ResizeObserver
  private animationId = 0
  private disposed = false
  private suppressClick = false

  private onSelect?: (name: string | null) => void

  constructor(host: HTMLElement, onSelect?: (name: string | null) => void) {
    this.host = host
    this.onSelect = onSelect

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111827)

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
    this.camera.position.set(20, 16, 24)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15
    this.renderer.shadowMap.enabled = true
    // Three.js 0.186 起 PCFSoftShadowMap 已移除，软阴影由 PCF + radius 承担。
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.host.appendChild(this.renderer.domElement)

    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement)
    this.orbitControls.enableDamping = true
    this.orbitControls.dampingFactor = 0.06
    this.orbitControls.target.set(0, 3, 0)
    this.orbitControls.maxPolarAngle = Math.PI * 0.49

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
    this.transformControls.setSize(0.8)

    this.scene.add(this.transformControls.getHelper())

    this.transformControls.addEventListener('dragging-changed', (event) => {
      const dragging = Boolean(event.value)
      this.orbitControls.enabled = !dragging
      if (!dragging) this.suppressClick = true
    })

    this.createLights()
    this.createHelpers()
    this.createDemoBuilding()

    this.renderer.domElement.addEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.addEventListener('click', this.handleClick)
    this.renderer.domElement.addEventListener('contextmenu', this.preventContextMenu)

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
    this.resizeObserver.observe(this.host)
    this.resize()
    this.animate()
  }

  private createLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 1.5)
    ambient.name = 'AmbientLight'
    this.scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 2.5)
    directional.name = 'DirectionalLight'
    directional.position.set(20, 30, 15)
    directional.castShadow = true
    directional.shadow.mapSize.set(2048, 2048)
    directional.shadow.radius = 2

    const shadowCamera = directional.shadow.camera
    shadowCamera.near = 0.5
    shadowCamera.far = 80
    shadowCamera.left = -40
    shadowCamera.right = 40
    shadowCamera.top = 40
    shadowCamera.bottom = -40
    shadowCamera.updateProjectionMatrix()

    this.scene.add(directional)
  }

  private createHelpers() {
    const grid = new THREE.GridHelper(100, 100, 0x64748b, 0x334155)
    grid.name = 'Grid'
    this.scene.add(grid)

    const axes = new THREE.AxesHelper(4)
    axes.name = 'Axes'
    // 建筑压在原点上，坐标轴放到门口前方，避免被墙体挡住。
    axes.position.set(3.2, 0.02, 8.2)
    this.scene.add(axes)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.MeshStandardMaterial({
        color: 0x263449,
        roughness: 0.95,
      }),
    )
    ground.name = 'Ground'
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.03
    ground.receiveShadow = true
    this.scene.add(ground)
  }

  private createDemoBuilding() {
    const building = new THREE.Group()
    building.name = '示例建筑'
    building.userData.selectable = true

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xdce4ec,
      roughness: 0.8,
    })
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.65,
    })
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90b8,
      metalness: 0.25,
      roughness: 0.25,
    })

    const body = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 10), wallMaterial)
    body.name = 'Body'
    body.position.y = 3.5
    body.castShadow = true
    body.receiveShadow = true
    building.add(body)

    const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.5, 11), roofMaterial)
    roof.name = 'Roof'
    roof.position.y = 7.25
    roof.castShadow = true
    building.add(roof)

    for (let floor = 0; floor < 2; floor++) {
      for (let i = 0; i < 6; i++) {
        const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.12), windowMaterial)
        windowMesh.name = `Window-${floor}-${i}`
        windowMesh.position.set(-6 + i * 2.4, 1.8 + floor * 3, 5.06)
        building.add(windowMesh)
      }
    }

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x334155 }),
    )
    door.name = 'Door'
    door.position.set(0, 1.25, 5.12)
    building.add(door)

    this.scene.add(building)
  }

  private isEngineHelper(object: THREE.Object3D) {
    let current: THREE.Object3D | null = object

    while (current && current !== this.scene) {
      if (current === this.selectionHelper) return true

      const helper = current as THREE.Object3D & {
        isTransformControlsRoot?: boolean
        isTransformControlsGizmo?: boolean
        isTransformControlsPlane?: boolean
      }

      if (
        helper.isTransformControlsRoot ||
        helper.isTransformControlsGizmo ||
        helper.isTransformControlsPlane
      ) {
        return true
      }

      current = current.parent
    }

    return false
  }

  private preventContextMenu = (event: Event) => {
    event.preventDefault()
  }

  private handlePointerDown = (event: PointerEvent) => {
    this.pointerDown.set(event.clientX, event.clientY)
  }

  private handleClick = (event: MouseEvent) => {
    if (this.suppressClick) {
      this.suppressClick = false
      return
    }

    const moved =
      Math.abs(event.clientX - this.pointerDown.x) > 4 ||
      Math.abs(event.clientY - this.pointerDown.y) > 4

    if (this.transformControls.dragging || moved) return

    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.pointer, this.camera)

    const intersections = this.raycaster.intersectObjects(this.scene.children, true)
    let target: THREE.Object3D | null = null

    for (const hit of intersections) {
      if (this.isEngineHelper(hit.object)) continue

      let current: THREE.Object3D | null = hit.object

      while (current && current !== this.scene) {
        if (current.userData.selectable === true) {
          target = current
          break
        }
        current = current.parent
      }

      if (target) break
    }

    this.selectObject(target)
  }

  private selectObject(object: THREE.Object3D | null) {
    this.selectedObject = object
    this.transformControls.detach()

    if (this.selectionHelper) {
      this.scene.remove(this.selectionHelper)
      this.selectionHelper.geometry.dispose()
      const material = this.selectionHelper.material
      if (!Array.isArray(material)) material.dispose()
      this.selectionHelper = null
    }

    if (object) {
      this.transformControls.attach(object)

      this.selectionHelper = new THREE.BoxHelper(object, 0x00e5ff)
      this.selectionHelper.name = 'SelectionHelper'
      this.scene.add(this.selectionHelper)

      this.onSelect?.(object.name || '未命名对象')
    } else {
      this.onSelect?.(null)
    }
  }

  setTransformMode(mode: TransformMode) {
    this.transformControls.setMode(mode)
  }

  loadModel(file: File): Promise<void> {
    const url = URL.createObjectURL(file)

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene
          model.name = file.name
          model.userData.selectable = true

          model.traverse((object) => {
            if (object instanceof THREE.Mesh) {
              object.castShadow = true
              object.receiveShadow = true
            }
          })

          const box = new THREE.Box3().setFromObject(model)
          const center = box.getCenter(new THREE.Vector3())
          model.position.sub(center)

          this.scene.add(model)
          this.selectObject(model)
          URL.revokeObjectURL(url)
          resolve()
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url)
          console.error('模型加载失败：', error)
          reject(error)
        },
      )
    })
  }

  private resize() {
    const width = this.host.clientWidth
    const height = this.host.clientHeight
    if (!width || !height) return

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private animate = () => {
    if (this.disposed) return

    this.animationId = requestAnimationFrame(this.animate)
    this.orbitControls.update()

    if (this.selectionHelper && this.selectedObject) {
      this.selectionHelper.update()
    }

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.animationId)
    this.resizeObserver.disconnect()

    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown)
    this.renderer.domElement.removeEventListener('click', this.handleClick)
    this.renderer.domElement.removeEventListener('contextmenu', this.preventContextMenu)

    this.orbitControls.dispose()
    this.transformControls.dispose()
    this.disposeSceneResources()
    this.renderer.dispose()
    this.renderer.domElement.remove()

    this.selectionHelper = null
    this.selectedObject = null
  }

  private disposeSceneResources() {
    const disposedMaterials = new Set<THREE.Material>()

    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.LineSegments ||
        object instanceof THREE.Line
      ) {
        object.geometry.dispose()

        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          if (disposedMaterials.has(material)) continue
          disposedMaterials.add(material)
          material.dispose()
        }
      }
    })
  }
}
