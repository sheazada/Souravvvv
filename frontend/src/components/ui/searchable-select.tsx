'use client';

import { cn } from '@/lib/utils/cn';
import { useMemo, useState } from 'react';

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  emptyText = 'No matching options found.',
  disabled = false,
  allowCustomValue = false,
  allowClear = false,
  className,
}: {
  value?: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowCustomValue?: boolean;
  allowClear?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ''} ${option.value}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [options, search]);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 py-2 pr-16 text-left text-sm outline-none transition hover:border-slate-400 focus:border-cyan-500 disabled:cursor-not-allowed disabled:bg-slate-100"
      >
        <span className={selected || value ? 'text-slate-900' : 'text-slate-500'}>
          {selected ? selected.label : value || placeholder}
        </span>
        <span className="ml-3 text-xs text-slate-400">▼</span>
      </button>

      {allowClear && value ? (
        <button
          type="button"
          onClick={() => {
            onChange('');
            setOpen(false);
            setSearch('');
          }}
          disabled={disabled}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      ) : null}

      {open ? (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500"
          />

          <div className="max-h-64 overflow-auto">
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={cn(
                    'flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50',
                    option.value === value && 'bg-cyan-50 text-cyan-900',
                  )}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-slate-500">{option.description}</span>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="rounded-lg px-3 py-2 text-sm text-slate-500">{emptyText}</div>
            )}

            {allowCustomValue && search.trim() ? (
              <button
                type="button"
                onClick={() => {
                  onChange(search.trim());
                  setOpen(false);
                  setSearch('');
                }}
                className="mt-2 flex w-full flex-col rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">Use custom value</span>
                <span className="text-xs text-slate-500">{search.trim()}</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
