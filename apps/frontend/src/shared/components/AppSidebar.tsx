'use client';

import * as React from 'react';
import { FileTextIcon, BarChartIcon, Sparkles, Brain } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/components/ui/sidebar';
import Link from 'next/link';
import { ThemeSelector } from '@/shared/components/ThemeSelector';
import { motion } from 'framer-motion';

const navItems = [
  {
    title: 'Summarize',
    url: '/',
    icon: FileTextIcon,
    description: 'Transform text with AI',
  },
  {
    title: 'Analytics',
    url: '/analytics',
    icon: BarChartIcon,
    description: 'Usage insights & metrics',
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border bg-gradient-to-br from-sidebar-background to-sidebar-background/95">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="group hover:bg-sidebar-accent/50 transition-colors duration-300">
              <Link href="/">
                <motion.div
                  className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 rotate-12"
                  whileTap={{ scale: 0.95 }}
                >
                  <Brain className="size-5 text-primary-foreground" />
                </motion.div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold text-lg bg-gradient-to-r from-sidebar-foreground to-sidebar-foreground/80 bg-clip-text">
                    Smart Summary
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60 font-medium">
                    AI-Powered Intelligence
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="space-y-1">
          {navItems.map((item, index) => (
            <SidebarMenuItem key={item.title}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  className="group relative overflow-hidden rounded-xl p-3 transition-all duration-300 hover:bg-sidebar-accent/80 data-[active=true]:bg-gradient-to-r data-[active=true]:from-primary/20 data-[active=true]:to-primary/10 data-[active=true]:border data-[active=true]:border-primary/20 py-6"
                >
                  <Link href={item.url}>
                    {/* Active indicator */}
                    {pathname === item.url && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}

                    <div className="relative flex items-center gap-3 w-full">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${pathname === item.url
                        ? 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary'
                        : 'bg-sidebar-accent/30 text-sidebar-foreground/70 group-hover:bg-sidebar-accent/50 group-hover:text-sidebar-foreground'
                        }`}>
                        <item.icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-sm transition-colors duration-300 ${pathname === item.url ? 'text-primary' : 'text-sidebar-foreground group-hover:text-sidebar-foreground'
                          }`}>
                          {item.title}
                        </div>
                        <div className="text-xs text-sidebar-foreground/60 truncate">
                          {item.description}
                        </div>
                      </div>

                      {pathname === item.url && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, delay: 0.1 }}
                          className="h-2 w-2 rounded-full bg-primary"
                        />
                      )}
                    </div>
                  </Link>
                </SidebarMenuButton>
              </motion.div>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        {/* Feature Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 mx-2"
        >
          <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4 backdrop-blur">
            <div className="absolute top-2 right-2">
              <Sparkles className="h-4 w-4 text-primary/60" />
            </div>
            <h3 className="font-semibold text-sm text-sidebar-foreground mb-2">
              ✨ AI-Powered
            </h3>
            <p className="text-xs text-sidebar-foreground/70 leading-relaxed">
              Experience lightning-fast text summarization with advanced AI models and real-time streaming.
            </p>
          </div>
        </motion.div>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border bg-gradient-to-t from-sidebar-background/95 to-sidebar-background p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-sidebar-foreground/60">
            <div className="font-medium">Smart Summary v1.0</div>
            <div>Powered by AI</div>
          </div>
          <ThemeSelector />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
