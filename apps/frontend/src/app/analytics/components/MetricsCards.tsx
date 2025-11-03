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
  Sparkles,
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
      gradient: 'from-blue-500/20 to-blue-600/10',
      iconColor: 'text-blue-500',
    },
    {
      title: 'Total Tokens',
      value: metrics?.totalTokensUsed ?? 0,
      description: 'Tokens processed',
      icon: Zap,
      format: (val: number) => val.toLocaleString(),
      gradient: 'from-yellow-500/20 to-yellow-600/10',
      iconColor: 'text-yellow-500',
    },
    {
      title: 'Total Cost',
      value: metrics?.totalCost ?? 0,
      description: 'Total API cost',
      icon: DollarSign,
      format: (val: number) => `$${val.toFixed(6)}`,
      gradient: 'from-green-500/20 to-green-600/10',
      iconColor: 'text-green-500',
    },
    {
      title: 'Avg Tokens/Request',
      value: metrics?.averageTokensPerRequest ?? 0,
      description: 'Average tokens per request',
      icon: TrendingUp,
      format: (val: number) => val.toLocaleString(),
      gradient: 'from-purple-500/20 to-purple-600/10',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Avg Cost/Request',
      value: metrics?.averageCostPerRequest ?? 0,
      description: 'Average cost per request',
      icon: TrendingDown,
      format: (val: number) => `$${val.toFixed(6)}`,
      gradient: 'from-pink-500/20 to-pink-600/10',
      iconColor: 'text-pink-500',
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
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            variants={itemVariants}
            className="group relative"
          >
            {/* Background Glow Effect */}
            <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br ${card.gradient} blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <Card className="relative overflow-hidden border-0 bg-background/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300 group">
              {/* Animated Border */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="absolute inset-[2px] rounded-lg bg-background/95 backdrop-blur" />

              <div className="relative">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle className="text-sm font-semibold text-foreground/90">
                    {card.title}
                  </CardTitle>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-10 w-32 rounded-lg" />
                      <Skeleton className="h-4 w-40 rounded" />
                    </div>
                  ) : (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent"
                      >
                        {card.format(card.value)}
                      </motion.div>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3 w-3 opacity-60" />
                        {card.description}
                      </p>
                    </>
                  )}
                </CardContent>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

