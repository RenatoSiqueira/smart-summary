'use client';

import { useState } from 'react';
import { AppSidebar } from '@/shared/components/AppSidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { SummarizeForm } from '@/app/summarize/components/SummarizeForm';
import { StreamingSummary } from '@/app/summarize/components/StreamingSummary';
import { useStreamingSummary } from '@/app/summarize/hooks/useStreamingSummary';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain } from 'lucide-react';

export default function HomePage() {
  const { state, startStreaming, reset } = useStreamingSummary();
  const [hasStarted, setHasStarted] = useState(false);

  const handleSubmit = (text: string) => {
    setHasStarted(true);
    startStreaming(text);
  };

  const handleReset = () => {
    reset();
    setHasStarted(false);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-screen flex-col overflow-hidden">
          {/* Enhanced Header */}
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 px-4 md:px-6">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm transition-shadow hover:shadow-md">
                <Brain className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Smart Summary
                </h1>
                <p className="sr-only">AI-powered text summarization application</p>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex flex-1 flex-col overflow-auto">
            <AnimatePresence mode="wait">
              {!hasStarted ? (
                <motion.div
                  key="hero-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-1 flex-col"
                >
                  {/* Enhanced Hero Section */}
                  <section
                    className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 px-4 pt-4"
                    aria-labelledby="hero-heading"
                  >
                    {/* Animated Background Elements */}
                    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
                      <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-pulse" />
                      <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-gradient-to-tr from-primary/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-gradient-to-r from-primary/5 to-transparent blur-3xl" />
                    </div>

                    <div className="relative mx-auto max-w-5xl">
                      {/* Badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mb-6 flex justify-center"
                      >
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-4 py-2 text-sm font-medium backdrop-blur-md shadow-sm">
                          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                          <span>AI-Powered Text Summarization</span>
                        </div>
                      </motion.div>

                      {/* Main Heading */}
                      <motion.h1
                        id="hero-heading"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="mb-6 text-center text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:mb-8"
                      >
                        Transform{' '}
                        <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                          Long Text
                        </span>{' '}
                        into{' '}
                        <span className="bg-gradient-to-r from-primary/60 via-primary/80 to-primary bg-clip-text text-transparent">
                          Smart Insights
                        </span>
                      </motion.h1>

                      {/* Subheading */}
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="mx-auto max-w-2xl text-center text-lg text-muted-foreground sm:text-xl"
                      >
                        Experience lightning-fast AI-powered text summarization with real-time streaming,
                        comprehensive analytics, and enterprise-grade security.
                      </motion.p>

                    </div>
                    <div className="mx-auto max-w-4xl pt-4 mb-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                      >
                        <h2 id="form-heading" className="sr-only">
                          Start summarizing your text
                        </h2>
                        <div id="summarize-form" className="scroll-mt-8">
                          <SummarizeForm
                            onSubmit={handleSubmit}
                            isStreaming={state.isStreaming}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </section>
                </motion.div>
              ) : (
                <motion.div
                  key="results-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-1 flex-col"
                >
                  {/* Results Section */}
                  <section className="flex flex-1 flex-col px-4 py-6 md:py-8" aria-label="Summary results">
                    <div className="mx-auto w-full max-w-4xl flex-1">
                      <StreamingSummary
                        state={state}
                        reset={handleReset}
                      />
                    </div>
                  </section>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
