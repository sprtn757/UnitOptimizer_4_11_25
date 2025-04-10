import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";

interface Option {
  value: string;
  label: string;
}

interface MobileSelectFieldProps {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}

/**
 * A special select field that works better on mobile by avoiding
 * the native dropdown and its associated scrolling issues
 */
export function MobileSelectField({
  id,
  label,
  options,
  value,
  onChange
}: MobileSelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");
  
  // Update the selected label when value changes
  useEffect(() => {
    const selected = options.find(opt => opt.value === value);
    setSelectedLabel(selected?.label || "");
  }, [value, options]);
  
  const handleOptionClick = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
      </Label>
      
      {/* Custom select trigger */}
      <button
        type="button"
        id={id}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background text-left flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-foreground" : "text-muted-foreground"}>
          {selectedLabel || "Select option"}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      
      {/* Options list - shown as a menu instead of a dropdown */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-md bg-background py-1 shadow-lg border border-input">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground ${
                value === option.value ? "bg-primary/10 text-primary font-medium" : ""
              }`}
              onClick={() => handleOptionClick(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
      
      {/* Hidden native select for form submission if needed */}
      <select 
        className="sr-only" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        aria-hidden="true"
      >
        <option value="" disabled>Select option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}