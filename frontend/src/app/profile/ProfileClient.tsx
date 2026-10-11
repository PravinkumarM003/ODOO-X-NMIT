"use client";

import React, { useState } from "react";
import { User, Mail, Shield, Save, X, CheckCircle, AlertCircle, Camera, Loader2 } from "lucide-react";
import { updateProfileAction, uploadAvatarAction } from "@/app/actions/userActions";
import { formatRole } from "@/lib/formatters";

interface ProfileClientProps {
  user: any;
}

export default function ProfileClient({ user }: ProfileClientProps) {
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData(e.currentTarget);
    const res = await updateProfileAction(formData);

    setLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Profile updated successfully");
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setAvatarLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const formData = new FormData();
    formData.append("file", file);
    
    const res = await uploadAvatarAction(formData);
    
    setAvatarLoading(false);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg("Profile photo updated successfully. Changes will apply immediately.");
      setTimeout(() => setSuccessMsg(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
          <User className="w-6 h-6 text-[var(--primary)]" />
          My Profile
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 bg-[rgba(255,77,77,0.1)] border border-[rgba(255,77,77,0.3)] text-[var(--critical)] rounded-md text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-[rgba(0,230,118,0.1)] border border-[var(--success)] text-[var(--success)] rounded-md text-sm flex items-start gap-2 animate-fade-in-up">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Summary */}
        <div className="col-span-1 space-y-6">
          <div className="glass-panel rounded-xl p-6 flex flex-col items-center text-center relative">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/jpeg, image/png, image/webp"
              className="hidden" 
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarLoading}
              className="relative w-24 h-24 rounded-full bg-[var(--sidebar-secondary)] border-2 border-[var(--primary)] shadow-[0_0_15px_rgba(0,240,255,0.3)] flex items-center justify-center text-3xl font-bold text-[var(--primary)] uppercase mb-4 overflow-hidden group transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {avatarLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : user.avatarUrl ? (
                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                user.name.substring(0, 2)
              )}
              
              {!avatarLoading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </button>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name}</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{user.email}</p>
            
            <div className="mt-4 px-3 py-1 rounded bg-[var(--sidebar-secondary)] border border-[var(--border)] text-[var(--primary)] font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_8px_rgba(0,240,255,0.2)]">
              <Shield className="w-3 h-3" />
              {formatRole(user.role)}
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 border-b border-[var(--border)] pb-2">
              Personal Information
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    defaultValue={user.name}
                    required
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-all"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="email"
                      name="email"
                      defaultValue={user.email}
                      required
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_8px_rgba(0,240,255,0.3)] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3">
                <button
                  type="reset"
                  className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--primary-hover)] rounded-md transition-all active:scale-95 shadow-[0_0_10px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          
          {/* Readonly Section */}
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
              Account Privileges & Security
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Your account has <span className="font-bold text-[var(--text-primary)]">{formatRole(user.role)}</span> privileges. 
              Role assignments and permission scopes are managed by the factory owner. You cannot escalate your own privileges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
