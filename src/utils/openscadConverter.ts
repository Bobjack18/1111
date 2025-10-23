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
    
    // Extract variables
    const variables = new Map<string, number>()
    const varMatches = cleanCode.matchAll(/(\w+)\s*=\s*([0-9.]+)\s*;/g)
    for (const match of varMatches) {
      variables.set(match[1], parseFloat(match[2]))
    }
    
    // Try to parse the entire code structure
    const parsed = parseComplexStructure(cleanCode, variables)
    if (parsed) {
      group.add(parsed)
      return group
    }
    
    // Fallback: Parse line by line for simple cases
    const lines = cleanCode.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (!trimmed || trimmed.length === 0) continue
      
      // Parse cube
      if (trimmed.includes('cube(')) {
        const cube = parseCube(trimmed, variables)
        if (cube) group.add(cube)
      }
      
      // Parse sphere
      else if (trimmed.includes('sphere(')) {
        const sphere = parseSphere(trimmed, variables)
        if (sphere) group.add(sphere)
      }
      
      // Parse cylinder
      else if (trimmed.includes('cylinder(')) {
        const cylinder = parseCylinder(trimmed, variables)
        if (cylinder) group.add(cylinder)
      }
    }
    
    // If no objects were parsed, create a simple placeholder
    if (group.children.length === 0) {
      // Create a simple box as placeholder
      const geometry = new THREE.BoxGeometry(10, 10, 10)
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x667eea,
        transparent: true,
        opacity: 0.7
      })
      const mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
    }
  } catch (error) {
    console.error('Error parsing OpenSCAD:', error)
    // Create placeholder on error
    const geometry = new THREE.BoxGeometry(10, 10, 10)
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.7
    })
    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)
  }
  
  return group
}

// Parse complex nested structures
function parseComplexStructure(code: string, variables: Map<string, number>): THREE.Object3D | null {
  try {
    // Handle difference() blocks
    if (code.includes('difference()')) {
      return parseDifferenceBlock(code, variables)
    }
    
    // Handle union() blocks
    if (code.includes('union()')) {
      return parseUnionBlock(code, variables)
    }
    
    // Handle linear_extrude
    if (code.includes('linear_extrude')) {
      return parseLinearExtrude(code, variables)
    }
    
    return null
  } catch (error) {
    console.error('Error parsing complex structure:', error)
    return null
  }
}

// Parse difference() { ... } blocks
function parseDifferenceBlock(code: string, variables: Map<string, number>): THREE.Object3D | null {
  try {
    // Extract the content inside difference() { ... }
    const match = code.match(/difference\(\)\s*\{([\s\S]*)\}/)
    if (!match) return null
    
    const content = match[1]
    
    // For now, create a simple approximation - render the first shape
    // Real CSG would require three-csg-ts library
    const shapes = extractShapes(content, variables)
    if (shapes.length > 0) {
      // Return the first (base) shape with a different color to indicate it's a difference
      const base = shapes[0]
      if (base instanceof THREE.Mesh) {
        base.material = new THREE.MeshPhongMaterial({
          color: 0x8b5cf6,
          transparent: true,
          opacity: 0.85
        })
      }
      return base
    }
    
    return null
  } catch (error) {
    console.error('Error parsing difference:', error)
    return null
  }
}

// Parse union() { ... } blocks
function parseUnionBlock(code: string, variables: Map<string, number>): THREE.Object3D | null {
  try {
    const match = code.match(/union\(\)\s*\{([\s\S]*)\}/)
    if (!match) return null
    
    const content = match[1]
    const group = new THREE.Group()
    
    const shapes = extractShapes(content, variables)
    shapes.forEach(shape => group.add(shape))
    
    return group
  } catch (error) {
    console.error('Error parsing union:', error)
    return null
  }
}

// Parse linear_extrude
function parseLinearExtrude(code: string, variables: Map<string, number>): THREE.Object3D | null {
  try {
    // Extract height parameter
    const heightMatch = code.match(/height\s*=\s*([^,\)]+)/)
    let height = 10
    if (heightMatch) {
      const heightStr = heightMatch[1].trim()
      height = variables.has(heightStr) ? variables.get(heightStr)! : parseFloat(heightStr)
    }
    
    // For now, create a simple extruded shape (box)
    // Real implementation would need to parse 2D shapes and extrude them
    const geometry = new THREE.BoxGeometry(20, 20, height)
    const material = new THREE.MeshPhongMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85
    })
    const mesh = new THREE.Mesh(geometry, material)
    
    return mesh
  } catch (error) {
    console.error('Error parsing linear_extrude:', error)
    return null
  }
}

// Extract shapes from code block
function extractShapes(code: string, variables: Map<string, number>): THREE.Object3D[] {
  const shapes: THREE.Object3D[] = []
  
  // Look for translate blocks
  const translateMatches = code.matchAll(/translate\(\[([^\]]+)\]\)\s*(\w+\([^}]+\}|\w+\([^)]+\))/g)
  for (const match of translateMatches) {
    const coords = match[1].split(',').map(s => {
      const trimmed = s.trim()
      return variables.has(trimmed) ? variables.get(trimmed)! : parseFloat(trimmed)
    })
    
    const shapeCode = match[2]
    const shape = parseShape(shapeCode, variables)
    if (shape) {
      shape.position.set(coords[0] || 0, coords[1] || 0, coords[2] || 0)
      shapes.push(shape)
    }
  }
  
  // Look for standalone shapes
  const cubeMatches = code.matchAll(/cube\(\s*\[([^\]]+)\][^;]*\)/g)
  for (const match of cubeMatches) {
    const cube = parseCube(match[0], variables)
    if (cube) shapes.push(cube)
  }
  
  return shapes
}

// Parse a single shape
function parseShape(code: string, variables: Map<string, number>): THREE.Object3D | null {
  if (code.includes('cube(')) {
    return parseCube(code, variables)
  } else if (code.includes('sphere(')) {
    return parseSphere(code, variables)
  } else if (code.includes('cylinder(')) {
    return parseCylinder(code, variables)
  } else if (code.includes('linear_extrude')) {
    return parseLinearExtrude(code, variables)
  }
  return null
}

function parseCube(line: string, variables: Map<string, number> = new Map()): THREE.Mesh | null {
  try {
    // Match cube([x, y, z], ...) or cube(size, ...) with optional parameters and semicolon
    const bracketMatch = line.match(/cube\(\s*\[([^\]]+)\]/)
    const singleMatch = line.match(/cube\(\s*([^,\[\)]+)/)
    
    let params: number[]
    
    if (bracketMatch) {
      // cube([x, y, z]) - may contain variables
      params = bracketMatch[1].split(',').map(s => {
        const trimmed = s.trim()
        // Check if it's a variable
        if (variables.has(trimmed)) {
          return variables.get(trimmed)!
        }
        return parseFloat(trimmed)
      })
    } else if (singleMatch) {
      // cube(size) - may be a variable
      const trimmed = singleMatch[1].trim()
      const val = variables.has(trimmed) ? variables.get(trimmed)! : parseFloat(trimmed)
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

function parseSphere(line: string, variables: Map<string, number> = new Map()): THREE.Mesh | null {
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

function parseCylinder(line: string, variables: Map<string, number> = new Map()): THREE.Mesh | null {
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
