'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface AdminShellProps {
  children: React.ReactNode;
  adminName?: string;
  adminAvatar?: string;
}

export default function AdminShell({ children, adminName, adminAvatar }: AdminShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const stored = localStorage.getItem('admin_sidebar_collapsed');
    if (stored === 'true') {
      setIsCollapsed(true);
    }
  }, []);

  const [activeSOSCount, setActiveSOSCount] = useState(0);

  useEffect(() => {
    const fetchSOS = async () => {
      try {
        const res = await fetch('/api/admin/sos/active');
        const data = await res.json();
        if (data.active_alerts) {
          setActiveSOSCount(data.active_alerts.length);
        }
      } catch (e) {
        console.error('Failed to poll SOS', e);
      }
    };
    
    fetchSOS();
    const interval = setInterval(fetchSOS, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen admin-theme bg-[#D3D9D4] text-[#124E66] flex flex-col font-sans selection:bg-[#124E66]/20 selection:text-[#124E66]">
      <AdminTopbar 
        adminName={adminName} 
        adminAvatar={adminAvatar} 
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
        onToggleMobileMenu={() => setIsMobileOpen((prev) => !prev)}
      />
      <div className="flex flex-1 pt-16">
        <AdminSidebar 
          isCollapsed={isCollapsed} 
          onToggleCollapse={toggleCollapse} 
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />
        {/* Backdrop for mobile drawer */}
        {isMobileOpen && (
          <div 
            className="fixed inset-0 z-10 bg-black/60 backdrop-blur-xs lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
        <main 
          className={`flex-1 p-6 overflow-x-hidden transition-all duration-300 pl-0 lg:pl-16 ${
            isCollapsed ? '' : 'lg:pl-64'
          } relative`}
        >
          {activeSOSCount > 0 && (
            <div className="absolute top-0 left-0 right-0 z-50 p-2">
              <div className="bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-500 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-6 w-6 text-white" />
                  <div>
                    <h4 className="text-white font-black uppercase tracking-widest text-sm font-mono">EMERGENCY SOS ACTIVE</h4>
                    <p className="text-red-100 text-xs font-bold">{activeSOSCount} unresolved alert(s) requiring immediate attention.</p>
                  </div>
                </div>
                <Link
                  href="/admin/sos"
                  className="mt-2 sm:mt-0 px-4 py-2 bg-white text-red-600 rounded-lg text-xs font-black uppercase tracking-wider hover:bg-red-50 transition-colors"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          )}
          
          <div className={`max-w-7xl mx-auto space-y-6 ${activeSOSCount > 0 ? 'mt-16' : ''}`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
