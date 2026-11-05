import React, { useState } from 'react';
import { getDriverColor } from './utils/driver-colors.js';
import { seconds } from './utils/track-model.js';
import './TrackMap.css';

const TrackMap = ({ model, direction, selectedDriver, onDriverSelect, pitLoss, onPitLossChange, minStint = 6, onMinStintChange }) => {
    const [pitLossInput, setPitLossInput] = useState(null);
    const [minStintInput, setMinStintInput] = useState(null);
    const { points, forecast, enabled, connected } = model;
    const candidate = forecast?.candidate;
    const selected = points.find(point => point.id === selectedDriver?.driver.id);
    const wait = forecast?.waits.get(selected?.id);
    const showWait = Number.isFinite(wait) && Math.round(wait / 1000) > 0;
    const status = !connected ? 'Нет связи'
        : !forecast ? null
        : forecast.status !== 'scenario' ? `В пите #${candidate.driver.number}`
        : `Прогноз по #${candidate.driver.number}`;
    const pitSeconds = connected && Number.isFinite(forecast?.pitElapsed) ? Math.floor(forecast.pitElapsed / 1000) : null;
    const unknown = points.filter(point => point.progress === null);
    return (
        <section className="track-map" aria-label="Схема трека">
            <div className="track-map__circuit">
                <svg viewBox="0 0 360 220" aria-hidden="true">
                    <ellipse cx="180" cy="105" rx="141" ry="71" className="track-map__road" />
                    <path d="M180 162 v28" className="track-map__finish" />
                    <text x="180" y="214" textAnchor="middle" className="track-map__caption">СТАРТ / ФИНИШ</text>
                </svg>
                <svg className="track-map__center" viewBox="0 0 360 220">
                    {status && <text x="180" y="115" textAnchor="middle" className="track-map__status">{status}</text>}
                    {pitSeconds !== null && <text x="180" y="137" textAnchor="middle" className="track-map__pit-timer" aria-label="Примерное время на пите">≈{Math.floor(pitSeconds / 60)}:{String(pitSeconds % 60).padStart(2, '0')}</text>}
                    {!connected && <text x="180" y="137" textAnchor="middle" className="track-map__caption">прогноз приостановлен</text>}
                </svg>
                {points.filter(point => point.progress !== null).map(point => {
                    const angle = Math.PI / 2 + (direction === 2 ? -1 : 1) * point.progress * 2 * Math.PI;
                    const isCandidate = candidate?.id === point.id;
                    const isSelected = selected?.id === point.id;
                    return <button key={point.id} type="button"
                        className={`track-map__point ${isCandidate ? 'track-map__point--candidate' : ''} ${isCandidate && forecast.status !== 'scenario' ? 'track-map__point--pit' : ''} ${isSelected ? 'track-map__point--selected' : ''} ${point.progress === 1 ? 'track-map__point--waiting' : ''}`}
                        style={{ left: `${(180 + 141 * Math.cos(angle)) / 360 * 100}%`, top: `${(105 + 71 * Math.sin(angle)) / 220 * 100}%`, '--driver-color': getDriverColor(point.driver.driver.name).rgb }}
                        title={`${point.driver.driver.name}${isCandidate ? ' · кандидат прогноза' : ''}${point.progress === 1 ? ' · ждём отсечку' : ''}`}
                        aria-label={`№${point.driver.number} ${point.driver.driver.name}${isCandidate ? ', кандидат прогноза' : ''}`}
                        aria-pressed={isSelected} onClick={() => onDriverSelect(point.driver)}><span>{point.driver.number}</span></button>;
                })}
            </div>
            {enabled && <div className="track-map__settings"><label className="track-map__setting">Потеря на пите
                <span><input aria-label="Потеря на питстопе, секунд" type="number" min="1" max="180" step="1" value={pitLossInput ?? pitLoss}
                    onChange={event => {
                        setPitLossInput(event.target.value);
                        const value = Number(event.target.value);
                        if (value >= 1 && value <= 180) onPitLossChange(value);
                    }}
                    onBlur={() => setPitLossInput(null)} /> с</span>
            </label>
            <label className="track-map__setting">Минимум на стинт
                <span><input aria-label="Минимум на стинт, кругов" type="number" min="1" step="1" value={minStintInput ?? minStint}
                    onChange={event => {
                        setMinStintInput(event.target.value);
                        const value = Number(event.target.value);
                        if (Number.isInteger(value) && value >= 1) onMinStintChange(value);
                    }}
                    onBlur={() => setMinStintInput(null)} /> кр.</span>
            </label></div>}
            {selected && <div className="track-map__detail">
                    <div className="track-map__driver"><strong>№{selected.driver.number} {selected.driver.driver.name}</strong></div>
                    <div className="track-map__readings">
                        {connected && selected.progress !== null ? <>
                            <span>{selected.progress === 1 ? 'Ждём отсечку' : `${enabled ? 'До пита' : 'До линии'} ${seconds(selected.eta)}`}</span>
                            {enabled && <strong className={`track-map__waiting ${wait > 0 ? 'track-map__wait' : ''}`} style={{ visibility: showWait ? 'visible' : 'hidden' }} aria-hidden={!showWait}>Ожидание <span>{seconds(wait)}</span></strong>}
                            {selected.provisional && <small>Темп уточняется</small>}
                        </> : <span>{connected ? 'Положение пока неизвестно' : 'Нет связи'}</span>}
                    </div>
            </div>}
            {unknown.length > 0 && <p className="track-map__unknown">Нет положения: {unknown.map(p => `№${p.driver.number}`).join(', ')}</p>}
        </section>
    );
};

export default TrackMap;
