'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { CheckCircle2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { SummaryState } from '../domain/types';
import { Button } from '@/shared/components/ui/button';

interface StreamingSummaryProps {
  state: SummaryState;
  reset: () => void;
}

export function StreamingSummary({ state, reset }: StreamingSummaryProps) {
  const { summary, isStreaming, isComplete, tokensUsed, cost, model, error } = state;

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
            <Button variant="outline" onClick={() => reset()}>
              Retry
            </Button>
          </CardHeader>
        </Card>
      </motion.div>
    );
  }

  if (!isStreaming && !isComplete && !summary) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle>Summary</CardTitle>
              {isStreaming && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                </motion.div>
              )}
              {isComplete && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
            {isStreaming && (
              <Badge variant="secondary" className="animate-pulse">
                Streaming...
              </Badge>
            )}
          </div>
          <CardDescription>
            {isStreaming
              ? 'AI is generating your summary...'
              : isComplete
                ? 'Summary completed'
                : 'Summary preview'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isStreaming && !summary ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <div className="leading-relaxed">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            )}
          </div>

          <AnimatePresence>
            {isComplete && (tokensUsed || cost || model) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Separator />
                <div className="flex flex-wrap items-center gap-4 pt-4 text-sm text-muted-foreground">
                  {tokensUsed && (
                    <div>
                      <span className="font-medium">Tokens:</span> {tokensUsed.toLocaleString()}
                    </div>
                  )}
                  {cost !== undefined && (
                    <div>
                      <span className="font-medium">Cost:</span> ${cost.toFixed(6)}
                    </div>
                  )}
                  {model && (
                    <div>
                      <span className="font-medium">Model:</span>{' '}
                      <Badge variant="outline">{model}</Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

