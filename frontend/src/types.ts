export interface ReservationOption {
    restaurant_website?: string;
    opentable_id?: number;
    known_platform_url?: string;
}

export interface Restaurant {
    name: string;
    neighborhood: string;
    tags: string[];
    meal_types: string[];
    reservation_option: ReservationOption;
}

export interface FilterOptions {
    neighborhoods: string[];
    tags: string[];
    meal_types: string[];
}

export interface Slot {
    time: string;
    seating_type: string;
}

export interface AvailabilityResult {
    slots?: Slot[];
    error?: string;
}
