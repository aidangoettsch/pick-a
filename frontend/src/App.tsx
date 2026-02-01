import { useState, useEffect, useCallback, useMemo } from 'react';
import './index.css';
import type { Restaurant, FilterOptions } from './types';
import { RestaurantCard } from './components/RestaurantCard';
import { FilterPanel } from './components/FilterPanel';
import { AvailabilityPanel } from './components/AvailabilityPanel';

// In production, API is on same origin; in dev, use localhost:5000
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

function App() {
  // Filter options from server
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    neighborhoods: [],
    tags: [],
    meal_types: [],
  });

  // Current filter values
  const [search, setSearch] = useState('');
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState('');
  const [mealTypes, setMealTypes] = useState<string[]>([]);

  // Availability settings
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [partySize, setPartySize] = useState(2);

  // Restaurants data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load filter options
  useEffect(() => {
    fetch(`${API_BASE}/filters`)
      .then(res => res.json())
      .then(setFilterOptions)
      .catch(console.error);
  }, []);

  // Load restaurants
  const loadRestaurants = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    neighborhoods.forEach(n => params.append('neighborhoods', n));
    if (cuisine) params.set('tag', cuisine);
    // Send multiple meal_type params for multi-select
    mealTypes.forEach(mt => params.append('meal_type', mt));

    try {
      const res = await fetch(`${API_BASE}/restaurants?${params}`);
      const data = await res.json();
      setRestaurants(data);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, neighborhoods, cuisine, mealTypes]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const restaurantCount = useMemo(() => restaurants.length, [restaurants]);

  return (
    <>
      <header className="header">
        <div className="header-content">
          <h1 className="logo">🍽️ NYC Restaurant Week</h1>
          <p className="tagline">Discover deals, check availability</p>
        </div>
      </header>

      <main className="main-container">
        <aside className="sidebar">
          <FilterPanel
            search={search}
            neighborhoods={neighborhoods}
            cuisine={cuisine}
            mealTypes={mealTypes}
            neighborhoodOptions={filterOptions.neighborhoods}
            cuisines={filterOptions.tags}
            mealTypeOptions={filterOptions.meal_types}
            onSearchChange={setSearch}
            onNeighborhoodsChange={setNeighborhoods}
            onCuisineChange={setCuisine}
            onMealTypesChange={setMealTypes}
          />

          <AvailabilityPanel
            date={date}
            partySize={partySize}
            onDateChange={setDate}
            onPartySizeChange={setPartySize}
          />

          <div className="results-count">
            <span>{restaurantCount}</span> restaurants
          </div>
        </aside>

        <section className="restaurant-grid">
          {loading ? (
            <div className="loading">Loading restaurants...</div>
          ) : restaurants.length === 0 ? (
            <div className="loading">No restaurants found matching your filters.</div>
          ) : (
            restaurants.map((restaurant, index) => (
              <RestaurantCard
                key={`${restaurant.name}-${index}`}
                restaurant={restaurant}
                date={date}
                partySize={partySize}
              />
            ))
          )}
        </section>
      </main>
    </>
  );
}

export default App;
