import { useState, useCallback } from 'react';
import type { Restaurant, Slot, AvailabilityResult } from '../types';

// In production, API is on same origin; in dev, use localhost:5000
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

interface Props {
    restaurant: Restaurant;
    date: string;
    partySize: number;
}

export function RestaurantCard({ restaurant, date, partySize }: Props) {
    const [availability, setAvailability] = useState<Slot[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const opt = restaurant.reservation_option;
    const hasOpenTable = !!opt.opentable_id;
    const platformUrl = opt.known_platform_url;
    const isResy = platformUrl?.includes('resy.com');
    const isOpenTable = platformUrl?.includes('opentable.com');
    const canCheckAvailability = hasOpenTable || isResy || isOpenTable;

    const checkAvailability = useCallback(async () => {
        if (!date) {
            setError('Please select a date');
            return;
        }

        setLoading(true);
        setError(null);
        setAvailability(null);

        const params = new URLSearchParams();
        params.set('date', date);
        params.set('party_size', partySize.toString());

        if (opt.opentable_id) {
            params.set('opentable_id', opt.opentable_id.toString());
        } else if (opt.known_platform_url) {
            params.set('platform_url', opt.known_platform_url);
        }

        try {
            const res = await fetch(`${API_BASE}/availability?${params}`);
            const data: AvailabilityResult = await res.json();

            if (data.error) {
                setError(data.error);
            } else {
                setAvailability(data.slots || []);
            }
        } catch {
            setError('Failed to check availability');
        } finally {
            setLoading(false);
        }
    }, [date, partySize, opt]);

    return (
        <div className="restaurant-card">
            <h3 className="restaurant-name">{restaurant.name}</h3>
            <div className="restaurant-neighborhood">{restaurant.neighborhood}</div>

            <div className="restaurant-tags">
                {restaurant.tags.map(tag => (
                    <span key={tag} className="tag">{tag}</span>
                ))}
            </div>

            <div className="restaurant-meals">
                {restaurant.meal_types.map(meal => (
                    <span key={meal} className="meal-badge">{meal}</span>
                ))}
            </div>

            <div className="card-actions">
                {canCheckAvailability ? (
                    <button
                        className="btn btn-primary"
                        onClick={checkAvailability}
                        disabled={loading}
                    >
                        {loading ? 'Checking...' : 'Check Availability'}
                    </button>
                ) : (
                    <button className="btn btn-secondary" disabled>
                        No API Available
                    </button>
                )}

                {restaurant.reservation_option.restaurant_website && (
                    <a
                        href={restaurant.reservation_option.restaurant_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                    >
                        Website ↗
                    </a>
                )}
            </div>

            {(loading || availability !== null || error) && (
                <div className="availability-results">
                    {loading && (
                        <div className="availability-loading">Checking availability...</div>
                    )}

                    {error && (
                        <div className="availability-error">{error}</div>
                    )}

                    {availability !== null && !loading && !error && (
                        availability.length > 0 ? (
                            <div className="availability-slots">
                                {availability.map((slot, i) => (
                                    <span key={i} className="slot" title={slot.seating_type}>
                                        {slot.time}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="no-slots">No availability found for this date</div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
