import { MultiSelect } from './Select';

interface Props {
    search: string;
    neighborhoods: string[];
    boroughs: string[];
    cuisines: string[];
    mealTypes: string[];
    neighborhoodOptions: string[];
    boroughOptions: string[];
    cuisineOptions: string[];
    mealTypeOptions: string[];
    onSearchChange: (value: string) => void;
    onNeighborhoodsChange: (value: string[]) => void;
    onBoroughsChange: (value: string[]) => void;
    onCuisinesChange: (value: string[]) => void;
    onMealTypesChange: (values: string[]) => void;
}

export function FilterPanel({
    search,
    neighborhoods,
    boroughs,
    cuisines,
    mealTypes,
    neighborhoodOptions,
    boroughOptions,
    cuisineOptions,
    mealTypeOptions,
    onSearchChange,
    onNeighborhoodsChange,
    onBoroughsChange,
    onCuisinesChange,
    onMealTypesChange,
}: Props) {
    const neighborhoodOptionsMapped = neighborhoodOptions.map(n => ({ value: n, label: n }));
    const boroughOptionsMapped = boroughOptions.map(b => ({ value: b, label: b }));
    const cuisineOptionsMapped = cuisineOptions.map(c => ({ value: c, label: c }));
    const mealOptionsMapped = mealTypeOptions.map(m => ({ value: m, label: m }));

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
                id="boroughs-select"
                label="Borough"
                options={boroughOptionsMapped}
                values={boroughs}
                onChange={onBoroughsChange}
                placeholder="All Boroughs"
            />

            <MultiSelect
                id="neighborhoods-select"
                label="Neighborhood"
                options={neighborhoodOptionsMapped}
                values={neighborhoods}
                onChange={onNeighborhoodsChange}
                placeholder="All Neighborhoods"
            />

            <MultiSelect
                id="cuisine-select"
                label="Cuisine"
                options={cuisineOptionsMapped}
                values={cuisines}
                onChange={onCuisinesChange}
                placeholder="All Cuisines"
            />

            <MultiSelect
                id="meal-select"
                label="Meal Types"
                options={mealOptionsMapped}
                values={mealTypes}
                onChange={onMealTypesChange}
                placeholder="All Meals"
            />
        </div>
    );
}
