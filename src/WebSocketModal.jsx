import React from 'react';
import './WebSocketModal.css';

const WebSocketModal = ({ wsStatus, reconnectAttempts, timeUntilNextReconnect, reconnectStartTime, maxReconnectTime }) => {
  
  if (wsStatus === 'connected') {
    return null;
  }

  const hasExhaustedReconnectTime = reconnectStartTime && (Date.now() - reconnectStartTime >= maxReconnectTime);

  const getStatusMessage = () => {
    if (hasExhaustedReconnectTime) {
      return 'Соединение не удалось';
    }
    
    switch (wsStatus) {
      case 'disconnected':
        return 'Соединение потеряно';
      case 'error':
        return 'Ошибка соединения';
      case 'connecting':
        return 'Подключение...';
      default:
        return 'Соединение отсутствует';
    }
  };

  const getSubMessage = () => {
    if (hasExhaustedReconnectTime) {
      return null;
    }
    
    if (wsStatus === 'connecting') {
      return 'Пожалуйста, подождите';
    }
    
    if (reconnectAttempts > 0) {
      const minutes = Math.floor(timeUntilNextReconnect / 60000);
      const seconds = Math.floor((timeUntilNextReconnect % 60000) / 1000);
      return `Повторное подключение через ${minutes}:${String(seconds).padStart(2, '0')}`;
    }
    
    return 'Ожидание восстановления соединения...';
  };

  const subMessage = getSubMessage();

  return (
    <div className="ws-modal-overlay">
      <div className={`ws-modal ${hasExhaustedReconnectTime ? 'ws-modal--failed' : ''}`}>
        <div className="ws-modal__icon ws-modal__icon--warning">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="15" />
            <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <h2 className="ws-modal__title">{getStatusMessage()}</h2>
        {subMessage && <p className="ws-modal__subtitle">{subMessage}</p>}
      </div>
    </div>
  );
};

export default WebSocketModal;
