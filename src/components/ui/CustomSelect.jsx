import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Pilih opsi',
  disabled = false,
  label = '',
  id = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || {};
  const displayValue = selectedOption.label || placeholder;

  return (
    <div className="relative w-full" ref={selectRef}>
      {label && (
        <Label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1">
          {label}
        </Label>
      )}
      <div 
        className={cn(
          "flex items-center justify-between w-full p-2 border rounded-md cursor-pointer",
          "bg-slate-800 border-slate-700 text-white",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        id={id}
      >
        <div className="flex items-center">
          <Filter className="w-4 h-4 mr-2 text-slate-400" />
          <span className="truncate">{displayValue}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 ml-2" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-2" />
        )}
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-lg">
          <div className="py-1 max-h-60 overflow-auto">
            {options.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "px-4 py-2 text-sm cursor-pointer hover:bg-slate-700",
                  value === option.value && "bg-slate-700"
                )}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
