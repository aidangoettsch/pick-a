import { Select, MultiSelect } from './Select';

interface Props {
    search: string;
    neighborhoods: string[];
    boroughs: string[];
    cuisine: string;
    mealTypes: string[];
    neighborhoodOptions: string[];
    boroughOptions: string[];
    cuisines: string[];
    mealTypeOptions: string[];
    onSearchChange: (value: string) => void;
    onNeighborhoodsChange: (value: string[]) => void;
    onBoroughsChange: (value: string[]) => void;
    onCuisineChange: (value: string) => void;
    onMealTypesChange: (values: string[]) => void;
}

export function FilterPanel({
    search,
    neighborhoods,
    cuisine,
    mealTypes,
    neighborhoodOptions,
    cuisines,
    mealTypeOptions,
    onSearchChange,
    onNeighborhoodsChange,
    onCuisineChange,
    onMealTypesChange,
}: Props) {
    const neighborhoodOptionsMapped = neighborhoodOptions.map(n => ({ value: n, label: n }));
    const boroughOptionsMapped = boroughOptions.map(b => ({ value: b, label: b }));
    const cuisineOptions = cuisines.map(c => ({ value: c, label: c }));
    const mealOptions = mealTypeOptions.map(m => ({ value: m, label: m }));

    return (
        <div className="filter-section">
            <h2 className="filter-title">Filters</h2>

            <div className="filter-group">
                <label htmlFor="search-input">Search</label>
                <input
                    type="text"
                    id="search-input"
                    placeholder="Restaurant name..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            <MultiSelect
                id="neighborhoods-select"
                label="Neighborhood"
                options={neighborhoodOptionsMapped}
                values={neighborhoods}
                onChange={onNeighborhoodsChange}
                placeholder="All Neighborhoods"
            />

            <MultiSelect
                id="boroughs-select"
                label="Borough"
                options={boroughOptionsMapped}
                values={boroughs}
                onChange={onCoroughsChange}
                placeholder="All Boroughs"
            />

            <Select
                id="cuisine-select"
                label="Cuisine"
                options={cuisineOptions}
                value={cuisine}
                onChange={onCuisineChange}
                placeholder="All Cuisines"
            />

            <MultiSelect
                id="meal-select"
                label="Meal Types"
                options={mealOptions}
                values={mealTypes}
                onChange={onMealTypesChange}
                placeholder="All Meals"
            />
        </div>
    );
}
