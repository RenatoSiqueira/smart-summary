import { AppSidebar } from '@/shared/components/app-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { AnalyticsDashboard } from '@/app/analytics/components/AnalyticsDashboard';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-full flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <BarChart3 className="h-4 w-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:p-6">
            <div className="mx-auto w-full max-w-7xl">
              <AnalyticsDashboard />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

