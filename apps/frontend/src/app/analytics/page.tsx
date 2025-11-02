import { AppSidebar } from '@/shared/components/app-sidebar';

import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/shared/components/ui/sidebar';
import { AnalyticsDashboard } from '@/app/analytics/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-full flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Analytics Dashboard</h1>
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

