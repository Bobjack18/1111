import { useState, useEffect, useRef } from 'react'
import './App.css'
import { GeminiService } from './services/GeminiService'
import { OpenSCADRenderer } from './components/OpenSCADRenderer'
import { ChatInterface } from './components/ChatInterface'
import { CodeEditor } from './components/CodeEditor'

export interface Message {
  role: 'user' | 'assistant'
  content: string
  code?: string
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [openscadCode, setOpenscadCode] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(true)
  const geminiServiceRef = useRef<GeminiService | null>(null)

  useEffect(() => {
    // Check for saved API key in localStorage first
    const savedApiKey = localStorage.getItem('gemini_api_key')
    if (savedApiKey) {
      setShowApiKeyInput(false)
      geminiServiceRef.current = new GeminiService(savedApiKey)
      return
    }

    // Fall back to environment variable
    const envApiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (envApiKey && envApiKey !== 'your_gemini_api_key_here') {
      setShowApiKeyInput(false)
      geminiServiceRef.current = new GeminiService(envApiKey)
    }
  }, [])

  const handleApiKeySubmit = (key: string) => {
    // Save API key to localStorage
    localStorage.setItem('gemini_api_key', key)
    setShowApiKeyInput(false)
    geminiServiceRef.current = new GeminiService(key)
  }

  const handleSendMessage = async (userMessage: string) => {
    if (!geminiServiceRef.current) return

    const newUserMessage: Message = { role: 'user', content: userMessage }
    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      const response = await geminiServiceRef.current.generateOpenSCAD(
        userMessage,
        openscadCode,
        messages
      )

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.explanation,
        code: response.code
      }

      setMessages(prev => [...prev, assistantMessage])
      setOpenscadCode(response.code)
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate code'}`
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCodeEdit = (newCode: string) => {
    setOpenscadCode(newCode)
  }

  if (showApiKeyInput) {
    return (
      <div className="api-key-container">
        <div className="api-key-card">
          <h1>🔑 Gemini OpenSCAD Editor</h1>
          <p>Enter your Gemini API key to get started</p>
          <form onSubmit={(e) => {
            e.preventDefault()
            const input = e.currentTarget.elements.namedItem('apiKey') as HTMLInputElement
            handleApiKeySubmit(input.value)
          }}>
            <input
              type="password"
              name="apiKey"
              placeholder="Enter your Gemini API key"
              required
            />
            <button type="submit">Start</button>
          </form>
          <small style={{ display: 'block', marginTop: '0.5rem', color: '#888' }}>
            🔒 Your API key will be saved locally in your browser
          </small>
          <small>
            Get your API key from{' '}
            <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
              Google AI Studio
            </a>
          </small>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🤖 Gemini OpenSCAD Editor</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="reset-btn" onClick={() => {
            setMessages([])
            setOpenscadCode('')
          }}>
            Reset Chat
          </button>
          <button className="reset-btn" onClick={() => {
            localStorage.removeItem('gemini_api_key')
            setShowApiKeyInput(true)
            geminiServiceRef.current = null
            setMessages([])
            setOpenscadCode('')
          }}>
            Change API Key
          </button>
        </div>
      </header>
      
      <div className="main-content">
        <div className="left-panel">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
        
        <div className="right-panel">
          <div className="code-section">
            <h3>OpenSCAD Code</h3>
            <CodeEditor
              code={openscadCode}
              onChange={handleCodeEdit}
            />
          </div>
          
          <div className="preview-section">
            <h3>3D Preview</h3>
            <OpenSCADRenderer code={openscadCode} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
