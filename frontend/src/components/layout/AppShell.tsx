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
} from "lucide-react";
import { logoutAction } from "@/app/actions/authActions";
import { SessionUser } from "@/lib/auth";
import { NotificationItem } from "@/services/notificationService";

interface AppShellProps {
  user: SessionUser;
  notifications: NotificationItem[];
  children: React.ReactNode;
}

export default function AppShell({ user, notifications, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [rollSearchQuery, setRollSearchQuery] = useState("");

  const handleRollSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = rollSearchQuery.trim();
    if (query) {
      router.push(`/rolls?search=${encodeURIComponent(query)}`);
      setRollSearchQuery("");
    }
  };

  const isBuyer = user.role === "BUYER";

  const staffNavItems = [
    { name: "Overview", href: "/overview", icon: LayoutDashboard },
    { name: "Orders", href: "/orders", icon: ClipboardList },
    { name: "Yarn Store", href: "/yarn", icon: Layers },
    { name: "Production", href: "/production", icon: Cpu },
    { name: "Rolls & QC", href: "/rolls", icon: CheckCircle2 },
    { name: "Dispatch & Invoices", href: "/dispatch", icon: Truck },
    { name: "Buyers", href: "/buyers", icon: Users2 },
    { name: "Suppliers", href: "/suppliers", icon: Factory },
    { name: "People", href: "/people", icon: UserCheck },
    ...(user.role === "OWNER"
      ? [{ name: "Finance", href: "/finance", icon: TrendingUp }]
      : []),
  ];

  const buyerNavItems = [
    { name: "My Orders", href: "/buyer/orders", icon: ClipboardList },
    { name: "My Invoices", href: "/buyer/invoices", icon: Truck },
  ];

  const navItems = isBuyer ? buyerNavItems : staffNavItems;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F5]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#172D38] text-white flex-shrink-0 z-30 shadow-md">
        {/* Brand Header */}
        <div className="p-5 border-b border-[#203B46] flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-6 bg-[#176B63] rounded-sm"></span>
              TEXFLOW
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded bg-[#203B46] text-[#A3B899]">
              v2.2
            </span>
          </div>
          <span className="text-[11px] text-[#8EA0A8] font-normal leading-tight">
            Everest Textile Mills
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-[#176B63] text-white shadow-sm"
                    : "text-[#B3C0C6] hover:bg-[#203B46] hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-90" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-[#203B46] bg-[#142630]">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate">{user.name}</span>
              <span className="text-[11px] text-[#8EA0A8] uppercase tracking-wider">{user.role}</span>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="p-1.5 text-[#8EA0A8] hover:text-white hover:bg-[#203B46] rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#DCE3E1] flex items-center justify-between px-4 lg:px-6 z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#617078] hover:text-[#202B32] rounded-md"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Quick Roll Search (Staff only) */}
            {!isBuyer && (
              <form onSubmit={handleRollSearch} className="relative hidden sm:block w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#617078]" />
                <input
                  type="text"
                  placeholder="Find roll passport (e.g. ROLL-0005)..."
                  value={rollSearchQuery}
                  onChange={(e) => setRollSearchQuery(e.target.value)}
                  className="w-full text-xs font-mono-id bg-[#F4F6F5] border border-[#DCE3E1] rounded-md pl-9 pr-3 py-1.5 text-[#202B32] focus:outline-none focus:border-[#176B63] focus:bg-white transition-all"
                />
              </form>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Visibly labelled "Demo data" Badge (Section 9 requirement) */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EBF3F1] text-[#176B63] border border-[#C5DDD7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#176B63]"></span>
              Demo data
            </span>

            {/* Notifications Menu (Staff only) */}
            {!isBuyer && (
              <div className="relative">
                <button
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  className="relative p-2 text-[#617078] hover:text-[#202B32] hover:bg-[#F4F6F5] rounded-md transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#B44545]"></span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#DCE3E1] rounded-lg shadow-xl z-50 py-2">
                    <div className="px-4 py-2 border-b border-[#DCE3E1] flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#202B32]">
                        Notifications ({notifications.length})
                      </span>
                      <button
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs text-[#617078] hover:text-[#202B32]"
                      >
                        Close
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#F4F6F5]">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#617078]">
                          All clear! No pending issues or alerts.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <Link
                            key={n.id}
                            href={n.link}
                            onClick={() => setNotifDropdownOpen(false)}
                            className="block p-3 hover:bg-[#F9FAFA] transition-colors text-left"
                          >
                            <div className="flex items-start gap-2.5">
                              {n.severity === "CRITICAL" && (
                                <AlertCircle className="w-4 h-4 text-[#B44545] flex-shrink-0 mt-0.5" />
                              )}
                              {n.severity === "WARNING" && (
                                <AlertTriangle className="w-4 h-4 text-[#A86F1F] flex-shrink-0 mt-0.5" />
                              )}
                              {n.severity === "INFO" && (
                                <Info className="w-4 h-4 text-[#54758A] flex-shrink-0 mt-0.5" />
                              )}
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#202B32] truncate">{n.title}</p>
                                <p className="text-[11px] text-[#617078] line-clamp-2 mt-0.5">{n.description}</p>
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

            {/* User role pill */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#DCE3E1]">
              <span className="text-xs font-medium text-[#202B32]">{user.name.split(" ")[0]}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F4F6F5] text-[#617078] border border-[#DCE3E1]">
                {user.role}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50 flex">
            <div className="w-64 bg-[#172D38] h-full flex flex-col text-white p-4">
              <div className="flex items-center justify-between pb-4 border-b border-[#203B46]">
                <span className="font-bold text-lg">TEXFLOW</span>
                <button onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-[#8EA0A8]" />
                </button>
              </div>
              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm ${
                        isActive ? "bg-[#176B63] text-white" : "text-[#B3C0C6] hover:bg-[#203B46]"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
              <form action={logoutAction} className="pt-3 border-t border-[#203B46]">
                <button
                  type="submit"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#B3C0C6] hover:text-white"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
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
