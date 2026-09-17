"use client";

import { useState } from "react";
import { useAdminStore } from "@/store/adminStore";
import { 
  Check, 
  X, 
  Trash2, 
  MessageSquare, 
  Search, 
  Filter,
  ThumbsUp,
  ThumbsDown,
  ArrowUpRight
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function CommentsPage() {
  const { comments, approveComment, rejectComment, deleteComment } = useAdminStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");

  const handleApprove = (id: string) => {
    approveComment(id);
    toast.success("Comment approved successfully!");
  };

  const handleReject = (id: string) => {
    rejectComment(id);
    toast.success("Comment rejected.");
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this comment permanently?")) {
      deleteComment(id);
      toast.success("Comment deleted permanently.");
    }
  };

  // Filter list
  const filteredComments = comments.filter((comment) => {
    const matchesSearch = comment.content.toLowerCase().includes(search.toLowerCase()) || 
                          comment.authorName.toLowerCase().includes(search.toLowerCase()) ||
                          comment.contentTitle.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "All Status" || 
                          (statusFilter === "Pending" && comment.status === "Pending") ||
                          (statusFilter === "Approved" && comment.status === "Approved") ||
                          (statusFilter === "Rejected" && comment.status === "Rejected");

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 select-none font-ui relative">
      <Toaster position="top-right" />

      {/* Header Row */}
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary-navy">Comments Moderation</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-light">Moderate student discussions, feedback, and reviews submitted on mobile articles and audios.</p>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-border-custom rounded-2xl p-4 shadow-soft flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-primary-navy/30">
            <Search size={14} />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search comments or users..."
            className="w-full pl-9 pr-4 py-2 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border-custom bg-white px-3.5 py-2 text-xs rounded-input text-primary-navy/70 focus:text-primary-navy outline-none cursor-pointer min-w-[130px]"
        >
          <option>All Status</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>

        <button
          className="flex items-center gap-2 px-4 py-2 border border-border-custom bg-white text-primary-navy/70 hover:text-primary-navy hover:border-accent-gold/40 rounded-input text-xs font-semibold cursor-pointer transition-all"
        >
          <Filter size={14} />
          <span>Filter</span>
        </button>
      </div>

      {/* Comments List Grid */}
      <div className="space-y-4">
        {filteredComments.length > 0 ? (
          filteredComments.map((c) => (
            <div 
              key={c.id} 
              className="bg-white border border-border-custom rounded-card p-6 shadow-soft hover:shadow-premium flex flex-col sm:flex-row sm:items-start justify-between gap-5 transition-all duration-300"
            >
              <div className="flex gap-4 items-start flex-1 min-w-0">
                {c.authorAvatar ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.authorAvatar}
                    alt={c.authorName}
                    className="w-10 h-10 rounded-full object-cover border border-border-custom mt-0.5 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-navy text-white text-xs font-bold flex items-center justify-center mt-0.5 flex-shrink-0">
                    {c.authorName?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="space-y-2 min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-primary-navy">{c.authorName}</span>
                    <span className="text-[10px] text-primary-navy/35">{c.date}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                      c.status === "Approved" ? "bg-success/5 border-success/20 text-success" :
                      c.status === "Pending" ? "bg-warning/5 border-warning/20 text-warning" :
                      "bg-danger/5 border-danger/20 text-danger"
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <p className="text-xs text-primary-navy/70 leading-relaxed font-light">
                    &ldquo;{c.content}&rdquo;
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] text-primary-navy/40">
                    <span className="font-medium">Left on:</span>
                    <span className="text-accent-gold font-semibold flex items-center gap-0.5">
                      {c.contentTitle} ({c.contentType})
                      <ArrowUpRight size={10} />
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons panel */}
              <div className="flex sm:flex-col items-center justify-end gap-2.5 self-end sm:self-center">
                {c.status === "Pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-success/5 hover:bg-success hover:text-white border border-success/20 rounded-lg text-[10px] font-semibold text-success transition-all cursor-pointer"
                    >
                      <Check size={12} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/5 hover:bg-danger hover:text-white border border-danger/20 rounded-lg text-[10px] font-semibold text-danger transition-all cursor-pointer"
                    >
                      <X size={12} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
                
                {c.status === "Approved" && (
                  <button
                    onClick={() => handleReject(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-primary-navy/5 hover:bg-primary-navy/10 rounded-lg text-[10px] text-primary-navy/50 hover:text-primary-navy cursor-pointer transition-colors"
                  >
                    <ThumbsDown size={11} />
                    <span>Revoke approval</span>
                  </button>
                )}

                {c.status === "Rejected" && (
                  <button
                    onClick={() => handleApprove(c.id)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-success/5 hover:bg-success/15 rounded-lg text-[10px] text-success cursor-pointer transition-colors"
                  >
                    <ThumbsUp size={11} />
                    <span>Approve</span>
                  </button>
                )}

                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 bg-primary-navy/5 hover:bg-danger/10 text-primary-navy/40 hover:text-danger rounded-lg transition-colors cursor-pointer"
                  title="Delete comment permanently"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white border border-border-custom rounded-card p-12 text-center shadow-soft">
            <p className="text-xs text-primary-navy/35">No comments matching current filters found.</p>
          </div>
        )}
      </div>

    </div>
  );
}
