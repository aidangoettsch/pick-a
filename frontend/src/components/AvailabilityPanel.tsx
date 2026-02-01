import { useState, useCallback, useRef } from 'react';
import type { Restaurant, Slot } from '../types';

// In production, API is on same origin; in dev, use localhost:5000
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

// Client-side rate limiting config
const CLIENT_RATE_LIMIT_MS = 60; // ~17 requests per second

export interface AvailabilityResult {
    restaurantName: string;
    slots: Slot[] | null;
    error: string | null;
    loading: boolean;
}

export interface AvailabilityFilters {
    available: boolean;
    notAvailable: boolean;
    unchecked: boolean;
}

interface Props {
    date: string;
    partySize: number;
    onDateChange: (value: string) => void;
    onPartySizeChange: (value: number) => void;
    restaurants: Restaurant[];
    onResultsUpdate: (results: Map<string, AvailabilityResult>) => void;
    availabilityFilters: AvailabilityFilters;
    onAvailabilityFiltersChange: (filters: AvailabilityFilters) => void;
    hasResults: boolean;
    timeFrom: string;
    timeTo: string;
    onTimeFromChange: (value: string) => void;
    onTimeToChange: (value: string) => void;
}

export function AvailabilityPanel({
    date,
    partySize,
    onDateChange,
    onPartySizeChange,
    restaurants,
    onResultsUpdate,
    availabilityFilters,
    onAvailabilityFiltersChange,
    hasResults,
    timeFrom,
    timeTo,
    onTimeFromChange,
    onTimeToChange,
}: Props) {
    const [isChecking, setIsChecking] = useState(false);
    const [progress, setProgress] = useState({ completed: 0, total: 0, hasAvailability: 0 });
    const abortControllerRef = useRef<AbortController | null>(null);
    const resultsRef = useRef<Map<string, AvailabilityResult>>(new Map());

    // Get checkable restaurants (those with API availability)
    const checkableRestaurants = restaurants.filter(r => {
        const opt = r.reservation_option;
        return opt.opentable_id ||
            opt.known_platform_url?.includes('resy.com') ||
            opt.known_platform_url?.includes('opentable.com');
    });

    const checkSingleRestaurant = useCallback(async (
        restaurant: Restaurant,
        signal: AbortSignal
    ): Promise<AvailabilityResult> => {
        const opt = restaurant.reservation_option;
        const params = new URLSearchParams();
        params.set('date', date);
        params.set('party_size', partySize.toString());

        if (opt.opentable_id) {
            params.set('opentable_id', opt.opentable_id.toString());
        } else if (opt.known_platform_url) {
            params.set('platform_url', opt.known_platform_url);
        }

        try {
            const res = await fetch(`${API_BASE}/availability?${params}`, { signal });
            const data = await res.json();

            if (data.error) {
                return {
                    restaurantName: restaurant.name,
                    slots: null,
                    error: data.error,
                    loading: false,
                };
            }

            return {
                restaurantName: restaurant.name,
                slots: data.slots || [],
                error: null,
                loading: false,
            };
        } catch {
            if (signal.aborted) {
                throw new Error('Aborted');
            }
            return {
                restaurantName: restaurant.name,
                slots: null,
                error: 'Failed to check',
                loading: false,
            };
        }
    }, [date, partySize]);

    const checkAllAvailability = useCallback(async () => {
        if (checkableRestaurants.length === 0) return;

        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        setIsChecking(true);
        resultsRef.current = new Map();
        setProgress({ completed: 0, total: checkableRestaurants.length, hasAvailability: 0 });

        let completed = 0;
        let hasAvailability = 0;

        for (const restaurant of checkableRestaurants) {
            if (signal.aborted) break;

            resultsRef.current.set(restaurant.name, {
                restaurantName: restaurant.name,
                slots: null,
                error: null,
                loading: true,
            });
            onResultsUpdate(new Map(resultsRef.current));

            try {
                const result = await checkSingleRestaurant(restaurant, signal);
                resultsRef.current.set(restaurant.name, result);
                completed++;
                if (result.slots && result.slots.length > 0) {
                    hasAvailability++;
                }
                setProgress({ completed, total: checkableRestaurants.length, hasAvailability });
                onResultsUpdate(new Map(resultsRef.current));
            } catch {
                break;
            }

            if (!signal.aborted && completed < checkableRestaurants.length) {
                await new Promise(resolve => setTimeout(resolve, CLIENT_RATE_LIMIT_MS));
            }
        }

        setIsChecking(false);
        abortControllerRef.current = null;
    }, [checkableRestaurants, checkSingleRestaurant, onResultsUpdate]);

    const cancelCheck = useCallback(() => {
        abortControllerRef.current?.abort();
        setIsChecking(false);
    }, []);

    const progressPercent = progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;

    const toggleFilter = (key: keyof AvailabilityFilters) => {
        onAvailabilityFiltersChange({
            ...availabilityFilters,
            [key]: !availabilityFilters[key],
        });
    };

    return (
        <div className="availability-section">
            <h2 className="filter-title">Check Availability</h2>

            <div className="filter-group">
                <label htmlFor="date-input">Date</label>
                <input
                    type="date"
                    id="date-input"
                    value={date}
                    onChange={(e) => onDateChange(e.target.value)}
                />
            </div>

            <div className="filter-group">
                <label htmlFor="party-size-input">Party Size</label>
                <input
                    type="number"
                    id="party-size-input"
                    min={1}
                    max={20}
                    value={partySize}
                    onChange={(e) => onPartySizeChange(parseInt(e.target.value) || 2)}
                />
            </div>

            <div className="bulk-check-section">
                {isChecking ? (
                    <>
                        <div className="bulk-progress">
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <div className="progress-text">
                                {progress.completed} / {progress.total} checked
                                {progress.hasAvailability > 0 && (
                                    <span className="has-availability"> • {progress.hasAvailability} available</span>
                                )}
                            </div>
                        </div>
                        <button className="btn btn-secondary" onClick={cancelCheck}>
                            Cancel
                        </button>
                    </>
                ) : (
                    <button
                        className="btn btn-primary"
                        onClick={checkAllAvailability}
                        disabled={checkableRestaurants.length === 0}
                    >
                        Check All ({checkableRestaurants.length})
                    </button>
                )}
            </div>

            {hasResults && (
                <div className="result-filters">
                    <label>Show</label>
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn toggle ${availabilityFilters.available ? 'active' : ''}`}
                            onClick={() => toggleFilter('available')}
                        >
                            Available
                        </button>
                        <button
                            className={`filter-btn toggle ${availabilityFilters.notAvailable ? 'active' : ''}`}
                            onClick={() => toggleFilter('notAvailable')}
                        >
                            None
                        </button>
                        <button
                            className={`filter-btn toggle ${availabilityFilters.unchecked ? 'active' : ''}`}
                            onClick={() => toggleFilter('unchecked')}
                        >
                            Unchecked
                        </button>
                    </div>

                    {availabilityFilters.available && (
                        <div className="time-range-filter">
                            <label>Time Range</label>
                            <div className="time-inputs">
                                <input
                                    type="time"
                                    value={timeFrom}
                                    onChange={(e) => onTimeFromChange(e.target.value)}
                                />
                                <span>to</span>
                                <input
                                    type="time"
                                    value={timeTo}
                                    onChange={(e) => onTimeToChange(e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
