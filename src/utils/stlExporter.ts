import * as THREE from 'three'

// Export Three.js geometry to STL format
export function exportToSTL(group: THREE.Group, filename: string = 'model.stl'): void {
  try {
    const stlString = generateSTL(group)
    downloadSTL(stlString, filename)
  } catch (error) {
    console.error('Error exporting STL:', error)
    throw error
  }
}

function generateSTL(group: THREE.Group): string {
  const meshes: THREE.Mesh[] = []
  
  // Collect all meshes from the group
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      meshes.push(child)
    }
  })

  if (meshes.length === 0) {
    throw new Error('No meshes to export')
  }

  // Generate ASCII STL
  let stl = 'solid model\n'

  meshes.forEach((mesh) => {
    const geometry = mesh.geometry
    const positionAttribute = geometry.getAttribute('position')
    const normalAttribute = geometry.getAttribute('normal')
    const index = geometry.index

    if (!positionAttribute) return

    const vertices: THREE.Vector3[] = []
    for (let i = 0; i < positionAttribute.count; i++) {
      vertices.push(
        new THREE.Vector3(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        ).applyMatrix4(mesh.matrixWorld)
      )
    }

    const normals: THREE.Vector3[] = []
    if (normalAttribute) {
      for (let i = 0; i < normalAttribute.count; i++) {
        normals.push(
          new THREE.Vector3(
            normalAttribute.getX(i),
            normalAttribute.getY(i),
            normalAttribute.getZ(i)
          ).applyMatrix4(new THREE.Matrix4().extractRotation(mesh.matrixWorld))
        )
      }
    }

    // Write triangles
    if (index) {
      // Indexed geometry
      for (let i = 0; i < index.count; i += 3) {
        const i1 = index.getX(i)
        const i2 = index.getX(i + 1)
        const i3 = index.getX(i + 2)

        const v1 = vertices[i1]
        const v2 = vertices[i2]
        const v3 = vertices[i3]

        // Calculate normal if not available
        let normal: THREE.Vector3
        if (normals.length > 0) {
          normal = normals[i1].clone().add(normals[i2]).add(normals[i3]).normalize()
        } else {
          const edge1 = new THREE.Vector3().subVectors(v2, v1)
          const edge2 = new THREE.Vector3().subVectors(v3, v1)
          normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
        }

        stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`
        stl += `    outer loop\n`
        stl += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`
        stl += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`
        stl += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`
        stl += `    endloop\n`
        stl += `  endfacet\n`
      }
    } else {
      // Non-indexed geometry
      for (let i = 0; i < vertices.length; i += 3) {
        const v1 = vertices[i]
        const v2 = vertices[i + 1]
        const v3 = vertices[i + 2]

        if (!v1 || !v2 || !v3) continue

        // Calculate normal
        let normal: THREE.Vector3
        if (normals.length > 0) {
          normal = normals[i].clone().add(normals[i + 1]).add(normals[i + 2]).normalize()
        } else {
          const edge1 = new THREE.Vector3().subVectors(v2, v1)
          const edge2 = new THREE.Vector3().subVectors(v3, v1)
          normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()
        }

        stl += `  facet normal ${normal.x} ${normal.y} ${normal.z}\n`
        stl += `    outer loop\n`
        stl += `      vertex ${v1.x} ${v1.y} ${v1.z}\n`
        stl += `      vertex ${v2.x} ${v2.y} ${v2.z}\n`
        stl += `      vertex ${v3.x} ${v3.y} ${v3.z}\n`
        stl += `    endloop\n`
        stl += `  endfacet\n`
      }
    }
  })

  stl += 'endsolid model\n'
  return stl
}

function downloadSTL(stlString: string, filename: string): void {
  const blob = new Blob([stlString], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
