'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { CheckCircle2, Sparkles, RefreshCw, Copy, Share2, Brain, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { SummaryState } from '../domain/types';
import { Button } from '@/shared/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

interface StreamingSummaryProps {
  state: SummaryState;
  reset: () => void;
}

export function StreamingSummary({ state, reset }: StreamingSummaryProps) {
  const { summary, isStreaming, isComplete, tokensUsed, cost, model, error } = state;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (summary) {
      try {
        await navigator.clipboard.writeText(summary);
        setIsCopied(true);
        toast.success('Summary copied to clipboard!');
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        // Clipboard API not available
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share && summary) {
      try {
        await navigator.share({
          title: 'AI Generated Summary',
          text: summary,
        });
      } catch (err) {
        // Fallback to copy
        void handleCopy();
      }
    } else {
      void handleCopy();
    }
  };

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        <Card className="border-destructive/50 bg-destructive/5 backdrop-blur">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/20">
                <RefreshCw className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Something went wrong</CardTitle>
                <CardDescription className="text-destructive/80">{error}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => reset()}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
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
      transition={{ duration: 0.4 }}
      className="relative"
    >
      {/* Background Glow Effect */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 blur-xl opacity-75 animate-pulse" />

      <Card className="relative overflow-hidden border-0 bg-background/90 backdrop-blur-xl shadow-2xl shadow-primary/10">
        {/* Animated Border */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/30 via-transparent to-primary/30" />
        <div className="absolute inset-[1px] rounded-2xl bg-background/95 backdrop-blur" />

        <div className="relative">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  {isStreaming ? (
                    <Brain className="h-6 w-6 text-primary" />
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  )}
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    AI Summary
                    {isStreaming && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Sparkles className="h-5 w-5 text-primary" />
                      </motion.div>
                    )}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {isStreaming
                      ? 'AI is crafting your intelligent summary...'
                      : isComplete
                        ? 'Summary generated successfully'
                        : 'Processing your content'}
                  </CardDescription>
                </div>
              </div>

              {isStreaming && (
                <Badge variant="secondary" className="animate-pulse bg-primary/10 text-primary border-primary/20">
                  <Zap className="h-3 w-3 mr-1" />
                  Live Processing
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary Content */}
            <div className="relative">
              {isStreaming && !summary ? (
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="text-sm text-muted-foreground ml-2">Analyzing content...</span>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-5/6" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="prose prose-lg dark:prose-invert max-w-none"
                >
                  <div className="rounded-xl border bg-gradient-to-br from-background/50 to-muted/30 p-6 backdrop-blur leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-4 last:mb-0 text-base leading-7">{children}</p>,
                        ul: ({ children }) => <ul className="mb-4 space-y-2 pl-6">{children}</ul>,
                        li: ({ children }) => <li className="text-base leading-6">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      }}
                    >
                      {summary}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action Buttons */}
            <AnimatePresence>
              {isComplete && summary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-wrap gap-3"
                >
                  <Button
                    onClick={() => void handleCopy()}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px] bg-background/50 backdrop-blur hover:bg-background/80"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => void handleShare()}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px] bg-background/50 backdrop-blur hover:bg-background/80"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>

                  <Button
                    onClick={reset}
                    variant="default"
                    size="sm"
                    className="flex-1 min-w-[140px] bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Summary
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Metadata */}
            <AnimatePresence>
              {isComplete && (tokensUsed || cost || model) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Separator className="my-4" />
                  <div className="rounded-xl bg-muted/30 p-4 backdrop-blur">
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Processing Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      {tokensUsed && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                          <span className="text-muted-foreground">Tokens Used</span>
                          <span className="font-medium">{tokensUsed.toLocaleString()}</span>
                        </div>
                      )}
                      {cost !== undefined && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                          <span className="text-muted-foreground">Cost</span>
                          <span className="font-medium">${cost.toFixed(6)}</span>
                        </div>
                      )}
                      {model && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                          <span className="text-muted-foreground">AI Model</span>
                          <Badge variant="outline" className="font-medium">{model}</Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

