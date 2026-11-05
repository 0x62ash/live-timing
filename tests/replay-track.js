// Replay recorded crossings on their original timeline. Only track/direction are
// supplied for the Premium UX scenario; the fixture itself is not a Premium heat.
import fs from 'node:fs';
import { WebSocketServer } from 'ws';

const frames = fs.readFileSync(new URL('./fixtures/gg5a.txt', import.meta.url), 'utf8')
    .trim().split('\n').map(line => JSON.parse(line)).filter(frame => frame.id === 105454);
const startAt = Number(process.env.REPLAY_START || 380000);
const speed = Number(process.env.REPLAY_SPEED || 1);
const wss = new WebSocketServer({ port: 9001, host: '127.0.0.1' });
wss.on('connection', ws => {
    let regular = false;
    ws.on('message', message => { regular = message.toString() === 'replay-regular'; });
    const epoch = Date.now() - startAt;
    let cursor = 0;
    const drivers = new Map();
    const merge = frame => {
        for (const row of frame.drivers || []) {
            const previous = drivers.get(row.driver.id);
            const laps = new Map((previous?.laps || []).map(lap => [lap.number, lap]));
            for (const lap of row.laps || []) if (!laps.has(lap.number)) laps.set(lap.number, { ...lap, receivedAt: epoch + frame.elapsed });
            drivers.set(row.driver.id, { ...previous, ...row, laps: [...laps.values()] });
        }
    };
    while (cursor < frames.length && frames[cursor].elapsed <= startAt) merge(frames[cursor++]);
    const started = Date.now();
    const send = elapsed => ws.send(JSON.stringify({ id: 105454, name: regular ? 'Демо без прогноза · Гонщик Года 5А' : 'Демо схемы · запись Гонщик Года 5А', mode: 0,
        track: regular ? 'demo-regular' : 'premium', direction: 1, serverTime: epoch + elapsed, elapsed,
        pitstopTimeThreshold: 50000, drivers: [...drivers.values()] }));
    send(startAt);
    const timer = setInterval(() => {
        const elapsed = startAt + (Date.now() - started) * speed;
        while (cursor < frames.length && frames[cursor].elapsed <= elapsed) merge(frames[cursor++]);
        send(elapsed);
    }, 250);
    ws.on('close', () => clearInterval(timer));
});
console.log('Track replay: ws://localhost:9001; open /live/?dev=replay or /live/?dev=replay-regular (no pit forecast)');
