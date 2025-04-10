import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  className?: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  isActive: boolean;
}

interface RecentProject {
  id: string;
  name: string;
  color: string;
}

export function Sidebar({ className, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [location] = useLocation();

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      ),
      href: "/",
      isActive: location === "/",
    },
    {
      label: "New Analysis",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
        </svg>
      ),
      href: "/new",
      isActive: location === "/new",
    },
    {
      label: "Past Reports",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm1 2a1 1 0 000 2h6a1 1 0 100-2H7zm6 7a1 1 0 011 1v3a1 1 0 11-2 0v-3a1 1 0 011-1zm-3 3a1 1 0 100 2h.01a1 1 0 100-2H10zm-4 1a1 1 0 011-1h.01a1 1 0 110 2H7a1 1 0 01-1-1zm1-4a1 1 0 100 2h.01a1 1 0 100-2H7zm2 1a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm4-4a1 1 0 100 2h.01a1 1 0 100-2H13zM9 9a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM7 8a1 1 0 000 2h.01a1 1 0 000-2H7z" clipRule="evenodd" />
        </svg>
      ),
      href: "/reports",
      isActive: location === "/reports",
    },
    {
      label: "Help Center",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      href: "/help",
      isActive: location === "/help",
    },
  ];

  const recentProjects: RecentProject[] = [
    { id: "1", name: "6th Grade Science - Solar System", color: "bg-accent" },
    { id: "2", name: "3rd Grade Math - Fractions", color: "bg-secondary" },
    { id: "3", name: "9th Grade English - Poetry", color: "bg-primary" },
  ];

  return (
    <>
      <aside
        className={cn(
          "w-64 bg-white shadow-md z-10 flex-shrink-0 transition-all duration-300 ease-in-out flex flex-col",
          isMobileOpen ? "fixed inset-0 z-50 translate-x-0" : "hidden md:flex",
          className
        )}
      >
        <div className="p-4 border-b border-neutral-200 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.666 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            <h1 className="text-lg font-semibold text-primary">Unit Optimizer</h1>
          </div>
        </div>

        <div className="overflow-y-auto scrollbar-thin flex-1">
          <div className="p-4">
            <p className="text-xs uppercase font-semibold text-neutral-500 mb-2">Menu</p>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-lg transition-colors cursor-pointer",
                      item.isActive
                        ? "bg-primary-light/10 text-primary font-medium"
                        : "text-neutral-600 hover:bg-neutral-100"
                    )}
                    onClick={isMobileOpen ? onMobileClose : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
            </nav>

            <Separator className="my-4" />

            <p className="text-xs uppercase font-semibold text-neutral-500 mt-6 mb-2">Recent Projects</p>
            <nav className="space-y-1">
              {recentProjects.map((project) => (
                <Link key={project.id} href={`/project/${project.id}`}>
                  <div
                    className="flex items-center space-x-2 p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                    onClick={isMobileOpen ? onMobileClose : undefined}
                  >
                    <span className={`w-2 h-2 rounded-full ${project.color}`} />
                    <span className="text-sm truncate">{project.name}</span>
                  </div>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
          onClick={onMobileClose}
        />
      )}
    </>
  );
}
