'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';
import type { AnalyticsMetrics } from '@smart-summary/types';
import {
  FileText,
  Zap,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface MetricsCardsProps {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
}

export function MetricsCards({ metrics, loading }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total Requests',
      value: metrics?.totalRequests ?? 0,
      description: 'Total summarization requests',
      icon: FileText,
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Total Tokens',
      value: metrics?.totalTokensUsed ?? 0,
      description: 'Tokens processed',
      icon: Zap,
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Total Cost',
      value: metrics?.totalCost ?? 0,
      description: 'Total API cost',
      icon: DollarSign,
      format: (val: number) => `$${val.toFixed(6)}`,
    },
    {
      title: 'Avg Tokens/Request',
      value: metrics?.averageTokensPerRequest ?? 0,
      description: 'Average tokens per request',
      icon: TrendingUp,
      format: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Avg Cost/Request',
      value: metrics?.averageCostPerRequest ?? 0,
      description: 'Average cost per request',
      icon: TrendingDown,
      format: (val: number) => `$${val.toFixed(6)}`,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div key={card.title} variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {card.format(card.value)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {card.description}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

