"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Layers,
  Cpu,
  CheckCircle2,
  Truck,
  Users2,
  Factory,
  UserCheck,
  TrendingUp,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  User,
  Settings as SettingsIcon,
  HelpCircle,
  MessageSquare,
  ChevronDown
} from "lucide-react";
import { logoutAction } from "@/app/actions/authActions";
import { SessionUser } from "@/lib/auth";
import { formatRole } from "@/lib/formatters";
import { NotificationItem } from "@/services/notificationService";
import GlobalSearch from "./GlobalSearch";

interface AppShellProps {
  user: SessionUser;
  notifications: NotificationItem[];
  children: React.ReactNode;
}

export default function AppShell({ user, notifications, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const isBuyer = user.role === "BUYER";

  const staffNavItems = [
    { name: "Overview", href: "/overview", icon: LayoutDashboard, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC", "INSPECTION_SUPERVISOR", "DISPATCH_OFFICER"] },
    { name: "Orders", href: "/orders", icon: ClipboardList, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"] },
    { name: "Yarn Store", href: "/yarn", icon: Layers, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR"] },
    { name: "Production", href: "/production", icon: Cpu, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC"] },
    { name: "Rolls & QC", href: "/rolls", icon: CheckCircle2, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "INSPECTION_SUPERVISOR"] },
    { name: "Dispatch & Invoices", href: "/dispatch", icon: Truck, roles: ["ADMINISTRATOR", "MANAGER", "DISPATCH_OFFICER"] },
    { name: "Buyers", href: "/buyers", icon: Users2, roles: ["ADMINISTRATOR", "MANAGER"] },
    { name: "Suppliers", href: "/suppliers", icon: Factory, roles: ["ADMINISTRATOR", "MANAGER"] },
    { name: "People", href: "/people", icon: UserCheck, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC", "INSPECTION_SUPERVISOR", "DISPATCH_OFFICER"] },
    { name: "Finance", href: "/finance", icon: TrendingUp, roles: ["ADMINISTRATOR"] },
    { name: "Help & Support", href: "/support", icon: MessageSquare, roles: ["ADMINISTRATOR", "MANAGER", "PRODUCTION_SUPERVISOR", "MECHANIC", "INSPECTION_SUPERVISOR", "DISPATCH_OFFICER"] },
  ];

  const buyerNavItems = [
    { name: "My Orders", href: "/buyer/orders", icon: ClipboardList },
    { name: "My Invoices", href: "/buyer/invoices", icon: Truck },
    { name: "Help & Support", href: "/support", icon: MessageSquare },
  ];

  const navItems = isBuyer 
    ? buyerNavItems 
    : staffNavItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--text-primary)]">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)] flex-shrink-0 z-30 border-r border-[var(--sidebar-border)] transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--sidebar-border)] flex flex-col items-center justify-center relative overflow-hidden min-h-[85px]">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'justify-between w-full'} transition-all`}>
            {!sidebarCollapsed ? (
              <>
                <Link href="/overview" className="text-xl font-bold tracking-tight text-[var(--sidebar-text)] flex items-center gap-2 animate-fade-in-up">
                  <span className="w-2.5 h-6 bg-[var(--primary)] rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.6)]"></span>
                  TEXFLOW
                </Link>
                <button 
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-1 rounded-md text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-secondary)] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="flex items-center justify-center p-2 rounded-md hover:bg-[var(--sidebar-secondary)] transition-colors mx-auto group"
                title="Expand Sidebar"
              >
                <div className="w-6 h-6 bg-[var(--primary)] rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.6)] group-hover:shadow-[0_0_15px_rgba(0,240,255,0.9)] transition-all"></div>
              </button>
            )}
          </div>
          {!sidebarCollapsed && (
            <span className="text-[11px] text-[var(--sidebar-text-secondary)] font-normal leading-tight self-start mt-2 animate-fade-in-up">
              Everest Textile Mills
            </span>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={false}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 pl-5 pr-3.5 py-2.5 text-sm font-medium rounded-md transition-all duration-300 group relative overflow-hidden ${
                  isActive
                    ? "text-[var(--sidebar-text)] bg-[var(--sidebar-secondary)] drop-shadow-sm"
                    : "text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-secondary)]"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[var(--primary-glow)] rounded-r-md animate-pulse-glow z-10 shadow-[0_0_10px_var(--primary-glow)]"></div>
                )}
                
                <Icon className={`w-5 h-5 flex-shrink-0 transition-all duration-300 ${isActive ? 'scale-110 text-[var(--primary-glow)] drop-shadow-[0_0_8px_var(--primary-glow)]' : 'group-hover:scale-110'}`} />
                {!sidebarCollapsed && <span className="whitespace-nowrap truncate tracking-wide font-bold">{item.name}</span>}
                
                {/* Subtle overlay for active state */}
                {isActive && <div className="absolute inset-0 bg-gradient-to-r from-[var(--border-highlight)] to-transparent pointer-events-none opacity-10"></div>}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-secondary)]">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-2 py-1.5`}>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-[var(--sidebar-text)] truncate">{user.name}</span>
                <span className="text-[11px] text-[var(--primary)] uppercase tracking-wider">{user.role}</span>
              </div>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 text-[var(--sidebar-text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--sidebar-border)] rounded-md transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 glass-panel border-b-0 border-b-[var(--border)] flex items-center justify-between px-4 lg:px-6 z-20 flex-shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Global Search (Staff only) */}
            {!isBuyer && <GlobalSearch />}
          </div>

          <div className="flex items-center gap-3">
            {/* Visibly labelled "Demo data" Badge (Section 9 requirement) */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[rgba(0,240,255,0.1)] text-[var(--primary)] border border-[var(--border-highlight)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse-glow"></span>
              Demo data
            </span>

            {/* Notifications Menu (Staff only) */}
            {!isBuyer && (
              <div className="relative">
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--primary)] hover:bg-[var(--surface)] rounded-md transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--critical)] animate-pulse"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--sidebar)] border border-[var(--sidebar-border)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 py-2 animate-fade-in-up">
                    <div className="px-4 py-2 border-b border-[var(--sidebar-border)] flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
                        Notifications ({notifications.length})
                      </span>
                      <button
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)]"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[var(--sidebar-border)]">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[var(--sidebar-text-secondary)]">
                          All clear! No pending issues or alerts.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => setNotifDropdownOpen(false)}
                            className="block p-3 hover:bg-[var(--sidebar-secondary)] transition-colors text-left"
                          >
                            <div className="flex items-start gap-2.5">
                              {n.severity === "CRITICAL" && (
                                <AlertCircle className="w-4 h-4 text-[var(--critical)] flex-shrink-0 mt-0.5" />
                              )}
                              {n.severity === "WARNING" && (
                                <AlertTriangle className="w-4 h-4 text-[var(--warning)] flex-shrink-0 mt-0.5" />
                              )}
                              {n.severity === "INFO" && (
                                <Info className="w-4 h-4 text-[var(--info)] flex-shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[var(--sidebar-text)] truncate">{n.title}</p>
                                <p className="text-[11px] text-[var(--sidebar-text-secondary)] line-clamp-2 mt-0.5">{n.description}</p>
                              </div>
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Interactive User Account Menu */}
            <div className="relative pl-2 border-l border-[var(--border)] hidden sm:block">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--surface)] transition-colors group"
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
              >
                <div className="w-8 h-8 rounded-full bg-[var(--sidebar-secondary)] border border-[var(--primary)] flex items-center justify-center text-[var(--primary)] font-bold text-xs uppercase shadow-[0_0_8px_rgba(0,240,255,0.2)] overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.name.substring(0, 2)
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{user.name.split(" ")[0]}</span>
                  <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{formatRole(user.role)}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors" />
              </button>

              {/* Account Dropdown Panel */}
              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[var(--sidebar)] border border-[var(--sidebar-border)] rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 py-1 animate-fade-in-up">
                  <div className="px-4 py-3 border-b border-[var(--sidebar-border)]">
                    <p className="text-sm font-bold text-[var(--sidebar-text)]">{user.name}</p>
                    <p className="text-xs text-[var(--sidebar-text-secondary)]">{user.email || "user@everest.com"}</p>
                  </div>
                  
                  <div className="py-1 border-b border-[var(--sidebar-border)]">
                    <Link
                      href="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-secondary)] transition-colors"
                    >
                      <User className="w-4 h-4" />
                      My Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-secondary)] transition-colors"
                    >
                      <SettingsIcon className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setAccountMenuOpen(false);
                        setNotifDropdownOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4" />
                        Notifications
                      </div>
                      {notifications.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--critical)] text-white font-bold">
                          {notifications.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <div className="py-1 border-b border-[var(--sidebar-border)]">
                    <button
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-secondary)] transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Help & Support
                    </button>
                  </div>

                  <div className="py-1">
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[var(--critical)] hover:text-[var(--critical)] hover:bg-[rgba(255,77,77,0.1)] transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex animate-fade-in-up">
            <div className="w-64 bg-[var(--sidebar)] h-full flex flex-col text-[var(--sidebar-text)] p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--sidebar-border)]">
                <span className="text-xl font-bold tracking-tight text-[var(--sidebar-text)] flex items-center gap-2">
                  <span className="w-2.5 h-6 bg-[var(--primary)] rounded-sm shadow-[0_0_10px_rgba(0,240,255,0.6)]"></span>
                  TEXFLOW
                </span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)]" />
                </button>
              </div>
              <nav className="flex-1 py-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-all duration-200 ${
                        isActive ? "bg-[var(--sidebar-secondary)] text-[var(--primary)] border-l-2 border-[var(--primary)]" : "text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-secondary)] hover:text-[var(--sidebar-text)]"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]' : ''}`} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <form action={logoutAction} className="pt-3 border-t border-[var(--sidebar-border)]">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--sidebar-text-secondary)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-border)] rounded-md transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
