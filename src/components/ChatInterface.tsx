import { useState, useRef, useEffect } from 'react'
import { Message } from '../App'
import './ChatInterface.css'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>👋 Welcome!</h2>
            <p>Ask me to create or modify OpenSCAD designs</p>
            <div className="example-prompts">
              <button onClick={() => onSendMessage('Create a simple cube')}>
                Create a simple cube
              </button>
              <button onClick={() => onSendMessage('Make a sphere on top of a cylinder')}>
                Sphere on cylinder
              </button>
              <button onClick={() => onSendMessage('Create a gear with 20 teeth')}>
                Create a gear
              </button>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-header">
              {msg.role === 'user' ? '👤 You' : '🤖 Gemini'}
            </div>
            <div className="message-content">
              {msg.content}
            </div>
            {msg.code && (
              <div className="code-preview">
                <pre>{msg.code.substring(0, 150)}{msg.code.length > 150 ? '...' : ''}</pre>
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-header">🤖 Gemini</div>
            <div className="message-content loading">
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe what you want to create or modify..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
