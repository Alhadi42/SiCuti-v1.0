import React, { useState, useEffect, useRef } from "react";

const AutocompleteInput = ({
  value,
  onChange,
  options = [],
  placeholder = "Ketik nama unit...",
  loading = false,
  error = null,
  className = "",
  onSelect = () => {},
}) => {
  // Debug log
  console.log("AutocompleteInput options:", options);

  const [inputValue, setInputValue] = useState(value || "");
  const [isFocused, setIsFocused] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const wrapperRef = useRef(null);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Filter options based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter((option) =>
        option.label.toLowerCase().includes(inputValue.toLowerCase()),
      );
      setFilteredOptions(filtered);
    }
  }, [inputValue, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelect = (option) => {
    setInputValue(option.label);
    onSelect(option);
    setIsFocused(false);
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={`w-full p-2 bg-slate-800 border rounded-md text-white pr-10
            ${error ? "border-red-500" : "border-slate-700"}
            ${loading ? "opacity-70" : ""}`}
          disabled={loading}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <svg
              className="animate-spin h-4 w-4 text-slate-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
        )}
      </div>

      {isFocused && (
        <div className="absolute z-[9999] w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <div
                key={option.value || option.label || "all"}
                className="px-4 py-2 text-sm text-white hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 last:border-b-0 transition-colors duration-150"
                onClick={() => handleSelect(option)}
              >
                {option.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-slate-400 text-center">
              {loading
                ? "Memuat..."
                : inputValue
                  ? "Tidak ada hasil ditemukan"
                  : "Ketik untuk mencari unit"}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default AutocompleteInput;
