import React from 'react';
import './RaceTable.css';
import { getDriverColor } from './utils/driver-colors';

const formatLapTime = (milliseconds) => {
  return milliseconds ? (milliseconds / 1000).toFixed(3) : '';
};

const renderStintAvgTime = (time, bestAvgTime) => {
  if (!time) { return '' }
  const delta = time === bestAvgTime
    ? ''
    : <span className="delta">+{((time - bestAvgTime) / 1000).toFixed(1)}</span>;
  return <span>{formatLapTime(time)}{delta}</span>;
}

const renderLapTime = (driver, bestTime) => {
  if (!driver.laps || driver.laps.length === 0) { return '—' }
  
  const lastLap = driver.laps[driver.laps.length - 1];
  const previousLap = driver.laps[driver.laps.length - 2];

  var className;
  if (previousLap && lastLap.time < previousLap.time) {
    className = 'better';
  } else if (previousLap && lastLap.time > previousLap.time) {
    className = 'worse';
  }

  const isBest = lastLap.time === bestTime;

  return (
    <span>
      <span className={`lapTime ${className} ${isBest ? 'best-lap' : ''}`}>
        {formatLapTime(lastLap.time)}
      </span>
      {renderLapTimePaceDelta(lastLap.time, bestTime)}
    </span>
  );
};

const renderLapTimePaceDelta = (time, bestTime) => {
  if (time === bestTime || !bestTime) { return '' }
  return <span className="delta">+{((time - bestTime) / 1000).toFixed(1)}</span>;
}

const renderGapTime = (driver) => {
  if (!driver.laps || driver.laps.length === 0) { return '—' }
  
  var lastGapTime = driver.laps[driver.laps.length - 1]?.gapTime;
  if (!lastGapTime && driver.laps[driver.laps.length - 2]) {
    lastGapTime = driver.laps[driver.laps.length - 2].gapTime;
  }
  return lastGapTime ? (lastGapTime / 1000).toFixed(1) : '';
}

const StintHeaders = ({ isShowStint }) => {
  if (!isShowStint) return null;
  return (
    <>
      <th className="fit">Стинт</th>
      <th className="fit mobile-hide">Круг</th>
      <th className="fit">Среднее</th>      
      <th className="fit mobile-hide">Карт</th>
      <th className="fit mobile-hide">Лучшее</th>
    </>
  );
};

const StintColumns = ({ isShowStint, driver, currentStintBestAvgTime }) => {
  if (!isShowStint || !driver.stint) return null;
  if (driver.stint.length == 1) {
    return (
      <>
        <td>{driver.stint.number}</td>
        <td colSpan="2" className="mobile-hide" style={{'textAlign': 'center'}}>pit exit</td>
        <td>{driver.stint.length}</td>
      </>
    );
  }
  return (
    <>
      <td>{driver.stint.number}</td>
      <td className="mobile-hide">{driver.stint.length}</td>
      <td>{renderStintAvgTime(driver.stint.avgTime, currentStintBestAvgTime)}</td>      
      <td className="mobile-hide">{driver.stint.kart}</td>
      <td className="mobile-hide">{formatLapTime(driver.stint.bestTime)}</td>
    </>
  );
};

const RaceTable = ({ heatMode, drivers, onDriverSelect, selectedDriver }) => {
  const lastLapTimes = drivers.filter(d => d.laps?.length > 0).map(d => d.laps[d.laps.length - 1].time);
  const currentBestTime = lastLapTimes.length > 0 ? Math.min(...lastLapTimes) : undefined;
  
  const stintAvgTimes = drivers.filter(d => d.stint?.avgTime).map(d => d.stint.avgTime);
  const currentStintBestAvgTime = stintAvgTimes.length > 0 ? Math.min(...stintAvgTimes) : undefined;
  
  const isShowStint = heatMode === 0 && drivers.some(el => el.stint && el.stint.number > 1 );

  const sortedDrivers = [...drivers].sort((a, b) => {
    if (heatMode === 0) {
      const aLapsCount = a.laps?.length > 0 ? Math.max(...a.laps.map(lap => lap.number)) : 0;
      const bLapsCount = b.laps?.length > 0 ? Math.max(...b.laps.map(lap => lap.number)) : 0;
      
      if (bLapsCount !== aLapsCount) return bLapsCount - aLapsCount;
      return a.position - b.position;
    } else {
      if (a.bestTime !== b.bestTime) return (a.bestTime || Infinity) - (b.bestTime || Infinity);
      return a.position - b.position;
    }
  });

  return (
    <table className="race-table">
      <thead>
        <tr>
          <th className="fit">P</th>
          <th className="fit">#</th>
          <th className="dname">Имя&nbsp;пилота</th>
          <th className="fit">Круг</th>          
          <th className="fit">Время</th>
          { heatMode === 1 &&
          <th className="fit">Лучшее</th>
          }
           { heatMode === 0 &&
           <th className="fit">Разрыв</th> }
           <StintHeaders isShowStint={isShowStint} />
         </tr>
      </thead>
      <tbody>
        {sortedDrivers.map((driver, index) => {
          const driverColor = getDriverColor(driver.driver.name);
          return (
          <tr 
            key={driver.driver.id} 
            onClick={() => onDriverSelect(driver)}
            className={`driver-row ${selectedDriver?.driver.id === driver.driver.id ? 'selected' : ''} position-${index + 1}`}
            style={{ '--driver-color': driverColor.rgb }}
          >
            <td>{driver.position}</td>
            <td>{driver.number}</td>
            <td>{driver.driver.name}</td>
            <td>{driver.laps?.length > 0 ? driver.laps[driver.laps.length - 1].number : '—'}</td>
            <td>{driver.laps?.length > 0 ? renderLapTime(driver, currentBestTime) : '—'}</td>
            { heatMode === 1 &&
            <td>{driver.laps?.length > 0 ? formatLapTime(driver.bestTime) : '—'}</td> }
            { heatMode === 0 &&
            <td>{driver.laps?.length > 0 ? renderGapTime(driver) : '—'}</td> }
            <StintColumns 
              isShowStint={isShowStint}
              driver={driver} 
              currentStintBestAvgTime={currentStintBestAvgTime} 
            />
          </tr>
        );
        })}
      </tbody>
    </table>
  );
};

export default RaceTable;