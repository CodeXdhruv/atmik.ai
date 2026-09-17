"use client";

import { useState } from "react";
import { useAdminStore } from "@/store/adminStore";
import { 
  History, 
  Search, 
  Trash2, 
  Filter,
  CheckCircle,
  FileText,
  AlertTriangle,
  Upload,
  UserCheck
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function ActivityLogsPage() {
  const { activityLogs } = useAdminStore();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("All Actions");

  const getActionIcon = (action: string) => {
    switch (action) {
      case "Publish":
        return <CheckCircle size={15} className="text-success" />;
      case "Update":
        return <FileText size={15} className="text-primary-navy/55" />;
      case "Delete":
        return <AlertTriangle size={15} className="text-danger" />;
      case "Upload":
        return <Upload size={15} className="text-accent-gold" />;
      case "Auth":
        return <UserCheck size={15} className="text-success" />;
      default:
        return <History size={15} className="text-primary-navy/40" />;
    }
  };

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch = log.details.toLowerCase().includes(search.toLowerCase()) || 
                          log.adminName.toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === "All Actions" || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 select-none font-ui relative">
      <Toaster position="top-right" />

      {/* Header Row */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-heading text-3xl font-bold text-primary-navy">Activity Logs</h2>
          <p className="text-xs text-primary-navy/40 mt-1 font-light">Audit trail of all administrative updates, publications, and media syncs.</p>
        </div>
        <button
          onClick={() => toast.success("Activity logs successfully exported to CSV!")}
          className="flex items-center gap-2 px-5 py-3 border border-border-custom bg-white hover:bg-primary-navy/[0.01] text-primary-navy rounded-button text-xs font-semibold shadow-soft cursor-pointer transition-all duration-200"
        >
          <span>Export Logs</span>
        </button>
      </div>

      {/* Filters row */}
      <div className="bg-white border border-border-custom rounded-2xl p-4 shadow-soft flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-primary-navy/30">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search logs details or author..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="border border-border-custom bg-white px-3.5 py-2 text-xs rounded-input text-primary-navy/70 focus:text-primary-navy outline-none cursor-pointer min-w-[130px]"
        >
          <option>All Actions</option>
          <option>Publish</option>
          <option>Update</option>
          <option>Delete</option>
          <option>Upload</option>
          <option>Auth</option>
        </select>

        <button
          className="flex items-center gap-2 px-4 py-2 border border-border-custom bg-white text-primary-navy/70 hover:text-primary-navy hover:border-accent-gold/40 rounded-input text-xs font-semibold cursor-pointer transition-all"
        >
          <Filter size={14} />
          <span>Filter</span>
        </button>
      </div>

      {/* Timeline Section */}
      <div className="bg-white border border-border-custom rounded-card p-8 shadow-soft relative overflow-hidden">
        
        {/* Vertical Center line */}
        <div className="absolute left-[59px] top-8 bottom-8 w-[1.5px] bg-border-custom/80 z-0" />

        <div className="space-y-8 relative z-10 text-left">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex gap-6 items-start">
                
                {/* Timeline Icon dot */}
                <div className="w-10 h-10 rounded-full bg-white border-2 border-border-custom flex items-center justify-center flex-shrink-0 z-10 shadow-sm">
                  {getActionIcon(log.action)}
                </div>

                {/* Log card */}
                <div className="flex-1 bg-background/35 border border-border-custom hover:border-accent-gold/20 p-4.5 rounded-2xl flex items-start gap-4 transition-all">
                  {log.adminAvatar ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={log.adminAvatar}
                      alt={log.adminName}
                      className="w-8 h-8 rounded-full object-cover border border-border-custom mt-0.5 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-navy text-white text-[10px] font-bold flex items-center justify-center border border-border-custom mt-0.5 flex-shrink-0">
                      {log.adminName?.charAt(0).toUpperCase() || 'A'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-primary-navy">{log.adminName}</span>
                      <span className="text-[10px] text-primary-navy/40 font-light">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-primary-navy/70 mt-1 leading-relaxed">
                      {log.details}
                    </p>
                  </div>

                  <span className={`text-[9px] font-semibold uppercase tracking-wider font-ui px-2 py-0.5 rounded-lg border flex-shrink-0 ${
                    log.action === "Publish" ? "bg-success/5 border-success/20 text-success" :
                    log.action === "Delete" ? "bg-danger/5 border-danger/20 text-danger" :
                    log.action === "Upload" ? "bg-accent-gold/5 border-accent-gold/20 text-accent-gold" :
                    "bg-primary-navy/5 border-primary-navy/10 text-primary-navy/60"
                  }`}>
                    {log.action}
                  </span>
                </div>

              </div>
            ))
          ) : (
            <div className="py-16 text-center text-primary-navy/35 text-xs">
              No matching activity logs found.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
