import { Select, MultiSelect } from './Select';

interface Props {
    search: string;
    neighborhoods: string[];
    cuisine: string;
    mealTypes: string[];
    neighborhoodOptions: string[];
    cuisines: string[];
    mealTypeOptions: string[];
    onSearchChange: (value: string) => void;
    onNeighborhoodsChange: (value: string[]) => void;
    onCuisineChange: (value: string) => void;
    onMealTypesChange: (values: string[]) => void;
}

export function FilterPanel({
    search,
    neighborhoods,
    cuisine,
    mealTypes,
    neighborhoods,
    cuisines,
    mealTypeOptions,
    onSearchChange,
    onNeighborhoodsChange,
    onCuisineChange,
    onMealTypesChange,
}: Props) {
    const neighborhoodOptions = neighborhoods.map(n => ({ value: n, label: n }));
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
                options={neighborhoodOptions}
                values={neighborhoods}
                onChange={onNeighborhoodsChange}
                placeholder="All Neighborhoods"
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
