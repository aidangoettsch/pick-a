import { useState, useEffect, useMemo, useCallback } from 'react';
import './index.css';
import type { Restaurant, FilterOptions } from './types';
import { RestaurantCard } from './components/RestaurantCard';
import { FilterPanel } from './components/FilterPanel';
import { AvailabilityPanel } from './components/AvailabilityPanel';
import type { AvailabilityResult, AvailabilityFilters } from './components/AvailabilityPanel';

// In production, API is on same origin; in dev, use localhost:5000
const API_BASE = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';

function App() {
  // All restaurants (loaded once)
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter options from server
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    neighborhoods: [],
    boroughs: [],
    tags: [],
    meal_types: [],
  });

  // Current filter values
  const [search, setSearch] = useState('');
  const [boroughs, setBoroughs] = useState<string[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<string[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [mealTypes, setMealTypes] = useState<string[]>([]);

  // Availability settings
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [partySize, setPartySize] = useState(2);

  // Bulk availability results (keyed by restaurant index in baseFilteredRestaurants)
  const [bulkResults, setBulkResults] = useState<Map<number, AvailabilityResult>>(new Map());

  // Availability filters (toggles that can be combined)
  const [availabilityFilters, setAvailabilityFilters] = useState<AvailabilityFilters>({
    available: false,
    notAvailable: false,
    unchecked: false,
  });

  // Time range filter
  const [timeFrom, setTimeFrom] = useState('11:00');
  const [timeTo, setTimeTo] = useState('23:00');

  // Load all data once on mount
  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/filters`).then(res => res.json()),
      fetch(`${API_BASE}/restaurants`).then(res => res.json()),
    ])
      .then(([filters, restaurants]) => {
        setFilterOptions(filters);
        setAllRestaurants(restaurants);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Client-side filtering (base filters)
  const baseFilteredRestaurants = useMemo(() => {
    let results = allRestaurants;

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      results = results.filter(r => r.name.toLowerCase().includes(searchLower));
    }

    // Borough filter (any match)
    if (boroughs.length > 0) {
      results = results.filter(r => boroughs.includes(r.borough));
    }

    // Neighborhood filter (any match)
    if (neighborhoods.length > 0) {
      results = results.filter(r => neighborhoods.includes(r.neighborhood));
    }

    // Cuisine filter (any match)
    if (cuisines.length > 0) {
      results = results.filter(r => r.tags.some(tag => cuisines.includes(tag)));
    }

    // Meal type filter (any match)
    if (mealTypes.length > 0) {
      results = results.filter(r => r.meal_types.some(mt => mealTypes.includes(mt)));
    }

    return results;
  }, [allRestaurants, search, boroughs, neighborhoods, cuisines, mealTypes]);

  // Apply availability filters (if any are active, show restaurants matching ANY active filter)
  const filteredRestaurants = useMemo(() => {
    const anyFilterActive = availabilityFilters.available || availabilityFilters.notAvailable || availabilityFilters.unchecked;

    if (!anyFilterActive || bulkResults.size === 0) {
      return baseFilteredRestaurants;
    }

    return baseFilteredRestaurants.filter((_, index) => {
      const result = bulkResults.get(index);

      // Unchecked: no result or has error
      if (availabilityFilters.unchecked && (!result || result.error !== null)) {
        return true;
      }

      // Available: has slots in time range
      if (availabilityFilters.available && result?.slots && result.slots.length > 0) {
        // Filter slots by time range
        const slotsInRange = result.slots.filter(slot =>
          slot.time >= timeFrom && slot.time <= timeTo
        );
        if (slotsInRange.length > 0) {
          return true;
        }
      }

      // Not available: checked successfully but no slots
      if (availabilityFilters.notAvailable && result && !result.error && result.slots && result.slots.length === 0) {
        return true;
      }

      return false;
    });
  }, [baseFilteredRestaurants, bulkResults, availabilityFilters, timeFrom, timeTo]);

  // Clear bulk results when base filters change
  useEffect(() => {
    setBulkResults(new Map());
    setAvailabilityFilters({ available: false, notAvailable: false, unchecked: false });
  }, [baseFilteredRestaurants]);

  // Handle bulk results update
  const handleBulkResultsUpdate = useCallback((results: Map<number, AvailabilityResult>) => {
    setBulkResults(results);
  }, []);

  // Handle single restaurant result update (from individual card checks)
  const handleSingleResultUpdate = useCallback((index: number, result: AvailabilityResult) => {
    setBulkResults(prev => {
      const newResults = new Map(prev);
      newResults.set(index, result);
      return newResults;
    });
  }, []);

  const hasResults = bulkResults.size > 0;

  // Get active filter names for display
  const activeFilterNames = [
    availabilityFilters.available && 'available',
    availabilityFilters.notAvailable && 'not available',
    availabilityFilters.unchecked && 'unchecked',
  ].filter(Boolean);

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
            boroughs={boroughs}
            cuisines={cuisines}
            mealTypes={mealTypes}
            neighborhoodOptions={filterOptions.neighborhoods}
            boroughOptions={filterOptions.boroughs}
            cuisineOptions={filterOptions.tags}
            mealTypeOptions={filterOptions.meal_types}
            onSearchChange={setSearch}
            onNeighborhoodsChange={setNeighborhoods}
            onBoroughsChange={setBoroughs}
            onCuisinesChange={setCuisines}
            onMealTypesChange={setMealTypes}
          />

          <AvailabilityPanel
            date={date}
            partySize={partySize}
            onDateChange={setDate}
            onPartySizeChange={setPartySize}
            restaurants={baseFilteredRestaurants}
            onResultsUpdate={handleBulkResultsUpdate}
            availabilityFilters={availabilityFilters}
            onAvailabilityFiltersChange={setAvailabilityFilters}
            hasResults={hasResults}
            timeFrom={timeFrom}
            timeTo={timeTo}
            onTimeFromChange={setTimeFrom}
            onTimeToChange={setTimeTo}
          />

          <div className="results-count">
            <span>{filteredRestaurants.length}</span> restaurants
            {activeFilterNames.length > 0 && (
              <span className="filter-note"> ({activeFilterNames.join(', ')})</span>
            )}
          </div>
        </aside>

        <section className="restaurant-grid">
          {loading ? (
            <div className="loading">Loading restaurants...</div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="loading">No restaurants found matching your filters.</div>
          ) : (
            filteredRestaurants.map((restaurant) => {
              // Find the original index in baseFilteredRestaurants for bulk result lookup
              const originalIndex = baseFilteredRestaurants.indexOf(restaurant);
              return (
                <RestaurantCard
                  key={`${restaurant.name}-${originalIndex}`}
                  restaurant={restaurant}
                  date={date}
                  partySize={partySize}
                  bulkResult={bulkResults.get(originalIndex)}
                  restaurantIndex={originalIndex}
                  onResultUpdate={handleSingleResultUpdate}
                />
              );
            })
          )}
        </section>
      </main>
    </>
  );
}

export default App;
