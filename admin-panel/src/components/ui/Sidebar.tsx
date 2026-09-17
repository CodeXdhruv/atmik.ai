"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminStore } from "@/store/adminStore";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Sparkles,
  Heart,
  Plus, 
  LayoutGrid, 
  Tag, 
  Image as ImageIcon, 
  Users, 
  MessageSquare, 
  BarChart2, 
  FileText, 
  Settings, 
  History, 
  Home,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, currentAdmin, logout, mobileMenuOpen, setMobileMenuOpen } = useAdminStore();
  
  const menuGroups = [
    {
      title: "",
      items: [
        { name: "Home", href: "/dashboard", icon: Home }
      ]
    },
    {
      title: "CONTENT",
      items: [
        { name: "Library", href: "/dashboard/content", icon: BookOpen },
        { name: "Quotes", href: "/dashboard/quotes", icon: MessageSquare },
        { name: "Inner Journey", href: "/dashboard/journey", icon: Sparkles },
        { name: "For You", href: "/dashboard/for-you", icon: Heart },
        { name: "Create", href: "/dashboard/content/new", icon: Plus },
        { name: "Categories", href: "/dashboard/categories", icon: LayoutGrid },
        { name: "Media", href: "/dashboard/media", icon: ImageIcon }
      ]
    },
    {
      title: "PEOPLE",
      items: [
        { name: "Users", href: "/dashboard/users", icon: Users }
      ]
    },

    {
      title: "SYSTEM",
      items: [
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
        { name: "Activity", href: "/dashboard/activity", icon: History }
      ]
    }
  ];

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 90 : 260 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`fixed top-0 bottom-0 left-0 z-40 bg-[#FBF9F6] border-r border-border-custom flex flex-col justify-between py-8 overflow-hidden select-none lg:translate-x-0 transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Logo Section */}
        <div className="px-8 flex flex-col items-center mb-10 text-center">
          <Link href="/dashboard" className="flex flex-col items-center gap-1">
            <div className="w-20 h-20 flex items-center justify-center mb-2">
              {/* Lotus logo from app assets */}
              <img src="/logo-gold.png" alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <span className="font-logo text-2xl text-primary-navy tracking-wide leading-none" style={{ fontFamily: 'Samarkan, serif' }}>
                  Atmik AI
                </span>
                <span className="font-ui text-[10px] tracking-wider text-primary-navy/50 mt-1 uppercase font-semibold">
                  Admin Panel
                </span>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="px-4 flex-1 overflow-y-auto space-y-6 pb-6">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {group.title && (
                <p className={`px-4 text-[10px] font-bold text-primary-navy/40 uppercase tracking-wider mb-2 font-ui ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard" && item.href !== "#");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                          setMobileMenuOpen(false);
                        }
                      }}
                      className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl transition-all duration-200 ${
                        isActive
                          ? "bg-[#F3EFE9] text-primary-navy font-semibold"
                          : "text-primary-navy/60 hover:bg-[#F3EFE9]/50 hover:text-primary-navy font-medium"
                      }`}
                    >
                      <item.icon size={18} className={isActive ? "text-accent-gold" : ""} strokeWidth={2} />
                      <span className={`text-[13px] font-ui ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom Gradient Card */}
      {!sidebarCollapsed && (
        <div className="px-6 pb-4 pt-4 mt-auto">
          <div className="rounded-2xl p-5 overflow-hidden relative shadow-sm" style={{ background: 'linear-gradient(135deg, #E6E1D8 0%, #D5C9B3 100%)' }}>
            <h4 className="font-heading text-lg font-bold text-primary-navy mb-1 relative z-10 leading-tight">
              Create<br/>Content<br/>that Matters
            </h4>
            <div className="absolute -bottom-4 -right-4 opacity-50 text-accent-gold">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  );
}
