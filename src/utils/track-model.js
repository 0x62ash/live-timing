// All times are milliseconds on the server clock. A missing timestamp stays unknown.
export const supportsPitForecast = (track, direction) => track === 'premium' && direction === 1;

export const projectDrivers = (drivers, now, threshold = 50000) => drivers.map(driver => {
    const laps = [...(driver.laps || [])].sort((a, b) => a.number - b.number);
    const last = laps.at(-1);
    const normal = laps.filter(lap => lap.time > 0 && lap.time <= threshold);
    const current = normal.filter(lap => lap.stintNum === last?.stintNum);
    const sample = (current.length ? current : normal).slice(-3);
    const pace = sample.length ? sample.reduce((sum, lap) => sum + lap.time, 0) / sample.length : null;
    const crossedAt = last?.receivedAt;
    const known = pace !== null && Number.isFinite(crossedAt) && Number.isFinite(now);
    const expectedAt = known ? crossedAt + pace : null;
    return {
        driver, id: driver.driver.id, lapNumber: last?.number, pace, expectedAt,
        stintLaps: driver.stint?.length ?? laps.filter(lap => lap.stintNum === last?.stintNum).length,
        progress: known ? Math.max(0, Math.min(1, (now - crossedAt) / pace)) : null,
        eta: known ? Math.max(0, expectedAt - now) : null,
        overdue: known ? Math.max(0, now - expectedAt) : null,
        provisional: sample.length < 3 || !current.length,
    };
});

// Keep the candidate until a real crossing, not until the animated point reaches the line.
export const chooseCandidate = (points, previous, minStint = 0) => {
    const eligible = points.filter(p => p.expectedAt !== null && p.stintLaps >= minStint);
    const retained = previous && eligible.find(p => p.id === previous.id && p.lapNumber === previous.lapNumber && p.expectedAt !== null);
    if (retained) return previous;
    const next = eligible.sort((a, b) => a.expectedAt - b.expectedAt || a.id - b.id)[0];
    return next ? { id: next.id, lapNumber: next.lapNumber, expectedAt: next.expectedAt } : null;
};

export const predictPit = (points, candidate, now, loss, minStint = 0) => {
    if (!candidate) return null;
    const point = points.find(p => p.id === candidate.id && p.lapNumber === candidate.lapNumber);
    if (!point) return null;
    const overdue = now - candidate.expectedAt;
    const status = overdue > 3000 ? (overdue >= loss ? 'unknown' : 'pit') : 'scenario';
    const releaseAt = candidate.expectedAt + loss;
    const waits = new Map(points.map(p => [p.id,
        p.eta === null || p.stintLaps < minStint || status === 'unknown' ? null
            : p.id === candidate.id ? 0 : Math.max(0, releaseAt - Math.max(now, p.expectedAt)),
    ]));
    return { candidate: point, status, releaseAt, waits, pitElapsed: status === 'scenario' ? null : overdue };
};

export const seconds = value => value === null || !Number.isFinite(value) ? '—' : `≈${Math.round(value / 1000)} с`;
