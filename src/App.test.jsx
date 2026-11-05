import React from 'react';
import { act, render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

class Socket {
    static instances = [];
    constructor() { Socket.instances.push(this); }
    send() {}
    close() {}
    frame(data) { this.onmessage({ data: JSON.stringify(data) }); }
}
const driver = (id, receivedAt, number = 3) => ({
    driver: { id, name: `Pilot ${id}` }, number: id, position: id, stint: { number: 1, length: 6 },
    laps: [1, 2, number].map((n, index) => ({ number: n, time: 30000, receivedAt: receivedAt - (2 - index) * 30000, stintNum: 1 })),
});
const frame = (overrides = {}) => ({ id: 1, name: 'Test heat', track: 'premium', direction: 1,
    serverTime: 100000, elapsed: 100000, drivers: [driver(7, 75000), driver(12, 82000)], ...overrides });

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1000000); vi.stubGlobal('WebSocket', Socket); Socket.instances = []; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('live track integration', () => {
    it('does not rewind elapsed time for delayed frames, but resets it for a new heat', () => {
        const { container } = render(<App />);
        const ws = Socket.instances[0];
        const timer = () => container.querySelector('.elapsed-time');
        act(() => { ws.onopen(); ws.frame(frame()); });
        expect(timer()).toHaveTextContent('1:40');
        act(() => vi.advanceTimersByTime(1000));
        act(() => vi.advanceTimersByTime(1000));
        expect(timer()).toHaveTextContent('1:41');
        act(() => ws.frame(frame({ elapsed: 100500 })));
        expect(timer()).toHaveTextContent('1:41');
        act(() => ws.frame(frame({ elapsed: 104000 })));
        expect(timer()).toHaveTextContent('1:44');
        act(() => ws.frame(frame({ elapsed: undefined })));
        expect(timer()).toHaveTextContent('1:44');
        act(() => ws.frame(frame({ id: 2, elapsed: 1000 })));
        expect(timer()).toHaveTextContent('0:01');
    });
    it('uses server time, advances between updates, switches candidates and keeps selection independent', () => {
        render(<App />);
        const ws = Socket.instances[0];
        act(() => { ws.onopen(); ws.frame(frame()); });
        expect(screen.getByText('Прогноз по #7')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Pilot 12' }));
        expect(screen.getByRole('button', { name: 'Pilot 12' })).toHaveAttribute('aria-pressed', 'true');
        expect(within(screen.getByRole('region', { name: 'Схема трека' })).getByText('До пита ≈12 с')).toBeVisible();
        act(() => vi.advanceTimersByTime(4000));
        expect(within(screen.getByRole('region', { name: 'Схема трека' })).getByText('До пита ≈8 с')).toBeVisible();
        // A batch may arrive well after its crossings; serverTime must be refreshed.
        act(() => ws.frame(frame({ serverTime: 106000, drivers: [driver(7, 105000, 4)] })));
        expect(screen.getByText('Прогноз по #12')).toBeVisible();
        for (const value of screen.getAllByText('≈0 с', { selector: '.driver-forecast__wait-value, .track-map__waiting span' })) {
            expect(value).not.toBeVisible();
        }
        expect(within(screen.getByRole('region', { name: 'Схема трека' })).getByText('До пита ≈6 с')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Pilot 12' })).toHaveAttribute('aria-pressed', 'true');
        act(() => ws.frame(frame({ serverTime: 106000, drivers: [driver(7, 105000, 4)] })));
        expect(screen.getByText('Прогноз по #12')).toBeVisible();
        act(() => ws.onclose());
        expect(screen.getByText(/прогноз приостановлен/)).toBeInTheDocument();
        for (const value of screen.getAllByText('—', { selector: '.driver-forecast__wait-value' })) {
            expect(value).not.toBeVisible();
        }
    });
    it('counts pit time from the missed crossing and clears the timer after an actual crossing', () => {
        render(<App />);
        const ws = Socket.instances[0];
        act(() => { ws.onopen(); ws.frame(frame()); });
        expect(screen.queryByLabelText('Примерное время на пите')).not.toBeInTheDocument();
        act(() => vi.advanceTimersByTime(9000));
        expect(screen.getByLabelText('Примерное время на пите')).toHaveTextContent('≈0:04');
        act(() => vi.advanceTimersByTime(2000));
        expect(screen.getByLabelText('Примерное время на пите')).toHaveTextContent('≈0:06');
        act(() => vi.advanceTimersByTime(20000));
        expect(screen.getByText('В пите #7')).toBeVisible();
        expect(screen.getByLabelText('Примерное время на пите')).toHaveTextContent('≈0:26');
        act(() => ws.frame(frame({ serverTime: 131000, drivers: [driver(7, 130000, 4), driver(12, 130000, 4)] })));
        expect(screen.queryByLabelText('Примерное время на пите')).not.toBeInTheDocument();
    });
    it('defaults to six laps and recalculates candidates when the minimum stint changes', () => {
        render(<App />);
        const ws = Socket.instances[0];
        const short = { ...driver(7, 75000), stint: { number: 1, length: 5 } };
        const ready = { ...driver(12, 82000), stint: { number: 1, length: 6 } };
        act(() => { ws.onopen(); ws.frame(frame({ drivers: [short, ready] })); });
        const input = screen.getByRole('spinbutton', { name: 'Минимум на стинт, кругов' });
        expect(input).toHaveValue(6);
        const shortRow = screen.getByRole('button', { name: 'Pilot 7' }).closest('tr');
        expect(shortRow).not.toHaveClass('driver-row--candidate');
        expect(shortRow.querySelector('.driver-forecast__wait')).not.toBeVisible();
        expect(screen.getByText('Прогноз по #12')).toBeVisible();
        fireEvent.change(input, { target: { value: '' } });
        expect(input).toHaveValue(null);
        fireEvent.change(input, { target: { value: '5' } });
        expect(screen.getByText('Прогноз по #7')).toBeVisible();
        fireEvent.change(input, { target: { value: '7' } });
        expect(screen.queryByText(/Прогноз по #/)).not.toBeInTheDocument();
        fireEvent.change(input, { target: { value: '6' } });
        expect(screen.getByText('Прогноз по #12')).toBeVisible();
    });
    it('opens lap history from the row or track point and closes it without changing the forecast', () => {
        const { container } = render(<App />);
        const ws = Socket.instances[0];
        const d = driver(12, 82000);
        d.stint = { number: 2, length: 3, avgTime: 30000 };
        act(() => { ws.onopen(); ws.frame(frame({ drivers: [driver(7, 75000), d] })); });
        const name = screen.getByRole('button', { name: 'Pilot 12' });
        fireEvent.click(name.closest('tr').querySelector('td'));
        expect(screen.getByRole('heading', { name: 'Pilot 12' })).toBeVisible();
        act(() => ws.frame(frame({ drivers: [driver(12, 112000, 4)] })));
        expect(screen.getByRole('heading', { name: 'Pilot 12' })).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: '×' }));
        expect(container.querySelector('.lap-sidebar')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: /^№7 Pilot 7/ }));
        expect(screen.getByRole('heading', { name: 'Pilot 7' })).toBeVisible();
        expect(screen.getByText('Прогноз по #7')).toBeVisible();
    });
    it('clears the candidate on a heat change and honours direction changes', () => {
        render(<App />);
        const ws = Socket.instances[0];
        act(() => { ws.onopen(); ws.frame(frame()); });
        act(() => ws.frame(frame({ direction: 2 })));
        expect(screen.queryByText(/Прогноз по #/)).not.toBeInTheDocument();
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        act(() => ws.frame(frame({ id: 2, drivers: [driver(20, 90000)] })));
        expect(screen.getByText('Прогноз по #20')).toBeVisible();
    });
});
