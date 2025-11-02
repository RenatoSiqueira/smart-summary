'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { MetricsCards } from './MetricsCards';
import { ChartsSection } from './ChartsSection';
import { DateRangeFilter } from './DateRangeFilter';
import { useAnalytics } from '../hooks/useAnalytics';
import type { AnalyticsFilters } from '../domain/types';

export function AnalyticsDashboard() {
  const { metrics, loading, error, filters, fetchAnalytics, refetch } = useAnalytics({
    autoFetch: true,
  });

  const [localFilters, setLocalFilters] = useState<AnalyticsFilters>(filters);

  const currentMetrics = metrics;
  const currentLoading = loading;
  const currentError = error;

  const handleApplyFilters = () => {
    void fetchAnalytics(localFilters);
  };

  const handleResetFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    void fetchAnalytics(emptyFilters);
  };

  const handleFiltersChange = (newFilters: typeof localFilters) => {
    setLocalFilters(newFilters);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter analytics by date range and client IP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DateRangeFilter
            filters={localFilters}
            onFiltersChange={handleFiltersChange}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
          />
        </CardContent>
      </Card>

      {currentError && (
        <Alert variant="destructive">
          <AlertCircle className="h-8 w-8" />
          <AlertDescription className="flex items-center justify-between ml-2">
            <span>{currentError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 -mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {currentLoading && !currentMetrics && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {!currentError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <MetricsCards metrics={currentMetrics} loading={currentLoading} />
        </motion.div>
      )}

      {!currentError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ChartsSection metrics={currentMetrics} loading={currentLoading} />
        </motion.div>
      )}

      {!currentLoading && !currentError && currentMetrics && currentMetrics.totalRequests === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <CardTitle className="mb-2">No Data Available</CardTitle>
            <CardDescription>
              No summary requests found for the selected filters. Try adjusting your date range or filters.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

