import * as THREE from 'three'

// Convert OpenSCAD code to Three.js geometry
export function parseOpenSCADToThreeJS(code: string): THREE.Group {
  const group = new THREE.Group()
  
  try {
    // Remove comments and clean code
    const cleanCode = code
      .split('\n')
      .map(line => {
        // Remove single-line comments
        const commentIndex = line.indexOf('//')
        if (commentIndex !== -1) {
          return line.substring(0, commentIndex)
        }
        return line
      })
      .join('\n')
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
    
    // Parse basic OpenSCAD primitives
    const lines = cleanCode.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (!trimmed || trimmed.length === 0) continue
      
      // Parse cube
      if (trimmed.includes('cube(')) {
        const cube = parseCube(trimmed)
        if (cube) group.add(cube)
      }
      
      // Parse sphere
      else if (trimmed.includes('sphere(')) {
        const sphere = parseSphere(trimmed)
        if (sphere) group.add(sphere)
      }
      
      // Parse cylinder
      else if (trimmed.includes('cylinder(')) {
        const cylinder = parseCylinder(trimmed)
        if (cylinder) group.add(cylinder)
      }
      
      // Parse translate
      else if (trimmed.includes('translate(')) {
        const translated = parseTranslate(trimmed, cleanCode)
        if (translated) group.add(translated)
      }
      
      // Parse rotate
      else if (trimmed.includes('rotate(')) {
        const rotated = parseRotate(trimmed, cleanCode)
        if (rotated) group.add(rotated)
      }
      
      // Parse difference
      else if (trimmed.includes('difference()')) {
        const diff = parseDifference(cleanCode)
        if (diff) group.add(diff)
      }
    }
    
    // If no objects were parsed, throw error
    if (group.children.length === 0) {
      throw new Error('No valid OpenSCAD primitives found. Supported: cube, sphere, cylinder, translate, rotate')
    }
  } catch (error) {
    console.error('Error parsing OpenSCAD:', error)
    throw error
  }
  
  return group
}

function parseCube(line: string): THREE.Mesh | null {
  try {
    // Match cube([x, y, z]) or cube(size)
    const bracketMatch = line.match(/cube\(\s*\[([^\]]+)\]\s*\)/)
    const singleMatch = line.match(/cube\(\s*([^,\[\]]+)\s*\)/)
    
    let params: number[]
    
    if (bracketMatch) {
      // cube([x, y, z])
      params = bracketMatch[1].split(',').map(s => parseFloat(s.trim()))
    } else if (singleMatch) {
      // cube(size)
      const val = parseFloat(singleMatch[1].trim())
      params = [val]
    } else {
      console.warn('Could not parse cube:', line)
      return null
    }
    
    let size: [number, number, number]
    
    if (params.length === 1) {
      size = [params[0], params[0], params[0]]
    } else {
      size = [params[0] || 1, params[1] || 1, params[2] || 1]
    }
    
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2])
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x667eea,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Center the cube (OpenSCAD cubes start at origin)
    mesh.position.set(size[0] / 2, size[1] / 2, size[2] / 2)
    
    return mesh
  } catch (error) {
    console.error('Error parsing cube:', error)
    return null
  }
}

function parseSphere(line: string): THREE.Mesh | null {
  try {
    // Match sphere(r=...) or sphere(...)
    const match = line.match(/sphere\((?:r\s*=\s*)?([^,)]+)/)
    if (!match) return null
    
    const radius = parseFloat(match[1].trim())
    
    const geometry = new THREE.SphereGeometry(radius, 32, 32)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x764ba2,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    return mesh
  } catch (error) {
    console.error('Error parsing sphere:', error)
    return null
  }
}

function parseCylinder(line: string): THREE.Mesh | null {
  try {
    // Match cylinder(h=..., r=...) or cylinder(h, r, r)
    const hMatch = line.match(/h\s*=\s*([^,)]+)/)
    const rMatch = line.match(/r\s*=\s*([^,)]+)/)
    const r1Match = line.match(/r1\s*=\s*([^,)]+)/)
    const r2Match = line.match(/r2\s*=\s*([^,)]+)/)
    
    const height = hMatch ? parseFloat(hMatch[1]) : 1
    const radius = rMatch ? parseFloat(rMatch[1]) : 1
    const r1 = r1Match ? parseFloat(r1Match[1]) : radius
    const r2 = r2Match ? parseFloat(r2Match[1]) : radius
    
    const geometry = new THREE.CylinderGeometry(r2, r1, height, 32)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x48bb78,
      transparent: true,
      opacity: 0.9
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    // Rotate to match OpenSCAD orientation (Z-up)
    mesh.rotation.x = Math.PI / 2
    
    return mesh
  } catch (error) {
    console.error('Error parsing cylinder:', error)
    return null
  }
}

function parseTranslate(line: string, fullCode: string): THREE.Group | null {
  try {
    const match = line.match(/translate\(\[([^\]]+)\]\)/)
    if (!match) return null
    
    const coords = match[1].split(',').map(s => parseFloat(s.trim()))
    const [x, y, z] = coords
    
    // Find the child object
    const childMatch = fullCode.match(/translate\([^)]+\)\s*(\w+\([^)]+\))/)
    if (!childMatch) return null
    
    const group = new THREE.Group()
    group.position.set(x, y, z)
    
    // Parse child
    const childLine = childMatch[1]
    let child: THREE.Mesh | null = null
    
    if (childLine.startsWith('cube')) child = parseCube(childLine)
    else if (childLine.startsWith('sphere')) child = parseSphere(childLine)
    else if (childLine.startsWith('cylinder')) child = parseCylinder(childLine)
    
    if (child) group.add(child)
    
    return group
  } catch (error) {
    console.error('Error parsing translate:', error)
    return null
  }
}

function parseRotate(line: string, fullCode: string): THREE.Group | null {
  try {
    const match = line.match(/rotate\(\[([^\]]+)\]\)/)
    if (!match) return null
    
    const angles = match[1].split(',').map(s => parseFloat(s.trim()) * Math.PI / 180)
    const [x, y, z] = angles
    
    const group = new THREE.Group()
    group.rotation.set(x, y, z)
    
    // Find and parse child (simplified)
    const childMatch = fullCode.match(/rotate\([^)]+\)\s*(\w+\([^)]+\))/)
    if (childMatch) {
      const childLine = childMatch[1]
      let child: THREE.Mesh | null = null
      
      if (childLine.startsWith('cube')) child = parseCube(childLine)
      else if (childLine.startsWith('sphere')) child = parseSphere(childLine)
      else if (childLine.startsWith('cylinder')) child = parseCylinder(childLine)
      
      if (child) group.add(child)
    }
    
    return group
  } catch (error) {
    console.error('Error parsing rotate:', error)
    return null
  }
}

function parseDifference(code: string): THREE.Group | null {
  try {
    // This is a simplified version - proper CSG would require a library
    // For now, just render the first object
    const group = new THREE.Group()
    
    const match = code.match(/difference\(\)\s*\{([^}]+)\}/)
    if (!match) return null
    
    const content = match[1]
    const lines = content.split('\n')
    
    // Just render the first object for now
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('cube')) {
        const cube = parseCube(trimmed)
        if (cube) {
          cube.material = new THREE.MeshPhongMaterial({ 
            color: 0xed8936,
            transparent: true,
            opacity: 0.9
          })
          group.add(cube)
          break
        }
      }
    }
    
    return group
  } catch (error) {
    console.error('Error parsing difference:', error)
    return null
  }
}
