"use client";

import { useState, useEffect, useMemo } from "react";
import { useAdminStore } from "@/store/adminStore";
import { apiService } from "@/services/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Activity, 
  Clock, 
  Phone,
  Bookmark
} from "lucide-react";

type DayCount = { day: string; count: number };
type Overview = {
  readers: number;
  liveContent: number;
  featured: number;
  scheduled: number;
  bookmarks: number;
  quotes: number;
  journeys: number;
  chats: number;
  categories: { name: string; count: number }[];
  types: { name: string; count: number }[];
  contentByDay: DayCount[];
  bookmarksByDay: DayCount[];
};

function dayKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function countOn(rows: DayCount[] | undefined, day: string) {
  return Number(rows?.find((row) => row.day === day)?.count || 0);
}

export default function AnalyticsPage() {
  const { currentAdmin } = useAdminStore();
  const [greeting, setGreeting] = useState("Good Morning");
  const [timeRange, setTimeRange] = useState("Weekly");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    let active = true;
    apiService.fetchOverview()
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch(() => {
        if (active) setLoadError("Live numbers could not be loaded.");
      });
    return () => {
      active = false;
    };
  }, []);

  const summaryMetrics = [
    { name: "Registered readers", value: overview ? String(overview.readers) : "—", desc: "Accounts in the live app", icon: Phone, trend: "Excludes admin accounts" },
    { name: "Live library", value: overview ? String(overview.liveContent) : "—", desc: "Books and articles visible now", icon: Activity, trend: overview ? `${overview.featured} featured` : "From the content library" },
    { name: "Saved bookmarks", value: overview ? String(overview.bookmarks) : "—", desc: "Items readers have saved", icon: Bookmark, trend: overview ? `${overview.quotes} quotes in the pool` : "From reader bookmarks" },
    { name: "Conversations", value: overview ? String(overview.chats) : "—", desc: "Chat sessions on record", icon: Clock, trend: overview ? `${overview.journeys} journey entries` : "From voice and chat" },
  ];

  const growthTrendData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (timeRange === "Yearly") {
      return Array.from({ length: 12 }, (_, index) => {
        const month = new Date(today.getFullYear(), today.getMonth() - (11 - index), 1);
        const prefix = dayKey(month).slice(0, 7);
        const sum = (rows?: DayCount[]) => (rows || []).reduce((total, row) => row.day.startsWith(prefix) ? total + Number(row.count) : total, 0);
        return {
          name: month.toLocaleDateString("en-US", { month: "short" }),
          Published: sum(overview?.contentByDay),
          Bookmarks: sum(overview?.bookmarksByDay),
        };
      });
    }
    const days = timeRange === "Monthly" ? 30 : 7;
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (days - 1 - index));
      const key = dayKey(date);
      return {
        name: timeRange === "Weekly"
          ? date.toLocaleDateString("en-US", { weekday: "short" })
          : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Published: countOn(overview?.contentByDay, key),
        Bookmarks: countOn(overview?.bookmarksByDay, key),
      };
    });
  }, [overview, timeRange]);

  const categoryData = overview?.categories?.length ? overview.categories : [{ name: "None yet", count: 0 }];
  const typeData = overview?.types?.length ? overview.types : [{ name: "None yet", count: 0 }];
  const live = overview?.liveContent || 0;
  const scheduled = overview?.scheduled || 0;
  const libraryTotal = live + scheduled;
  const liveShare = libraryTotal === 0 ? 0 : Math.round((live / libraryTotal) * 100);
  const completionData = [
    live > 0 ? { name: "Live", value: live, color: "#24385A" } : null,
    scheduled > 0 ? { name: "Scheduled", value: scheduled, color: "#E8EDF4" } : null,
  ].filter((entry): entry is { name: string; value: number; color: string } => entry !== null);
  if (completionData.length === 0) {
    completionData.push({ name: "Empty", value: 1, color: "#E8EDF4" });
  }

  return (
    <div className="space-y-8 select-none font-ui">
      {/* Banner Section */}
      <div className="rounded-[20px] overflow-hidden relative shadow-sm h-[200px]" style={{ background: 'linear-gradient(90deg, #F5F0E6 0%, #E9E1D3 100%)' }}>
        <div className="absolute inset-0 z-0 opacity-80" style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80')",
          backgroundPosition: "center right",
          backgroundSize: "cover",
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 100%)',
          maskImage: 'linear-gradient(to right, transparent 0%, black 100%)'
        }} />
        
        <div className="relative z-10 p-6 sm:p-10 h-full flex flex-col justify-between max-w-[80%] sm:max-w-[60%]">
          <div>
            <h1 className="font-heading text-4xl font-bold text-primary-navy mb-2">{greeting},<br/>{currentAdmin?.name || 'Dr. Jain'}</h1>
          </div>
          <p className="text-[13px] text-primary-navy/70 font-ui font-medium">
            Thanks for being part of Atmik.<br/>
            Let's create a little more light today.
          </p>
        </div>
        
        {/* Quote floating right */}
        <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-12 text-right">
          <p className="font-heading text-xl italic text-primary-navy max-w-[200px] mb-2 leading-tight">
            "A kinder world begins with better content."
          </p>
          <span className="text-[10px] font-bold tracking-widest uppercase text-primary-navy/60 font-ui">— ATMIK</span>
        </div>
      </div>

      <div className="flex justify-end items-center">

        <div className="flex bg-white border border-border-custom p-1 rounded-xl shadow-soft">
          {["Weekly", "Monthly", "Yearly"].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold cursor-pointer transition-all duration-200 ${
                timeRange === range 
                  ? "bg-primary-navy text-white shadow-sm" 
                  : "text-primary-navy/40 hover:text-primary-navy/70"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryMetrics.map((m, idx) => (
          <div key={idx} className="bg-white border border-border-custom rounded-card p-6 shadow-soft hover:shadow-premium transition-all duration-300">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-semibold text-primary-navy/40 uppercase tracking-wider">
                {m.name}
              </span>
              <m.icon size={16} className="text-accent-gold" />
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-primary-navy">{m.value}</span>
              <p className="text-[10px] text-primary-navy/40 mt-1">{m.desc}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-border-custom/50 flex items-center justify-between text-[9px] font-semibold text-success uppercase">
              <span>{m.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Grid: Growth & Completion Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth Area Chart (Spans 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col justify-between">
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h4 className="font-heading text-lg font-bold text-primary-navy">Library & Bookmarks</h4>
              <p className="text-[10px] text-primary-navy/40 font-light mt-0.5">{loadError || "Items published and bookmarks saved in the live app"}</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthTrendData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#24385A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#24385A" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D6A04A" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#D6A04A" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F4F9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#24385A", opacity: 0.4, fontSize: 10, fontFamily: "Inter" }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#24385A", opacity: 0.4, fontSize: 10, fontFamily: "Inter" }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#FFFFFF", 
                    borderColor: "#E8EDF4", 
                    borderRadius: "12px", 
                    boxShadow: "0 8px 30px rgba(0,0,0,.04)" 
                  }}
                />
                <Area type="monotone" dataKey="Published" stroke="#24385A" strokeWidth={2} fillOpacity={1} fill="url(#colorViews)" />
                <Area type="monotone" dataKey="Bookmarks" stroke="#D6A04A" strokeWidth={2} fillOpacity={1} fill="url(#colorDownloads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Gauge donut (1 col) */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex flex-col justify-between">
          <div>
            <h4 className="font-heading text-lg font-bold text-primary-navy">Library availability</h4>
            <p className="text-[10px] text-primary-navy/40 font-light mt-0.5">Items readers can open now, against items still scheduled</p>

            <div className="h-[180px] w-full mt-4 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={completionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {completionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-primary-navy">{libraryTotal === 0 ? "0" : `${liveShare}%`}</span>
                <span className="text-[9px] uppercase tracking-wider text-primary-navy/40 font-semibold mt-0.5">Live</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-custom space-y-2 text-[10px] text-primary-navy/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-navy" />
                <span>Live in the app</span>
              </div>
              <span className="font-semibold text-primary-navy">{live}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-border-custom" />
                <span>Scheduled for later</span>
              </div>
              <span className="font-semibold text-primary-navy/40">{scheduled}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Popular categories & tags vertical bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Popular Categories */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft">
          <h4 className="font-heading text-lg font-bold text-primary-navy mb-4">Library by category</h4>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F4F9" horizontal={false} />
                <XAxis 
                  type="number" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: "#24385A", opacity: 0.4, fontSize: 9 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: "#24385A", opacity: 0.7, fontSize: 9, fontWeight: "semibold" }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#24385A" radius={[0, 8, 8, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Tags */}
        <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft">
          <h4 className="font-heading text-lg font-bold text-primary-navy mb-4">Library by type</h4>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={typeData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F4F9" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: "#24385A", opacity: 0.7, fontSize: 9, fontWeight: "semibold" }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: "#24385A", opacity: 0.4, fontSize: 9 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#D6A04A" radius={[8, 8, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}
