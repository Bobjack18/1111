# 🤖 Gemini OpenSCAD Editor

> A professional web application that combines AI-powered code generation with real-time 3D visualization

Transform your ideas into 3D models using natural language. This application uses Google's Gemini AI to generate OpenSCAD code and renders it instantly in a WebGL-powered 3D viewer.

[![Made with React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.160-000000?logo=three.js)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite)](https://vitejs.dev/)

## Features

- 🤖 **Gemini AI Integration**: Chat with Gemini 2.5 Flash to generate OpenSCAD code
- 🎨 **Real-time 3D Rendering**: Full Three.js WebGL renderer with lighting and shadows
- ✏️ **Interactive Code Editing**: Manual editing with live preview updates
- 💬 **Conversational Interface**: Iterative design through natural language
- 🔄 **Auto-rotate**: Models automatically rotate for better viewing
- 🖱️ **Interactive Controls**: 
  - Drag to rotate the model
  - Scroll/mousewheel to zoom in/out
  - Double-click to toggle auto-rotate
  - Reset view button to recenter camera
- 📥 **STL Export**: Download your models as STL files for 3D printing
- 📐 **Grid & Axes**: Visual reference grid and coordinate axes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone and install dependencies**
```bash
cd windsurf-project
npm install
```

2. **Configure API key** (Optional - can also enter in UI)
```bash
cp .env.example .env
# Edit .env and add: VITE_GEMINI_API_KEY=your_api_key_here
```

3. **Start development server**
```bash
npm run dev
```

4. **Open in browser**
```
http://localhost:3000
```

### Build for Production
```bash
npm run build
npm run preview
```

## Usage

1. **Enter your Gemini API key** (first time only - it will be saved in your browser)
2. Enter your request in the chat (e.g., "Create a cube with a sphere on top")
3. Gemini will generate OpenSCAD code
4. View the 3D model in the preview pane
5. Interact with the 3D view:
   - **Drag** to rotate
   - **Scroll** to zoom
   - **Double-click** to toggle auto-rotate
   - Click **Reset View** to recenter
6. Click **Export STL** to download for 3D printing
7. Continue chatting to refine the design

### Managing Your API Key
- Your API key is saved locally in your browser (localStorage)
- Click **"Change API Key"** in the header to enter a new key
- Click **"Reset Chat"** to clear conversation history
- Your API key never leaves your browser

## Technologies

- **React + TypeScript**: Modern UI framework
- **Vite**: Lightning-fast build tool
- **Google Gemini 2.5 Flash**: AI code generation
- **Three.js**: WebGL 3D rendering engine
- **Custom OpenSCAD Parser**: Converts OpenSCAD primitives to Three.js geometry

## 📐 Supported OpenSCAD Features

| Feature | Syntax | Status |
|---------|--------|--------|
| **Cube** | `cube([x, y, z])` or `cube(size)` | ✅ Full support |
| **Sphere** | `sphere(r=radius)` | ✅ Full support |
| **Cylinder** | `cylinder(h=height, r=radius)` | ✅ Full support |
| **Cone** | `cylinder(h=height, r1=r1, r2=r2)` | ✅ Full support |
| **Translate** | `translate([x, y, z]) object` | ✅ Full support |
| **Rotate** | `rotate([x, y, z]) object` | ✅ Full support |
| **Difference** | `difference() { ... }` | ⚠️ Basic support |
| **Union** | `union() { ... }` | 🔜 Coming soon |
| **Intersection** | `intersection() { ... }` | 🔜 Coming soon |

### Example Code
```openscad
// Simple cube
cube([10, 10, 10]);

// Sphere on cylinder
translate([0, 0, 10])
  sphere(r=5);
cylinder(h=10, r=3);

// Rotated object
rotate([45, 0, 0])
  cube([5, 5, 15]);
```
