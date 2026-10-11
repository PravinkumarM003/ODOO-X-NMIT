"use client";

import React, { useState, useEffect } from "react";
import { Settings, Moon, Sun, Monitor, Lock, Bell, LayoutTemplate, Shield, AlertCircle, CheckCircle, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { updatePasswordAction } from "@/app/actions/userActions";
import { formatRole } from "@/lib/formatters";

interface SettingsClientProps {
  user: any;
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("appearance");

  // Form states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await updatePasswordAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Password updated successfully");
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  if (!mounted) return null; // Avoid hydration mismatch

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
          <Settings className="w-6 h-6 text-[var(--primary)]" />
          Settings
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 glass-panel rounded-xl p-3 flex-shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("appearance")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === "appearance" ? "bg-[var(--sidebar-secondary)] text-[var(--primary)] shadow-[0_0_8px_rgba(0,240,255,0.2)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Sun className="w-4 h-4" />
            Appearance
          </button>
          
          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === "security" ? "bg-[var(--sidebar-secondary)] text-[var(--primary)] shadow-[0_0_8px_rgba(0,240,255,0.2)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Lock className="w-4 h-4" />
            Security
          </button>
          
          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === "notifications" ? "bg-[var(--sidebar-secondary)] text-[var(--primary)] shadow-[0_0_8px_rgba(0,240,255,0.2)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Bell className="w-4 h-4" />
            Notifications
          </button>

          <button
            onClick={() => setActiveTab("preferences")}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-all ${
              activeTab === "preferences" ? "bg-[var(--sidebar-secondary)] text-[var(--primary)] shadow-[0_0_8px_rgba(0,240,255,0.2)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
            }`}
          >
            <LayoutTemplate className="w-4 h-4" />
            Preferences
          </button>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 min-w-0">
          
          {/* APPEARANCE TAB */}
          {activeTab === "appearance" && (
            <div className="glass-panel rounded-xl p-6 animate-fade-in-up">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Interface Theme</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Customize the look and feel of TexFlow. The premium industrial dark theme is recommended for manufacturing floors.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setTheme("light")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    theme === "light" ? "border-[var(--primary)] bg-[var(--sidebar-secondary)] shadow-[0_0_15px_rgba(0,240,255,0.3)]" : "border-[var(--border)] hover:border-[var(--text-secondary)]"
                  }`}
                >
                  <Sun className={`w-8 h-8 ${theme === "light" ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`} />
                  <span className={`text-sm font-bold ${theme === "light" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>Light Mode</span>
                </button>

                <button
                  onClick={() => setTheme("dark")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    theme === "dark" ? "border-[var(--primary)] bg-[var(--sidebar-secondary)] shadow-[0_0_15px_rgba(0,240,255,0.3)]" : "border-[var(--border)] hover:border-[var(--text-secondary)]"
                  }`}
                >
                  <Moon className={`w-8 h-8 ${theme === "dark" ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`} />
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>Dark Mode</span>
                </button>

                <button
                  onClick={() => setTheme("system")}
                  className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    theme === "system" ? "border-[var(--primary)] bg-[var(--sidebar-secondary)] shadow-[0_0_15px_rgba(0,240,255,0.3)]" : "border-[var(--border)] hover:border-[var(--text-secondary)]"
                  }`}
                >
                  <Monitor className={`w-8 h-8 ${theme === "system" ? "text-[var(--primary)]" : "text-[var(--text-secondary)]"}`} />
                  <span className={`text-sm font-bold ${theme === "system" ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>System</span>
                </button>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="glass-panel rounded-xl p-6 animate-fade-in-up">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Security & Authentication</h2>
              
              {errorMsg && (
                <div className="mb-6 p-4 bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded-md text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-[rgba(0,230,118,0.1)] border border-[var(--success)] text-[var(--success)] rounded-md text-sm flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="border border-[var(--border)] rounded-lg p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[rgba(0,240,255,0.1)] flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Active Session</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 mb-2">
                      You are currently logged in as {user.email}. Role: {formatRole(user.role)}.
                    </p>
                    <span className="inline-block px-2 py-1 rounded bg-[rgba(0,230,118,0.1)] text-[var(--success)] text-[10px] font-bold uppercase tracking-wider">
                      Secure Connection
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Change Password</h3>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Current Password</label>
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    required
                    minLength={6}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm New Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    minLength={6}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-all"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-semibold bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary-hover)] rounded-md transition-all active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.4)] disabled:opacity-50"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === "notifications" && (
            <div className="glass-panel rounded-xl p-6 animate-fade-in-up">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Notification Preferences</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Configure which alerts you receive in the application. Note: Critical systemic alerts cannot be disabled.
              </p>
              
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg bg-[var(--sidebar-secondary)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Production Breakdowns</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Receive alerts when a loom or dyeing vat goes offline.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg bg-[var(--sidebar-secondary)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Yarn Low Stock Warnings</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Get notified when yarn drops below the reorder threshold.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg opacity-60">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Email Daily Digest (Not Supported)</h3>
                    <p className="text-xs text-[var(--text-secondary)]">The email gateway backend module is currently unavailable.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-not-allowed">
                    <input type="checkbox" disabled className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--border)] rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--text-secondary)] after:rounded-full after:h-5 after:w-5"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* PREFERENCES TAB */}
          {activeTab === "preferences" && (
            <div className="glass-panel rounded-xl p-6 animate-fade-in-up">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Display Preferences</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">
                Adjust the user interface for your comfort. These preferences apply locally.
              </p>
              
              <div className="space-y-4 max-w-2xl">
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg bg-[var(--sidebar-secondary)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Compact Tables</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Reduce padding in data grids to show more information.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg bg-[var(--sidebar-secondary)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">Reduced Motion</h3>
                    <p className="text-xs text-[var(--text-secondary)]">Disable micro-animations and page transitions.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
