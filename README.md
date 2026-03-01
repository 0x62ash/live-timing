# Live Timing for Karting

Навайбкодено 🦥  
Времени на развитие почти нету, так что велкам с PR.  
Протокол вебсокета сабджект то чендж.


## Mock WebSocket Server

Для тестирования с демонстрационными данными:

```bash
npm run mock-server -- --delay 50   # Start mock server (50ms delay)
npm run dev                         # Start app in another terminal
```

Откройте `http://localhost:5173/live?dev=1` для просмотра.
