'use client';

import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/shared/components/ui/chart';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { AnalyticsMetrics } from '@smart-summary/types';
import { format } from 'date-fns';

interface ChartsSectionProps {
  metrics: AnalyticsMetrics | null;
  loading: boolean;
}

const chartConfig: ChartConfig = {
  requests: {
    label: 'Requests',
    color: 'hsl(var(--primary))',
  },
  tokens: {
    label: 'Tokens',
    color: 'hsl(221.2 83.2% 53.3%)',
  },
  cost: {
    label: 'Cost',
    color: 'hsl(142.1 76.2% 36.3%)',
  },
};

export function ChartsSection({ metrics, loading }: ChartsSectionProps) {
  const dailyData = metrics?.requestsByDay || [];

  const formattedData = dailyData.map((item) => ({
    ...item,
    dateFormatted: format(new Date(item.date), 'MMM dd'),
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-0 bg-background/80 backdrop-blur-xl shadow-lg">
            <CardHeader>
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-xl" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (dailyData.length === 0) {
    return (
      <Card className="border-dashed border-2 border-border/50 bg-background/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Daily Metrics</CardTitle>
          <CardDescription className="text-base">No data available for the selected period</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 md:grid-cols-1 lg:grid-cols-3"
    >
      <motion.div variants={itemVariants} className="group relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative overflow-hidden border-0 bg-background/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Daily Requests
              </CardTitle>
              <CardDescription className="text-sm">Number of requests per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <LineChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="dateFormatted" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="group relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative overflow-hidden border-0 bg-background/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                Daily Tokens
              </CardTitle>
              <CardDescription className="text-sm">Tokens used per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <AreaChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="dateFormatted" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="tokensUsed"
                    stroke="hsl(221.2 83.2% 53.3%)"
                    fill="hsl(221.2 83.2% 53.3%)"
                    fillOpacity={0.3}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="group relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <Card className="relative overflow-hidden border-0 bg-background/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Daily Cost
              </CardTitle>
              <CardDescription className="text-sm">API cost per day</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig}>
                <BarChart data={formattedData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="dateFormatted" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="cost"
                    fill="hsl(142.1 76.2% 36.3%)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}

