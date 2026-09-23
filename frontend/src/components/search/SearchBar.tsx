import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, CreditCard, Bell, Briefcase, User, Smartphone, Store } from 'lucide-react';
import { searchApi } from '../../services/searchApi';
import { AutocompleteSuggestion } from '../../types';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onSearch: (overrideQuery?: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  onSearch,
  isLoading = false,
  placeholder = 'Search by Transaction ID, Alert ID, Case ID, User ID, Device ID, Merchant, or text...',
}) => {
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsFetchingSuggestions(true);
        const data = await searchApi.getAutocomplete(value, 8);
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setActiveSuggestionIndex(-1);
      } catch (err) {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        const item = suggestions[activeSuggestionIndex];
        onChange(item.id);
        setShowDropdown(false);
        onSearch(item.id);
      } else {
        setShowDropdown(false);
        onSearch();
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSelectSuggestion = (item: AutocompleteSuggestion) => {
    onChange(item.id);
    setShowDropdown(false);
    onSearch(item.id);
  };

  const renderEntityIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      case 'alert':
        return <Bell className="w-4 h-4 text-amber-400" />;
      case 'case':
        return <Briefcase className="w-4 h-4 text-purple-400" />;
      case 'user':
        return <User className="w-4 h-4 text-blue-400" />;
      case 'device':
        return <Smartphone className="w-4 h-4 text-indigo-400" />;
      case 'merchant':
        return <Store className="w-4 h-4 text-rose-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          ) : (
            <Search className="w-5 h-5 text-slate-400" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          maxLength={150}
          className="w-full pl-11 pr-24 py-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 shadow-inner backdrop-blur-sm transition-all"
        />

        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setSuggestions([]);
                setShowDropdown(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSearch()}
            disabled={isLoading}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm shadow-cyan-600/30 transition-all flex items-center gap-1.5"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md animate-fadeIn"
        >
          <div className="px-3 py-2 bg-slate-800/60 border-b border-slate-700/60 text-xs font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span>Matching Identifiers & Entities</span>
            {isFetchingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
            {suggestions.map((item, idx) => (
              <button
                key={`${item.entity_type}-${item.id}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                  idx === activeSuggestionIndex ? 'bg-slate-800 text-cyan-400' : 'text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-800 rounded-md border border-slate-700/50">
                    {renderEntityIcon(item.entity_type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium font-mono text-slate-100">{item.id}</div>
                    {item.label !== item.id && (
                      <div className="text-xs text-slate-400">{item.label}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-800 border border-slate-700 text-slate-300 rounded">
                    {item.entity_type}
                  </span>
                  {item.subtext && (
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.subtext}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
