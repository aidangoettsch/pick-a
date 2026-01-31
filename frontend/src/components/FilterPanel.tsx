import { Select, MultiSelect } from './Select';

interface Props {
    search: string;
    neighborhood: string;
    cuisine: string;
    mealTypes: string[];
    neighborhoods: string[];
    cuisines: string[];
    mealTypeOptions: string[];
    onSearchChange: (value: string) => void;
    onNeighborhoodChange: (value: string) => void;
    onCuisineChange: (value: string) => void;
    onMealTypesChange: (values: string[]) => void;
}

export function FilterPanel({
    search,
    neighborhood,
    cuisine,
    mealTypes,
    neighborhoods,
    cuisines,
    mealTypeOptions,
    onSearchChange,
    onNeighborhoodChange,
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

            <Select
                id="neighborhood-select"
                label="Neighborhood"
                options={neighborhoodOptions}
                value={neighborhood}
                onChange={onNeighborhoodChange}
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
