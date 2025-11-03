'use client';

import { useState } from 'react';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { CalendarIcon, X, Filter, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/shared/lib/utils';
import type { AnalyticsFilters } from '../domain/types';

interface DateRangeFilterProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onApply: () => void;
  onReset: () => void;
}

export function DateRangeFilter({
  filters,
  onFiltersChange,
  onApply,
  onReset,
}: DateRangeFilterProps) {
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const startDate = filters.startDate
    ? filters.startDate instanceof Date
      ? filters.startDate
      : new Date(filters.startDate)
    : undefined;

  const endDate = filters.endDate
    ? filters.endDate instanceof Date
      ? filters.endDate
      : new Date(filters.endDate)
    : undefined;

  const handleStartDateSelect = (date: Date | undefined) => {
    onFiltersChange({ ...filters, startDate: date });
    setStartDateOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    onFiltersChange({ ...filters, endDate: date });
    setEndDateOpen(false);
  };

  const hasActiveFilters =
    filters.startDate || filters.endDate;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Start Date
          </Label>
          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-11 border-2 bg-background/50 backdrop-blur hover:bg-background/80 transition-all duration-300 rounded-xl',
                  !startDate && 'text-muted-foreground border-border/50',
                  startDate && 'border-primary/50 bg-primary/5'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl border-2 shadow-2xl backdrop-blur" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  handleStartDateSelect(date as Date | undefined);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            End Date
          </Label>
          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal h-11 border-2 bg-background/50 backdrop-blur hover:bg-background/80 transition-all duration-300 rounded-xl',
                  !endDate && 'text-muted-foreground border-border/50',
                  endDate && 'border-primary/50 bg-primary/5'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick an end date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl border-2 shadow-2xl backdrop-blur" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => {
                  handleEndDateSelect(date as Date | undefined);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={onApply}
          className="flex-1 bg-gradient-to-r from-primary via-primary to-primary/90 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 text-primary-foreground font-semibold py-6 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/25 transition-all duration-300"
          size="lg"
        >
          <Filter className="h-4 w-4 -mr-1" />
          Apply Filters
        </Button>
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onReset}
            className="px-6 border-2 border-border/50 bg-background/50 backdrop-blur hover:bg-background/80 transition-all duration-300 rounded-xl"
            size="lg"
          >
            <X className="h-4 w-4 -mr-1" />
            Reset
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="rounded-xl border bg-muted/30 p-4 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/80 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Active Filters
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {startDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                From: {format(startDate, 'MMM dd, yyyy')}
              </span>
            )}
            {endDate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                To: {format(endDate, 'MMM dd, yyyy')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

