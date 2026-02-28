'use client';

import { useMemo, useState } from 'react';

import { SERVICES } from '@/lib/services';

interface FilterBarProps {
  totalCount: number;
  visibleCount: number;
  activeServices: string[];
  onToggleService: (serviceId: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onTonight: () => void;
  onShare: () => void;
}

const SORT_OPTIONS = [
  { value: 'best-match', label: 'Best Match' },
  { value: 'rating-desc', label: 'IMDb Rating ↓' },
  { value: 'year-desc', label: 'Year ↓' },
  { value: 'title-asc', label: 'Title A–Z' }
];

export default function FilterBar({
  totalCount,
  visibleCount,
  activeServices,
  onToggleService,
  sortBy,
  onSortChange,
  onTonight,
  onShare
}: FilterBarProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const currentSort = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Best Match',
    [sortBy]
  );

  return (
    <header className="filterBar">
      <div className="filterRow1">
        <h1>StreamList</h1>
        <div className="countAndShare">
          <p>Showing {visibleCount} of {totalCount}</p>
          <button type="button" className="shareButton" onClick={onShare} aria-label="Copy share link">
            ⤴
          </button>
        </div>
      </div>

      <div className="filterRow2">
        <div className="servicePills" role="group" aria-label="Streaming service filters">
          {SERVICES.map((service) => {
            const active = activeServices.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                className={`servicePill ${active ? 'active' : ''}`}
                onClick={() => onToggleService(service.id)}
                style={
                  active
                    ? {
                        borderColor: service.color,
                        color: service.color,
                        backgroundColor: `${service.color}1f`
                      }
                    : undefined
                }
              >
                {service.name}
              </button>
            );
          })}
          <button type="button" className="tonightButton" onClick={onTonight}>
            ⚡ Tonight
          </button>
        </div>

        <div className="sortWrap">
          <button type="button" className="sortTrigger" onClick={() => setOpen((prev) => !prev)}>
            {currentSort}
          </button>
          {open ? (
            <div className="sortMenu" role="menu">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`sortOption ${sortBy === option.value ? 'active' : ''}`}
                  onClick={() => {
                    onSortChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
