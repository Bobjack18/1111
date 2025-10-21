import { GoogleGenerativeAI } from '@google/generative-ai'
import { Message } from '../App'

export interface OpenSCADResponse {
  code: string
  explanation: string
}

export class GeminiService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  }

  async generateOpenSCAD(
    userPrompt: string,
    currentCode: string,
    conversationHistory: Message[]
  ): Promise<OpenSCADResponse> {
    const systemPrompt = `You are an expert OpenSCAD programmer. Your task is to generate or modify OpenSCAD code based on user requests.

IMPORTANT RULES:
1. Always respond with valid OpenSCAD code
2. Include clear comments in the code if needed
3. If modifying existing code, preserve the structure when possible
4. Provide a brief explanation of what you did
5. Format your response as JSON with two fields: "code" and "explanation"
6. The code should be complete and runnable
7. Use proper OpenSCAD syntax and best practices

Example response format:
{
  "code": "// Your OpenSCAD code here\\ncube([10, 10, 10]);",
  "explanation": "Created a 10x10x10 cube"
}
`

    let prompt = systemPrompt + '\n\n'

    // Add conversation history for context
    if (conversationHistory.length > 0) {
      prompt += 'Previous conversation:\n'
      conversationHistory.slice(-4).forEach((msg) => {
        prompt += `${msg.role}: ${msg.content}\n`
        if (msg.code) {
          prompt += `Code: ${msg.code.substring(0, 200)}...\n`
        }
      })
      prompt += '\n'
    }

    if (currentCode) {
      prompt += `Current OpenSCAD code:\n\`\`\`\n${currentCode}\n\`\`\`\n\n`
    }

    prompt += `User request: ${userPrompt}\n\nRespond with JSON containing "code" and "explanation" fields.`

    try {
      const result = await this.model.generateContent(prompt)
      const response = await result.response
      const text = response.text()

      // Try to parse JSON response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          code: parsed.code || '',
          explanation: parsed.explanation || 'Generated OpenSCAD code'
        }
      }

      // Fallback: extract code blocks
      const codeMatch = text.match(/```(?:openscad)?\n?([\s\S]*?)```/)
      if (codeMatch) {
        return {
          code: codeMatch[1].trim(),
          explanation: text.replace(/```[\s\S]*?```/g, '').trim() || 'Generated OpenSCAD code'
        }
      }

      // Last resort: treat entire response as code
      return {
        code: text,
        explanation: 'Generated OpenSCAD code'
      }
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}
