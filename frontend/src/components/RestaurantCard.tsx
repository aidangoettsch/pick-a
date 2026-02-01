import { useCallback } from 'react';
import type { Restaurant, Slot, AvailabilityResult as ApiAvailabilityResult } from '../types';
import type { AvailabilityResult } from './AvailabilityPanel';

// In production, API is on same origin; in dev, use localhost:5000
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

interface Props {
    restaurant: Restaurant;
    date: string;
    partySize: number;
    bulkResult?: AvailabilityResult;
    restaurantIndex: number;
    onResultUpdate: (index: number, result: AvailabilityResult) => void;
}

export function RestaurantCard({ restaurant, date, partySize, bulkResult, restaurantIndex, onResultUpdate }: Props) {
    const opt = restaurant.reservation_option;
    const hasOpenTable = !!opt.opentable_id;
    const platformUrl = opt.known_platform_url;
    const isResy = platformUrl?.includes('resy.com');
    const isOpenTable = platformUrl?.includes('opentable.com');
    const canCheckAvailability = hasOpenTable || isResy || isOpenTable;

    // Use bulk result for state
    const loading = bulkResult?.loading ?? false;
    const error = bulkResult?.error ?? null;
    const availability = bulkResult?.slots ?? null;

    const checkAvailability = useCallback(async () => {
        if (!date) {
            onResultUpdate(restaurantIndex, {
                restaurantName: restaurant.name,
                restaurantIndex,
                slots: null,
                error: 'Please select a date',
                loading: false,
            });
            return;
        }

        // Set loading state
        onResultUpdate(restaurantIndex, {
            restaurantName: restaurant.name,
            restaurantIndex,
            slots: null,
            error: null,
            loading: true,
        });

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
            const data: ApiAvailabilityResult = await res.json();

            if (data.error) {
                onResultUpdate(restaurantIndex, {
                    restaurantName: restaurant.name,
                    restaurantIndex,
                    slots: null,
                    error: data.error,
                    loading: false,
                });
            } else {
                onResultUpdate(restaurantIndex, {
                    restaurantName: restaurant.name,
                    restaurantIndex,
                    slots: data.slots || [],
                    error: null,
                    loading: false,
                });
            }
        } catch {
            onResultUpdate(restaurantIndex, {
                restaurantName: restaurant.name,
                restaurantIndex,
                slots: null,
                error: 'Failed to check availability',
                loading: false,
            });
        }
    }, [date, partySize, opt, restaurant.name, restaurantIndex, onResultUpdate]);

    // Determine if we have availability to show
    const hasAvailability = availability && availability.length > 0;

    return (
        <div className={`restaurant-card ${hasAvailability ? 'has-availability' : ''}`}>
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
                                {availability.map((slot: Slot, i: number) => (
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
