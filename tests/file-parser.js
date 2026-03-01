import fs from 'fs'
import path from 'path'
import { FileWebSocket } from '../src/test/setup.js'

export async function parseMessageFile(filePath) {
  const absolutePath = path.resolve(filePath)
  
  try {
    const content = fs.readFileSync(absolutePath, 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())
    
    return lines.map((line, index) => ({
      index: index + 1,
      raw: line,
      data: JSON.parse(line)
    }))
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error.message}`)
  }
}

export async function setupWebSocketTest(filePath) {
  const messages = await parseMessageFile(filePath)
  FileWebSocket.setPendingMessages(messages.map(m => m.raw))
  return messages
}

export function getMessageByNumber(messages, number) {
  return messages.find(msg => msg.index === number)
}

export function filterMessages(messages, predicate) {
  return messages.filter(predicate)
}