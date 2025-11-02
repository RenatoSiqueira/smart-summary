'use client';

import { useState } from 'react';
import { AppSidebar } from '@/shared/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { SummarizeForm } from '@/app/summarize/components/SummarizeForm';
import { StreamingSummary } from '@/app/summarize/components/StreamingSummary';
import { useStreamingSummary } from '@/app/summarize/hooks/useStreamingSummary';

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
        <div className="flex h-full flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Summarize Text</h1>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:p-6">
            <div className="mx-auto w-full max-w-4xl space-y-6">
              {!hasStarted && (
                <SummarizeForm
                  onSubmit={handleSubmit}
                  isStreaming={state.isStreaming}
                />
              )}

              {hasStarted && (
                <StreamingSummary state={state} />
              )}

              {state.isComplete && (
                <div className="flex justify-end">
                  <button
                    onClick={handleReset}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Summarize another text
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
