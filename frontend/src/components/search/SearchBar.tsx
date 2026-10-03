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
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'alert':
        return <Bell className="w-4 h-4 text-amber-500" />;
      case 'case':
        return <Briefcase className="w-4 h-4 text-purple-500" />;
      case 'user':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'device':
        return <Smartphone className="w-4 h-4 text-indigo-500" />;
      case 'merchant':
        return <Store className="w-4 h-4 text-rose-500" />;
      default:
        return <Search className="w-4 h-4 text-soc-muted" />;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-soc-muted">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          ) : (
            <Search className="w-5 h-5 text-soc-muted" />
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
          className="w-full pl-11 pr-24 py-3.5 bg-soc-card border border-soc-border rounded-xl text-soc-foreground placeholder:text-soc-muted text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-sm backdrop-blur-sm transition-all"
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
              className="p-1 text-soc-muted hover:text-soc-foreground rounded-lg hover:bg-soc-surface transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSearch()}
            disabled={isLoading}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-soc-card border border-soc-border rounded-xl shadow-xl overflow-hidden backdrop-blur-md animate-fadeIn"
        >
          <div className="px-3.5 py-2 bg-soc-surface border-b border-soc-border text-xs font-semibold text-soc-muted uppercase tracking-wider flex justify-between items-center">
            <span>Matching Identifiers & Entities</span>
            {isFetchingSuggestions && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y divide-soc-border">
            {suggestions.map((item, idx) => (
              <button
                key={`${item.entity_type}-${item.id}-${idx}`}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-soc-surface transition-colors ${
                  idx === activeSuggestionIndex ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold' : 'text-soc-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-soc-surface rounded-md border border-soc-border">
                    {renderEntityIcon(item.entity_type)}
                  </div>
                  <div>
                    <div className="text-sm font-medium font-mono text-soc-foreground">{item.id}</div>
                    {item.label !== item.id && (
                      <div className="text-xs text-soc-muted">{item.label}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-soc-surface border border-soc-border text-soc-muted rounded">
                    {item.entity_type}
                  </span>
                  {item.subtext && (
                    <div className="text-[11px] text-soc-muted mt-0.5">{item.subtext}</div>
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
