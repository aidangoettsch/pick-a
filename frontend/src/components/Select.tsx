import { useState, useRef, useEffect } from 'react';
import './Select.css';

interface Option {
    value: string;
    label: string;
}

interface SelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    id?: string;
}

export function Select({ options, value, onChange, placeholder = 'Select...', label, id }: SelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.value === value);

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    return (
        <div className="select-container" ref={containerRef}>
            {label && <label className="select-label" htmlFor={id}>{label}</label>}
            <div
                className={`select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0);
                }}
            >
                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        className="select-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={selectedOption?.label || placeholder}
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <span className={`select-value ${!selectedOption ? 'placeholder' : ''}`}>
                        {selectedOption?.label || placeholder}
                    </span>
                )}
                <div className="select-icons">
                    {value && (
                        <button className="select-clear" onClick={handleClear} aria-label="Clear">
                            ×
                        </button>
                    )}
                    <span className={`select-arrow ${isOpen ? 'up' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className="select-dropdown">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option.value}
                                className={`select-option ${option.value === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                            </div>
                        ))
                    ) : (
                        <div className="select-empty">No options found</div>
                    )}
                </div>
            )}
        </div>
    );
}

interface MultiSelectProps {
    options: Option[];
    values: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    label?: string;
    id?: string;
}

export function MultiSelect({ options, values, onChange, placeholder = 'Select...', label, id }: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOptions = options.filter(o => values.includes(o.value));

    const filteredOptions = options.filter(o =>
        o.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string) => {
        if (values.includes(optionValue)) {
            onChange(values.filter(v => v !== optionValue));
        } else {
            onChange([...values, optionValue]);
        }
    };

    const removeValue = (e: React.MouseEvent, optionValue: string) => {
        e.stopPropagation();
        onChange(values.filter(v => v !== optionValue));
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
        setSearchTerm('');
    };

    return (
        <div className="select-container" ref={containerRef}>
            {label && <label className="select-label" htmlFor={id}>{label}</label>}
            <div
                className={`select-trigger multi ${isOpen ? 'open' : ''}`}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 0);
                }}
            >
                <div className="multi-values">
                    {selectedOptions.length > 0 ? (
                        <>
                            {selectedOptions.slice(0, 2).map(opt => (
                                <span key={opt.value} className="multi-tag">
                                    {opt.label}
                                    <button onClick={(e) => removeValue(e, opt.value)} aria-label="Remove">×</button>
                                </span>
                            ))}
                            {selectedOptions.length > 2 && (
                                <span className="multi-more">+{selectedOptions.length - 2}</span>
                            )}
                        </>
                    ) : (
                        <span className="placeholder">{placeholder}</span>
                    )}
                    {isOpen && (
                        <input
                            ref={inputRef}
                            type="text"
                            className="multi-search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Type to filter..."
                            onClick={(e) => e.stopPropagation()}
                        />
                    )}
                </div>
                <div className="select-icons">
                    {values.length > 0 && (
                        <button className="select-clear" onClick={handleClearAll} aria-label="Clear all">
                            ×
                        </button>
                    )}
                    <span className={`select-arrow ${isOpen ? 'up' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className="select-dropdown">
                    {/* Select All / Deselect All toggle */}
                    {filteredOptions.length > 0 && (
                        <div
                            className="select-option select-all"
                            onClick={() => {
                                const allFilteredValues = filteredOptions.map(o => o.value);
                                const allSelected = allFilteredValues.every(v => values.includes(v));
                                if (allSelected) {
                                    // Deselect all filtered options
                                    onChange(values.filter(v => !allFilteredValues.includes(v)));
                                } else {
                                    // Select all filtered options
                                    const newValues = [...new Set([...values, ...allFilteredValues])];
                                    onChange(newValues);
                                }
                            }}
                        >
                            <span className="checkbox">
                                {filteredOptions.every(o => values.includes(o.value)) && (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                )}
                            </span>
                            {filteredOptions.every(o => values.includes(o.value)) ? 'Deselect All' : 'Select All'}
                        </div>
                    )}
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option.value}
                                className={`select-option ${values.includes(option.value) ? 'selected' : ''}`}
                                onClick={() => toggleOption(option.value)}
                            >
                                <span className="checkbox">
                                    {values.includes(option.value) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                            <path d="M20 6 9 17l-5-5" />
                                        </svg>
                                    )}
                                </span>
                                {option.label}
                            </div>
                        ))
                    ) : (
                        <div className="select-empty">No options found</div>
                    )}
                </div>
            )}
        </div>
    );
}
