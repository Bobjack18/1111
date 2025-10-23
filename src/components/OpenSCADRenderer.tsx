import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { parseOpenSCADToThreeJS } from '../utils/openscadConverter'
import { exportToSTL } from '../utils/stlExporter'
import './OpenSCADRenderer.css'

interface OpenSCADRendererProps {
  code: string
}

export function OpenSCADRenderer({ code }: OpenSCADRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const modelGroupRef = useRef<THREE.Group | null>(null)
  const [error, setError] = useState<string>('')
  const [isRendering, setIsRendering] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const autoRotate = useRef(true)
  const initialCameraDistance = useRef(30)

  // Initialize Three.js scene ONCE when component mounts
  useEffect(() => {
    if (!containerRef.current) return
    if (rendererRef.current) return // Already initialized

    console.log('Initializing Three.js scene...')

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0f0f0f)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(20, 20, 20)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    console.log('Canvas added to DOM')

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight1.position.set(10, 10, 10)
    scene.add(directionalLight1)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4)
    directionalLight2.position.set(-10, -10, -10)
    scene.add(directionalLight2)

    // Grid
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222)
    scene.add(gridHelper)

    // Axes helper
    const axesHelper = new THREE.AxesHelper(15)
    scene.add(axesHelper)

    // Mark scene as ready
    setSceneReady(true)

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)

      if (autoRotate.current && modelGroupRef.current && !isDragging.current) {
        modelGroupRef.current.rotation.y += 0.005
      }

      renderer.render(scene, camera)
    }
    animate()

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup only on unmount
    return () => {
      window.removeEventListener('resize', handleResize)
      if (containerRef.current && renderer.domElement && containerRef.current.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, []) // Empty dependency - only run once!

  // Update model when code changes
  useEffect(() => {
    if (!code) {
      // Clear any existing model if code is empty
      if (modelGroupRef.current && sceneRef.current) {
        sceneRef.current.remove(modelGroupRef.current)
        modelGroupRef.current = null
      }
      return
    }

    if (!sceneReady || !sceneRef.current) {
      console.log('Scene not ready yet, waiting...', { sceneReady, hasScene: !!sceneRef.current })
      return
    }

    console.log('Rendering model from code...')

    setIsRendering(true)
    setError('')

    try {
      // Remove old model
      if (modelGroupRef.current) {
        sceneRef.current.remove(modelGroupRef.current)
        modelGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose()
            if (Array.isArray(child.material)) {
              child.material.forEach((m: THREE.Material) => m.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }

      // Parse and add new model
      console.log('Parsing OpenSCAD code...')
      const modelGroup = parseOpenSCADToThreeJS(code)
      console.log('Parsed! Children count:', modelGroup.children.length)
      
      // Parser now always adds placeholder, so this should never be 0
      if (modelGroup.children.length === 0) {
        console.warn('No geometry found, but parser should have added placeholder')
        throw new Error('No valid geometry found in OpenSCAD code')
      }
      
      sceneRef.current.add(modelGroup)
      modelGroupRef.current = modelGroup

      // Center camera on model
      const box = new THREE.Box3().setFromObject(modelGroup)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      
      if (cameraRef.current && maxDim > 0) {
        const fov = cameraRef.current.fov * (Math.PI / 180)
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
        cameraZ *= 1.5

        cameraRef.current.position.set(
          center.x + cameraZ,
          center.y + cameraZ,
          center.z + cameraZ
        )
        cameraRef.current.lookAt(center)
        initialCameraDistance.current = cameraZ
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering error')
      console.error('Rendering error:', err)
    } finally {
      setIsRendering(false)
    }
  }, [code, sceneReady])

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    autoRotate.current = false
    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !modelGroupRef.current) return

    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y

    modelGroupRef.current.rotation.y += dx * 0.01
    modelGroupRef.current.rotation.x += dy * 0.01

    lastPos.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleDoubleClick = () => {
    autoRotate.current = !autoRotate.current
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault() // Prevent page scroll
    if (!cameraRef.current) return

    const delta = e.deltaY * 0.01
    const camera = cameraRef.current
    
    // Zoom by moving camera closer/farther
    const direction = new THREE.Vector3()
    camera.getWorldDirection(direction)
    
    camera.position.addScaledVector(direction, delta)
    
    // Prevent camera from going too close or too far
    const distance = camera.position.length()
    if (distance < 5) {
      camera.position.normalize().multiplyScalar(5)
    } else if (distance > 200) {
      camera.position.normalize().multiplyScalar(200)
    }
  }

  const handleExportSTL = () => {
    if (!modelGroupRef.current) {
      setError('No model to export')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const filename = `openscad-model-${timestamp}.stl`
      exportToSTL(modelGroupRef.current, filename)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleResetView = () => {
    if (!cameraRef.current || !modelGroupRef.current) return

    const box = new THREE.Box3().setFromObject(modelGroupRef.current)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = cameraRef.current.fov * (Math.PI / 180)
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2))
    cameraZ *= 1.5

    cameraRef.current.position.set(
      center.x + cameraZ,
      center.y + cameraZ,
      center.z + cameraZ
    )
    cameraRef.current.lookAt(center)
    initialCameraDistance.current = cameraZ
  }

  return (
    <div className="openscad-renderer">
      {!code && (
        <div className="placeholder">
          <p>🎨 3D preview will appear here</p>
          <small>Start chatting to generate OpenSCAD code</small>
        </div>
      )}
      
      <div
        ref={containerRef}
        className="three-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{ 
          cursor: isDragging.current ? 'grabbing' : 'grab',
          width: '100%',
          height: '100%',
          display: code ? 'block' : 'none' // Hide when no code, but keep in DOM
        }}
      />
      
      {code && (
        <>
          {isRendering && <div className="rendering-indicator">Rendering...</div>}
          {isExporting && <div className="rendering-indicator">Exporting STL...</div>}
          {error && <div className="error-message">{error}</div>}
          
          <div className="viewer-controls">
            <button 
              className="control-btn" 
              onClick={handleExportSTL}
              disabled={isExporting}
              title="Export to STL"
            >
              📥 Export STL
            </button>
            <button 
              className="control-btn" 
              onClick={handleResetView}
              title="Reset camera view"
            >
              🔄 Reset View
            </button>
          </div>
          
          <div className="controls-hint">
            💡 Drag to rotate • Scroll to zoom • Double-click to toggle auto-rotate
          </div>
        </>
      )}
    </div>
  )
}
