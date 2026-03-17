import React, { useEffect, useState, useRef, useCallback } from 'react';
import RaceTable from './RaceTable.jsx';
import LapSidebar from './LapSidebar.jsx';
import Footer from './Footer.jsx';
import WebSocketModal from './WebSocketModal.jsx';
import './App.css';

const App = () => {
    const [raceData, setRaceData] = useState({ id: 0, name: '', elapsed: 0, drivers: [], pitlaneKarts: [] });
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [lastServerUpdate, setLastServerUpdate] = useState(Date.now());
    const [wsStatus, setWsStatus] = useState('disconnected');
    const [reconnectAttempts, setReconnectAttempts] = useState(0);
    const [timeUntilNextReconnect, setTimeUntilNextReconnect] = useState(0);
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const isReconnectingRef = useRef(false);
    const reconnectStartTimeRef = useRef(null);
    const maxReconnectTime = 600 * 1000;

  const connectWebSocket = useCallback(() => {
    const dev = (new URLSearchParams(window.location.search)).get('dev');
    const ws = !!dev
      ? new WebSocket('ws://' + window.location.hostname + ':9001')
      : new WebSocket('wss://' + window.location.hostname + '/ws');
    
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket соединение установлено');
      setWsStatus('connected');
      setReconnectAttempts(0);
      setTimeUntilNextReconnect(0);
      
      // Если это реконнект - сбрасываем состояние гонки
      if (isReconnectingRef.current) {
        console.log('Реконнект успешен, сброс данных гонки');
        setRaceData({ id: 0, name: '', elapsed: 0, drivers: [] });
        setSelectedDriver(null);
      }
      
      reconnectAttemptsRef.current = 0;
      reconnectStartTimeRef.current = null;
      isReconnectingRef.current = false;
      
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
        // Если изменился id заезда или prevData.id === 0 (после реконнекта) - сбрасываем данные
        if (data.id !== prevData.id) {
          console.log('Получены данные нового заезда (id:', data.id, '), сброс данных');
          return { 
            id: data.id, 
            name: data.name, 
            mode: data.mode, 
            elapsed: data.elapsed || 0, 
            drivers: data.drivers || [],
            pitlaneKarts: data.pitlane_karts || []
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
          drivers: Array.from(driversMap.values()),
          pitlaneKarts: data.pitlane_karts || prevData.pitlaneKarts
        };
      });
    };

    ws.onclose = () => {
      console.log('WebSocket закрыт');
      setWsStatus('disconnected');
      
      const reconnectDelays = [2000, 5000, 10000, 15000, 20000, 30000];
      const jitterFactor = 0.1;
      
      if (reconnectAttemptsRef.current === 0) {
        reconnectStartTimeRef.current = Date.now();
      }
      
      const elapsedReconnectTime = Date.now() - reconnectStartTimeRef.current;
      if (elapsedReconnectTime >= maxReconnectTime) {
        console.log('Максимум времени переподключения исчерпан');
        return;
      }
      
      const delayIndex = Math.min(reconnectAttemptsRef.current, reconnectDelays.length - 1);
      let baseDelay = reconnectDelays[delayIndex];
      
      const jitter = 1 - jitterFactor + Math.random() * (2 * jitterFactor);
      const delay = Math.round(baseDelay * jitter);
      
      isReconnectingRef.current = true;
      
      setTimeUntilNextReconnect(delay);
      setReconnectAttempts(reconnectAttemptsRef.current + 1);
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        console.log(`Попытка переподключения ${reconnectAttemptsRef.current} (задержка: ${delay}мс)`);
        connectWebSocket();
      }, delay);
    };

    ws.onerror = (error) => {
      console.error('WebSocket ошибка', error);
      setWsStatus('error');
    };
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRaceData((prevData) => {
        if (Date.now() - lastServerUpdate > 1000) {
          return { ...prevData, elapsed: prevData.elapsed + 1000 };
        }
        return prevData;
      });

      if (timeUntilNextReconnect > 0 && wsStatus !== 'connected') {
        setTimeUntilNextReconnect((prev) => Math.max(0, prev - 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastServerUpdate, timeUntilNextReconnect, wsStatus]);

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
      <WebSocketModal 
        wsStatus={wsStatus}
        reconnectAttempts={reconnectAttempts}
        timeUntilNextReconnect={timeUntilNextReconnect}
        reconnectStartTime={reconnectStartTimeRef.current}
        maxReconnectTime={maxReconnectTime}
      />
      <header className="race-header">
        <h1>{raceData.name}</h1>
        <div className="header-right">
          <span className="elapsed-time">{formatElapsedTime(raceData.elapsed)}</span>
          <span 
            className={`ws-status ws-status--${wsStatus}`} 
            title={wsStatus}
          />
        </div>
      </header>
      <div className="main-content">
        <RaceTable 
          heatMode={raceData.mode} 
          drivers={raceData.drivers} 
          pitlaneKarts={raceData.pitlaneKarts}
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

