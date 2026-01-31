interface Props {
    date: string;
    partySize: number;
    onDateChange: (value: string) => void;
    onPartySizeChange: (value: number) => void;
}

export function AvailabilityPanel({
    date,
    partySize,
    onDateChange,
    onPartySizeChange,
}: Props) {
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
        </div>
    );
}
