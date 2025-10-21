import { useState, useEffect } from 'react'
import './CodeEditor.css'

interface CodeEditorProps {
  code: string
  onChange: (code: string) => void
}

export function CodeEditor({ code, onChange }: CodeEditorProps) {
  const [localCode, setLocalCode] = useState(code)

  useEffect(() => {
    setLocalCode(code)
  }, [code])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
    setLocalCode(newCode)
    onChange(newCode)
  }

  return (
    <div className="code-editor">
      <textarea
        value={localCode}
        onChange={handleChange}
        placeholder="// OpenSCAD code will appear here...
// You can also edit it manually

// Example:
cube([10, 10, 10]);"
        spellCheck={false}
      />
    </div>
  )
}
