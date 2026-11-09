import React, { useState, useRef, useEffect } from 'react';
import { MapPin, Search, Check, Globe } from 'lucide-react';
import { GeoLocation } from '../types';
import { IRISH_LOCATIONS, GLOBAL_LOCATIONS } from '../data/seedData';
import { useTheme } from '../context/ThemeContext';

interface LocationAutocompleteProps {
  currentLocation: GeoLocation;
  onLocationSelect: (loc: GeoLocation) => void;
  placeholder?: string;
  className?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  currentLocation,
  onLocationSelect,
  placeholder = 'Search town, city or country globally...',
  className = '',
}) => {
  const { isDark } = useTheme();
  const [query, setQuery] = useState(`${currentLocation.town}, ${currentLocation.county} (${currentLocation.country || 'Ireland'})`);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const allLocations = [...IRISH_LOCATIONS, ...GLOBAL_LOCATIONS];

  const filtered = allLocations.filter((l) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      l.town.toLowerCase().includes(q) ||
      l.county.toLowerCase().includes(q) ||
      (l.country && l.country.toLowerCase().includes(q))
    );
  }).slice(0, 25);

  useEffect(() => {
    setQuery(`${currentLocation.town}, ${currentLocation.county} (${currentLocation.country || 'Ireland'})`);
  }, [currentLocation]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-amber-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs focus:outline-none focus:border-amber-500 font-medium ${
            isDark ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-950 placeholder-slate-400'
          }`}
        />
        <Search className="absolute right-3.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>

      {isOpen && (
        <div className={`absolute left-0 right-0 mt-1.5 rounded-2xl border shadow-2xl z-50 max-h-64 overflow-y-auto divide-y ${
          isDark ? 'bg-slate-900 border-slate-700 divide-slate-800 text-white' : 'bg-white border-slate-200 divide-slate-100 text-slate-900'
        }`}>
          {filtered.length === 0 ? (
            <div className="p-3 text-xs text-slate-400 text-center">
              No matching global locations found. Try typing a country or major city.
            </div>
          ) : (
            filtered.map((loc, idx) => {
              const isSelected = loc.town === currentLocation.town && loc.county === currentLocation.county;
              return (
                <button
                  key={`loc-auto-${idx}-${loc.town}`}
                  type="button"
                  onClick={() => {
                    onLocationSelect(loc);
                    setQuery(`${loc.town}, ${loc.county} (${loc.country || 'Ireland'})`);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-500 font-bold'
                      : isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold">{loc.town}</span>, {loc.county}
                      <span className="text-[11px] text-slate-400 ml-1.5">({loc.country || 'Ireland'})</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
