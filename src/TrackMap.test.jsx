import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TrackMap from './TrackMap.jsx';
import { projectDrivers, chooseCandidate, predictPit } from './utils/track-model.js';

afterEach(cleanup);
const drivers = [{ driver: { id: 7, name: 'AMG mini' }, number: 7, laps: [{ number: 1, time: 31000, receivedAt: 74000 }] }];
const points = projectDrivers(drivers, 100000);
const model = { points, forecast: predictPit(points, chooseCandidate(points, null), 100000, 25000), connected: true, enabled: true };
const props = { model, direction: 1, pitLoss: 25, onPitLossChange: vi.fn(), onDriverSelect: vi.fn() };

describe('track map interaction', () => {
    it('identifies the scenario candidate separately from selection', () => {
        render(<TrackMap {...props} selectedDriver={drivers[0]} />);
        expect(screen.getByText('Прогноз по #7')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: /кандидат прогноза/ }));
        expect(props.onDriverSelect).toHaveBeenCalledWith(drivers[0]);
    });
    it('allows clearing and replacing the pit loss while retaining the last valid forecast value', () => {
        const onPitLossChange = vi.fn();
        const { rerender } = render(<TrackMap {...props} onPitLossChange={onPitLossChange} />);
        const input = screen.getByRole('spinbutton', { name: 'Потеря на питстопе, секунд' });
        fireEvent.change(input, { target: { value: '' } });
        expect(input).toHaveValue(null);
        expect(onPitLossChange).not.toHaveBeenCalled();
        fireEvent.change(input, { target: { value: '30' } });
        expect(onPitLossChange).toHaveBeenLastCalledWith(30);
        rerender(<TrackMap {...props} pitLoss={30} onPitLossChange={onPitLossChange} />);
        fireEvent.change(input, { target: { value: '' } });
        fireEvent.blur(input);
        expect(input).toHaveValue(30);
    });
    it.each([null, undefined, 0, 400])('hides absent or rounded-zero wait (%s) while retaining its space', wait => {
        const { container } = render(<TrackMap {...props} selectedDriver={drivers[0]}
            model={{ ...model, forecast: { ...model.forecast, waits: new Map([[7, wait]]) } }} />);
        const waiting = container.querySelector('.track-map__waiting');
        expect(waiting).toBeInTheDocument();
        expect(waiting).not.toBeVisible();
        expect(waiting).toHaveAttribute('aria-hidden', 'true');
    });
    it('keeps the base ring on unsupported tracks without pit controls', () => {
        render(<TrackMap {...props} model={{ ...model, forecast: null, enabled: false }} />);
        expect(screen.getByRole('region', { name: 'Схема трека' })).toBeVisible();
        expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
        expect(screen.queryByText(/Прогноз по #/)).not.toBeInTheDocument();
    });
    it('replaces the forecast with connection status when disconnected', () => {
        render(<TrackMap {...props} model={{ ...model, forecast: null, connected: false }} selectedDriver={drivers[0]} />);
        expect(screen.getByText(/прогноз приостановлен/)).toBeVisible();
        expect(screen.getAllByText('Нет связи')).toHaveLength(2);
    });
});
