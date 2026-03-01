import WebSocket, { WebSocketServer } from 'ws'
import fs from 'fs'
import path from 'path'

// Опции по умолчанию
const DEFAULT_PORT = 9001
const DEFAULT_DELAY = 500  // 1 секунда
const DEFAULT_FILE = './tests/fixtures/gg5a.txt'

// Парсинг аргументов командной строки
const args = process.argv.slice(2)
const options = {
  port: DEFAULT_PORT,
  delay: DEFAULT_DELAY,
  file: DEFAULT_FILE
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--port' || arg === '-p') {
    options.port = parseInt(args[++i])
  } else if (arg === '--delay' || arg === '-d') {
    options.delay = parseInt(args[++i])
  } else if (arg === '--file' || arg === '-f') {
    options.file = args[++i]
  }
}

// Читаем тестовые данные
const messages = fs.readFileSync(path.resolve(options.file), 'utf-8')
  .split('\n')
  .filter(line => line.trim())

if (messages.length === 0) {
  console.error('❌ Ошибка: файл не содержит сообщений')
  process.exit(1)
}

console.log(`📦 Загружено ${messages.length} сообщений из ${options.file}`)

const wss = new WebSocketServer({ port: options.port })

wss.on('connection', (ws) => {
  console.log('✅ Клиент подключился')
  
  let index = 0
  let sendInterval = null
  let lastSentMessage = null
  
  const startSending = () => {
    if (sendInterval) return
    
    sendInterval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearInterval(sendInterval)
        sendInterval = null
        return
      }
      
      if (index >= messages.length) {
        console.log('🔄 Конец цикла, начинаем сначала...')
        index = 0
      }
      
      lastSentMessage = messages[index]
      ws.send(lastSentMessage)
      console.log(`📤 Отправлено сообщение ${index + 1}/${messages.length}`)
      index++
    }, options.delay)
  }
  
  ws.on('message', (data) => {
    const message = data.toString()
    console.log('📩 Получено от клиента:', message.substring(0, 50) + '...')
    
    // При первом сообщении запускаем отправку
    if (!sendInterval) {
      startSending()
    }
  })
  
  ws.on('close', () => {
    if (sendInterval) {
      clearInterval(sendInterval)
      sendInterval = null
    }
    console.log('❌ Клиент отключился')
    if (lastSentMessage) {
      console.log('📨 Последнее отправленное сообщение:')
      console.log(lastSentMessage)
    }
  })
  
  ws.on('error', (error) => {
    console.error('⚠️ Ошибка WebSocket:', error.message)
  })
})

wss.on('error', (error) => {
  console.error('⚠️ Ошибка сервера:', error.message)
})

console.log(`🚀 WebSocket сервер запущен на ws://localhost:${options.port}`)
console.log(`⏱️  Задержка: ${options.delay}ms`)

// Обработка graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Закрытие сервера...')
  
  wss.clients.forEach((client) => {
    client.close()
  })
  
  wss.close(() => {
    console.log('✅ Сервер закрыт')
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)