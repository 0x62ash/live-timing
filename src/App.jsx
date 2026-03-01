import React, { useEffect, useState } from 'react';
import RaceTable from './RaceTable.jsx';
import LapSidebar from './LapSidebar.jsx';
import Footer from './Footer.jsx';
import './App.css';

const App = () => {
    const [raceData, setRaceData] = useState({ id: 0, name: '', elapsed: 0, drivers: [] });
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [lastServerUpdate, setLastServerUpdate] = useState(Date.now());

  useEffect(() => {
    const dev = (new URLSearchParams(window.location.search)).get('dev');
    const ws = !!dev
      ? new WebSocket('ws://' + window.location.hostname + ':9001')
      : new WebSocket('wss://' + window.location.hostname + '/ws');

    ws.onopen = () => {
      console.log('WebSocket соединение установлено');
      // Отправляем сообщение при открытии соединения
      if (!!dev) {
        ws.send(dev);
      } else {
        const match = window.location.href.match(/\/tracks\/(.*)\/live/);
        const trackName = match ? match[1] : '';
        ws.send('listen track:' + trackName);
      }
    };

    ws.onmessage = (event) => {
      setLastServerUpdate(Date.now());
      const data = JSON.parse(event.data);
      setRaceData((prevData) => {
        // Если изменился id заезда - сбрасываем все старые данные
        if (data.id !== prevData.id && prevData.id !== 0) {
          console.log('Начался новый заезд (id:', data.id, '), сброс данных');
          return { 
            id: data.id, 
            name: data.name, 
            mode: data.mode, 
            elapsed: data.elapsed || 0, 
            drivers: [] 
          };
        }

        // Объединяем старых драйверов с новыми обновлениями
        const driversMap = new Map(
          prevData.drivers.map(d => [d.driver.id, d])
        );
        
        data.drivers.forEach(newDriver => {
          const existingDriver = driversMap.get(newDriver.driver.id);
          if (existingDriver) {
            // Обновляем существующего драйвера
            const updatedLaps = [...existingDriver.laps];
            newDriver.laps?.forEach(newLap => {
              if (!updatedLaps.some(lap => lap.number === newLap.number)) {
                updatedLaps.push(newLap);
              }
            });
            const updatedStint = newDriver.stint || existingDriver.stint;
            driversMap.set(newDriver.driver.id, { 
              ...newDriver, 
              laps: updatedLaps, 
              stint: updatedStint 
            });
          } else {
            // Добавляем нового драйвера
            driversMap.set(newDriver.driver.id, newDriver);
          }
        });

        setSelectedDriver((prevSelected) => {
          if (prevSelected) {
            const updatedSelectedDriver = driversMap.get(prevSelected.driver.id);
            return updatedSelectedDriver ? updatedSelectedDriver : prevSelected;
          }
          return null;
        });

        // Сервер не всегда может сообщать время, тогда пологаемся на свой таймер
        if (!data.elapsed) {
          data.elapsed = prevData.elapsed;
        }

        return { 
          ...prevData, 
          id: data.id, 
          name: data.name, 
          mode: data.mode, 
          elapsed: data.elapsed, 
          drivers: Array.from(driversMap.values()) 
        };
      });
    };

    ws.onclose = () => console.log('WebSocket закрыт');
    ws.onerror = (error) => console.error('WebSocket ошибка', error);

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setRaceData((prevData) => {
        if (Date.now() - lastServerUpdate > 1000) {
          return { ...prevData, elapsed: prevData.elapsed + 1000 };
        }
        return prevData;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastServerUpdate]);

  const formatElapsedTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className="app-container">
      <header className="race-header">
        <h1>{raceData.name}</h1>
        <span className="elapsed-time">{formatElapsedTime(raceData.elapsed)}</span>
      </header>
      <div className="main-content">
        <RaceTable 
          heatMode={raceData.mode} 
          drivers={raceData.drivers} 
          onDriverSelect={setSelectedDriver}
          selectedDriver={selectedDriver}
        />
        {selectedDriver && <LapSidebar driver={selectedDriver} onClose={() => setSelectedDriver(null)} />}
      </div>
      <Footer />
    </div>
  );
};

export default App;

