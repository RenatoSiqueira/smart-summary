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
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-background via-background to-primary/5 p-8 backdrop-blur"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground text-lg">
            Track your usage, analyze patterns, and optimize your AI summarization workflow
          </p>
        </div>
      </motion.div>

      {/* Filters Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative"
      >
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-xl opacity-50" />
        <Card className="relative overflow-hidden border-0 bg-background/80 backdrop-blur-xl shadow-2xl shadow-primary/5">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <AlertCircle className="h-5 w-5 text-primary" />
                  </motion.div>
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Filter Analytics</CardTitle>
                  <CardDescription className="text-base mt-1">
                    Filter analytics by date range and client IP
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DateRangeFilter
                filters={localFilters}
                onFiltersChange={handleFiltersChange}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
              />
            </CardContent>
          </div>
        </Card>
      </motion.div>

      {/* Error Alert */}
      {currentError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Alert variant="destructive" className="border-destructive/50 bg-destructive/5 backdrop-blur">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="flex items-center justify-between ml-2">
              <span className="font-medium">{currentError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetch();
                }}
                className="ml-4 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="h-4 w-4 -mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Loading State */}
      {currentLoading && !currentMetrics && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-12"
        >
          <LoadingSpinner size="lg" />
        </motion.div>
      )}

      {/* Metrics Cards */}
      {!currentError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <MetricsCards metrics={currentMetrics} loading={currentLoading} />
        </motion.div>
      )}

      {/* Charts Section */}
      {!currentError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <ChartsSection metrics={currentMetrics} loading={currentLoading} />
        </motion.div>
      )}

      {/* Empty State */}
      {!currentLoading && !currentError && currentMetrics && currentMetrics.totalRequests === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-dashed border-2 border-border/50 bg-background/50 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mb-6">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="mb-2 text-xl">No Data Available</CardTitle>
              <CardDescription className="text-center max-w-md">
                No summary requests found for the selected filters. Try adjusting your date range or filters.
              </CardDescription>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

