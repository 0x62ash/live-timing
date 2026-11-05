import { useEffect, useRef, useState } from 'react';
import { chooseCandidate, predictPit, projectDrivers, supportsPitForecast } from '../utils/track-model.js';

const useTrackModel = (raceData, connected, pitLoss, minStint) => {
    const [tick, setTick] = useState(Date.now());
    const candidateRef = useRef(null);
    const heatRef = useRef(null);
    const minStintRef = useRef(minStint);
    useEffect(() => {
        if (!connected) return;
        setTick(Date.now());
        const timer = setInterval(() => setTick(Date.now()), 100);
        return () => clearInterval(timer);
    }, [connected]);
    const now = Number.isFinite(raceData.serverTime) && Number.isFinite(raceData.receivedLocallyAt)
        ? raceData.serverTime + Math.max(0, tick - raceData.receivedLocallyAt) : null;
    const points = projectDrivers(raceData.drivers, now, raceData.pitstopTimeThreshold);
    const enabled = supportsPitForecast(raceData.track, raceData.direction);
    if (heatRef.current !== raceData.id || minStintRef.current !== minStint || !connected) {
        candidateRef.current = null;
        heatRef.current = raceData.id;
        minStintRef.current = minStint;
    }
    if (enabled && connected) candidateRef.current = chooseCandidate(points, candidateRef.current, minStint);
    else candidateRef.current = null;
    const forecast = connected && enabled ? predictPit(points, candidateRef.current, now, pitLoss * 1000, minStint) : null;
    return { points, forecast, enabled, connected };
};

export default useTrackModel;
