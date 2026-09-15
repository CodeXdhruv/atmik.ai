"use client";

import { useState, useEffect, useRef } from "react";
import { useAdminStore } from "@/store/adminStore";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, Layout, Users, Settings, History, Shield, Image, X } from "lucide-react";

export default function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen, contentList, users } = useAdminStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [commandPaletteOpen]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCommandPaletteOpen(false);
      }
    };
    if (commandPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  // Command items
  const pages = [
    { name: "Go to Dashboard", href: "/dashboard", icon: Layout },
    { name: "Manage All Content", href: "/dashboard/content", icon: FileText },
    { name: "Add New Content", href: "/dashboard/content/new", icon: FileText },
    { name: "View Media Library", href: "/dashboard/media", icon: Image },
    { name: "View Users Permission List", href: "/dashboard/users", icon: Users },
    { name: "View Analytics Page", href: "/dashboard", icon: Shield },
    { name: "Configure Admin Settings", href: "/dashboard/settings", icon: Settings },
    { name: "View activity history logs", href: "/dashboard/activity", icon: History }
  ];

  // Filter lists based on query
  const filteredPages = pages.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  const filteredContent = contentList
    .filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.type.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4)
    .map(c => ({
      name: `Content: ${c.title} (${c.type})`,
      href: `/dashboard/content/edit/${c.id}`,
      icon: FileText
    }));
  const filteredUsers = users
    .filter(u => (u.name || '').toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 3)
    .map(u => ({
      name: `User: ${u.name || u.email} (${u.role})`,
      href: `/dashboard/users`,
      icon: Users
    }));

  const allItems = [...filteredPages, ...filteredContent, ...filteredUsers];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setCommandPaletteOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        router.push(allItems[selectedIndex].href);
        setCommandPaletteOpen(false);
      }
    }
  };

  useEffect(() => {
    if (commandPaletteOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandPaletteOpen, selectedIndex, allItems]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-primary-navy/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -20 }}
            transition={{ duration: 0.2 }}
            ref={containerRef}
            className="w-full max-w-[640px] bg-white rounded-card shadow-premium border border-border-custom overflow-hidden"
          >
            {/* Input Header */}
            <div className="flex items-center gap-3.5 px-5 py-4 border-b border-border-custom">
              <Search className="text-primary-navy/40" size={18} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search content..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-primary-navy placeholder-primary-navy/30"
              />
              <button 
                onClick={() => setCommandPaletteOpen(false)}
                className="text-primary-navy/40 hover:text-primary-navy p-1 rounded-full hover:bg-primary-navy/5 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Results body */}
            <div className="max-h-[360px] overflow-y-auto p-2">
              {allItems.length > 0 ? (
                <div className="space-y-1">
                  {allItems.map((item, index) => {
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          router.push(item.href);
                          setCommandPaletteOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-primary-navy text-white" 
                            : "text-primary-navy/80 hover:bg-primary-navy/[0.02]"
                        }`}
                      >
                        <Icon size={16} className={isSelected ? "text-white" : "text-primary-navy/40"} />
                        <span className="text-xs font-medium font-ui">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-primary-navy/40 text-xs font-ui">
                  No matching commands or content found.
                </div>
              )}
            </div>

            {/* Footer tips */}
            <div className="bg-background px-5 py-2.5 border-t border-border-custom flex items-center justify-between text-[10px] text-primary-navy/40 select-none">
              <div className="flex gap-3">
                <span><kbd className="border px-1 py-0.5 rounded mr-1">↑↓</kbd> Navigate</span>
                <span><kbd className="border px-1 py-0.5 rounded mr-1">Enter</kbd> Select</span>
                <span><kbd className="border px-1 py-0.5 rounded mr-1">Esc</kbd> Close</span>
              </div>
              <span className="font-semibold text-accent-gold">Dr. Atmik AI CMS v1.0</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
