import { describe, it, expect } from 'vitest';
import { projectDrivers, chooseCandidate, predictPit, supportsPitForecast } from './track-model.js';

const driver = (id, receivedAt, times = [30000, 31000, 32000]) => ({
    driver: { id, name: `Driver ${id}` }, number: id,
    laps: times.map((time, index) => ({ number: index + 1, time, stintNum: 1, receivedAt })),
});

describe('track projection', () => {
    it('averages the last three clean laps and holds at the line without inventing crossings', () => {
        const [point] = projectDrivers([driver(1, 100000, [29000, 30000, 31000, 62000, 32000])], 150000);
        expect(point.pace).toBe(31000);
        expect(point.progress).toBe(1);
        expect(point.eta).toBe(0);
    });
    it('does not place a driver without a crossing timestamp', () => {
        expect(projectDrivers([driver(1, undefined)], 100000)[0].progress).toBeNull();
        expect(projectDrivers([driver(1, 100000)], null)[0].progress).toBeNull();
    });
    it('uses the new stint pace and marks a short sample provisional', () => {
        const d = driver(1, 100000);
        d.laps.push({ number: 4, time: 62000, stintNum: 2, receivedAt: 100000 });
        expect(projectDrivers([d], 101000)[0]).toMatchObject({ pace: 31000, provisional: true });
        d.laps.push({ number: 5, time: 34000, stintNum: 2, receivedAt: 134000 });
        expect(projectDrivers([d], 135000)[0].pace).toBe(34000);
    });
    it('enables the forecast only for Premium standard', () => {
        expect(supportsPitForecast('premium', 1)).toBe(true);
        for (const [track, direction] of [['premium', 2], ['premium', null], ['drive', 1]]) {
            expect(supportsPitForecast(track, direction)).toBe(false);
        }
    });
});

describe('pit scenario lifecycle', () => {
    const drivers = [driver(7, 74000), driver(12, 81000)];
    it('allows a pit only after six completed laps and excludes shorter current stints from candidates and waits', () => {
        const short = { ...driver(7, 74000), stint: { length: 5 } };
        const eligible = { ...driver(12, 81000), stint: { length: 6 } };
        const points = projectDrivers([short, eligible], 100000);
        const previous = chooseCandidate(points, null);
        expect(previous.id).toBe(7);
        const candidate = chooseCandidate(points, previous, 6);
        expect(candidate.id).toBe(12);
        expect(predictPit(points, candidate, 100000, 25000, 6).waits.get(7)).toBeNull();
        expect(chooseCandidate(points, candidate, 7)).toBeNull();
    });
    it('counts only the current stint when the stint summary is absent', () => {
        const d = driver(7, 74000, [30000, 30000, 30000, 30000, 30000, 30000]);
        d.laps.push({ number: 7, time: 62000, stintNum: 2, receivedAt: 136000 });
        const points = projectDrivers([d], 140000);
        expect(points[0].stintLaps).toBe(1);
        expect(chooseCandidate(points, null, 6)).toBeNull();
    });
    it('predicts 18 seconds of waiting for arrival 7 seconds after the candidate', () => {
        const points = projectDrivers(drivers, 100000);
        const candidate = chooseCandidate(points, null);
        const forecast = predictPit(points, candidate, 100000, 25000);
        expect(candidate.id).toBe(7);
        expect(forecast.status).toBe('scenario');
        expect(forecast.waits.get(7)).toBe(0);
        expect(forecast.waits.get(12)).toBe(18000);
    });
    it('retains the candidate at the line and does not restart the 25 second window', () => {
        const points = projectDrivers(drivers, 100000);
        const candidate = chooseCandidate(points, null);
        const forecast = predictPit(projectDrivers(drivers, 109000), candidate, 109000, 25000);
        expect(forecast.status).toBe('pit');
        expect(forecast.releaseAt).toBe(130000);
        expect(chooseCandidate([...points].reverse(), candidate)).toEqual(candidate);
    });
    it('switches to the next pilot after an actual crossing', () => {
        const candidate = chooseCandidate(projectDrivers(drivers, 100000), null);
        const crossed = driver(7, 105000, [30000, 31000, 32000, 31000]);
        expect(chooseCandidate(projectDrivers([crossed, drivers[1]], 105000), candidate).id).toBe(12);
    });
    it('does not declare the pit free just because the predicted time expired', () => {
        const points = projectDrivers(drivers, 131000);
        const candidate = chooseCandidate(points, null);
        expect(predictPit(points, candidate, 131000, 25000)).toMatchObject({ status: 'unknown' });
        expect(predictPit(points, candidate, 131000, 25000).waits.get(12)).toBeNull();
    });
});
