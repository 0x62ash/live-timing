import React from 'react';
import './LapSidebar.css';
import { getDriverColor } from './utils/driver-colors';

const LapSidebar = ({ driver, onClose }) => {
  const driverColor = getDriverColor(driver.driver.name);
  const sortedLaps = driver.laps ? [...driver.laps].sort((a, b) => b.number - a.number) : [];

  const groupedLaps = sortedLaps.reduce((groups, lap) => {
    const stintNum = lap.stintNum ?? 0;
    if (!groups[stintNum]) groups[stintNum] = [];
    groups[stintNum].push(lap);
    return groups;
  }, {});

  const stintEntries = Object.entries(groupedLaps)
    .map(([stintNum, laps]) => {
      const stintData = driver.stint || {};
      return {
        stintNum: parseInt(stintNum),
        laps,
        bestTime: stintData.bestTime ?? 0,
        avgTime: stintData.avgTime ?? 0
      };
    })
    .sort((a, b) => b.stintNum - a.stintNum);

  return (
    <div className="lap-sidebar">
      <button className="close-button" onClick={onClose}>×</button>
      <h2 className="driver-name" style={{ '--driver-color': driverColor.rgb }}>{driver.driver.name}</h2>
      {stintEntries.length === 0 ? (
        <p>Нет данных о кругах</p>
      ) : (
        stintEntries.map(({ stintNum, laps, bestTime, avgTime }) => (
          <div key={stintNum} className="stint-group">
            <div className="stint-header">
              <span className="stint-number">
                {stintNum}
                <span className="stint-stats">
                  Best: {(bestTime / 1000).toFixed(3)}s<br />
                  Avg: {(avgTime / 1000).toFixed(3)}s
                </span>
              </span>
            </div>
            <ul className="stint-laps">
              {laps.length === 0 ? (
                <li>Нет данных о кругах</li>
              ) : (
                laps.map(lap => (
                  <li key={lap.number} className="lap-item">
                    <span className="lap-number">{lap.number}</span>
                    <span className="lap-time">{(lap.time / 1000).toFixed(3)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};

export default LapSidebar;

