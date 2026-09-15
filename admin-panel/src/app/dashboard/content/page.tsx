"use client";

import { useState, useEffect } from "react";
import { useAdminStore } from "@/store/adminStore";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit2, 
  Trash2, 
  Eye, 
  Globe, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  LayoutGrid,
  List,
  FileText,
  Quote,
  Video,
  Music,
  Folder,
  Sparkles,
  Aperture, Atom, Wind, Droplet, Feather, Flame, Waves, Infinity as InfinityIcon, Network, Layers, Boxes, Orbit, Asterisk, Focus, Zap, Hexagon, Triangle, Circle, Sun, Moon, Heart, Compass, Lightbulb, Book, Smile, Shield, Star, Flower, Leaf, Globe as GlobeIcon, Target, Sunrise,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
};

const ICON_MAP: Record<string, React.ElementType> = {
  Folder, Aperture, Atom, Wind, Droplet, Feather, Flame, Waves, Infinity: InfinityIcon, InfinityIcon, Network, Layers, Boxes, Sparkles, Orbit, Asterisk, Focus, Zap, Hexagon, Triangle, Circle, Sun, Moon, Heart, Compass, Lightbulb, Book, BookOpen, Smile, Shield, Star, Flower, Leaf, Globe: GlobeIcon, Target, Sunrise
};
const LOWER_ICON_MAP: Record<string, React.ElementType> = {};
Object.keys(ICON_MAP).forEach((key) => {
  LOWER_ICON_MAP[key.toLowerCase()] = ICON_MAP[key];
});

function getCategoryIcon(iconName?: string, categoryName?: string): React.ElementType {
  if (iconName) {
    if (ICON_MAP[iconName]) return ICON_MAP[iconName];
    const lowerKey = iconName.toLowerCase();
    if (LOWER_ICON_MAP[lowerKey]) return LOWER_ICON_MAP[lowerKey];
  }
  
  if (categoryName) {
    const nameLower = categoryName.toLowerCase();
    if (nameLower.includes('spirit') || nameLower.includes('soul') || nameLower.includes('awakening')) return Aperture;
    if (nameLower.includes('mindful') || nameLower.includes('aware') || nameLower.includes('focus')) return Focus;
    if (nameLower.includes('peace') || nameLower.includes('calm') || nameLower.includes('wind')) return Wind;
    if (nameLower.includes('disciplin') || nameLower.includes('courage') || nameLower.includes('zap')) return Zap;
    if (nameLower.includes('love') || nameLower.includes('heart') || nameLower.includes('heal')) return Heart;
    if (nameLower.includes('growth') || nameLower.includes('nature') || nameLower.includes('leaf')) return Leaf;
    if (nameLower.includes('wisdom') || nameLower.includes('purpose') || nameLower.includes('light')) return Lightbulb;
    if (nameLower.includes('hope') || nameLower.includes('gratitude') || nameLower.includes('sun')) return Sun;
    if (nameLower.includes('karma') || nameLower.includes('surrender')) return InfinityIcon;
  }

  return Folder;
}

export default function ContentListPage() {
  const { contentList, fetchContent, deleteContentItem, updateContentItem } = useAdminStore();
  
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [langFilter, setLangFilter] = useState("All Languages");
  
  // Row action menu dropdown tracking
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter content
  const filteredContent = contentList.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
                          item.author.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "All Types" || item.type.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === "All Status" || item.status === statusFilter;
    const matchesLang = langFilter === "All Languages" || item.language === langFilter;

    return matchesSearch && matchesType && matchesStatus && matchesLang;
  });

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this content item?")) {
      deleteContentItem(id);
      setActiveMenuId(null);
    }
  };

  const handleToggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Published" ? "Draft" : "Published";
    updateContentItem(id, { status: newStatus as any });
    setActiveMenuId(null);
  };

  const formatViews = (views: number) => {
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'book': return BookOpen;
      case 'article': return FileText;
      case 'audio': return Music;
      case 'video': return Video;
      case 'quote': return Quote;
      default: return BookOpen;
    }
  };

  return (
    <div className="space-y-6 select-none relative font-ui">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-3xl font-bold text-primary-navy">Library Content</h2>
          <p className="text-xs text-primary-navy/40 mt-1 font-light">Explore, organize, and manage all books, articles, quotes, and media cards.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid vs Table View Switcher */}
          <div className="flex items-center p-1 bg-white border border-border-custom rounded-button shadow-soft">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                viewMode === "grid" 
                  ? "bg-primary-navy text-white shadow-soft" 
                  : "text-primary-navy/50 hover:text-primary-navy"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                viewMode === "table" 
                  ? "bg-primary-navy text-white shadow-soft" 
                  : "text-primary-navy/50 hover:text-primary-navy"
              }`}
            >
              <List size={14} />
              <span>Table</span>
            </button>
          </div>

          <Link
            href="/dashboard/content/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-navy hover:bg-primary-navy/90 text-white rounded-button text-xs font-semibold shadow-soft hover:shadow-md cursor-pointer transition-all duration-200"
          >
            <Plus size={14} />
            <span>Add Content</span>
          </Link>
        </div>
      </div>

      {/* Format Chips & Search Filter Section */}
      <div className="bg-white border border-border-custom rounded-2xl p-5 shadow-soft space-y-4">
        
        {/* Search and Dropdowns Row */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary-navy/30">
              <Search size={14} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, author, or keywords..."
              className="w-full pl-9 pr-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
            />
          </div>

          {/* Type Filter Dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-border-custom bg-white px-3.5 py-2.5 text-xs rounded-input text-primary-navy/80 font-medium outline-none cursor-pointer focus:border-accent-gold/40 min-w-[130px]"
          >
            <option value="All Types">All Formats</option>
            <option value="Book">Book</option>
            <option value="Article">Article</option>
            <option value="Audio">Audio</option>
            <option value="Video">Video</option>
            <option value="Quote">Quote</option>
          </select>

          {/* Status Filter Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border-custom bg-white px-3.5 py-2.5 text-xs rounded-input text-primary-navy/80 font-medium outline-none cursor-pointer focus:border-accent-gold/40 min-w-[130px]"
          >
            <option value="All Status">All Status</option>
            <option value="Published">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>

        {/* Content Format Chips Row (Books, Articles, Quotes, etc.) */}
        <div className="pt-2 border-t border-border-custom/50 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-navy/40 mr-1 flex-shrink-0">
            Content Format:
          </span>
          {[
            { label: "All Formats", value: "All Types", icon: LayoutGrid },
            { label: "Books", value: "Book", icon: BookOpen },
            { label: "Articles", value: "Article", icon: FileText },
            { label: "Quotes", value: "Quote", icon: Quote },
            { label: "Audio", value: "Audio", icon: Music },
            { label: "Video", value: "Video", icon: Video },
          ].map((typeItem) => {
            const TypeIconComp = typeItem.icon;
            const isActive = typeFilter.toLowerCase() === typeItem.value.toLowerCase();
            return (
              <button
                key={typeItem.value}
                onClick={() => setTypeFilter(typeItem.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 flex-shrink-0 ${
                  isActive
                    ? "bg-primary-navy text-white shadow-soft"
                    : "bg-background border border-border-custom text-primary-navy/60 hover:text-primary-navy hover:border-accent-gold/30"
                }`}
              >
                <TypeIconComp size={12} />
                <span>{typeItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Display */}
      {viewMode === "grid" ? (
        /* BIG CARDS GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredContent.length > 0 ? (
            filteredContent.map((item) => {
              const TypeIcon = getTypeIcon(item.type);
              const CatIcon = getCategoryIcon(undefined, item.category);

              return (
                <div 
                  key={item.id}
                  className="bg-white border border-border-custom hover:border-accent-gold/40 rounded-card overflow-hidden shadow-soft hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  {/* Card Cover Image Header */}
                  <div className="relative aspect-[16/10] bg-primary-navy/[0.03] border-b border-border-custom/60 overflow-hidden">
                    {item.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-primary-navy/20 gap-2 bg-gradient-to-br from-background to-border-custom/20">
                        <TypeIcon size={36} />
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-primary-navy/30">{item.type}</span>
                      </div>
                    )}

                    {/* Floating Badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-primary-navy/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wide uppercase flex items-center gap-1.5 shadow-sm">
                        <TypeIcon size={11} />
                        <span>{item.type}</span>
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border shadow-sm backdrop-blur-md ${
                        item.status === "Published" ? "bg-success/90 border-success text-white" :
                        item.status === "Draft" ? "bg-warning/90 border-warning text-white" :
                        "bg-danger/90 border-danger text-white"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Category Chip */}
                      <div className="flex items-center gap-1.5 text-accent-gold font-semibold text-[11px]">
                        <CatIcon size={12} />
                        <span>{item.category || "General"}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-heading font-bold text-base text-primary-navy leading-snug line-clamp-2 group-hover:text-accent-gold transition-colors">
                        {item.title}
                      </h3>

                      {/* Subtitle / Excerpt */}
                      <p className="text-xs text-primary-navy/60 font-light line-clamp-2 leading-relaxed">
                        {stripHtml(item.subtitle || item.description || "")}
                      </p>
                    </div>

                    {/* Meta details */}
                    <div className="pt-3 border-t border-border-custom/50 flex items-center justify-between text-[11px] text-primary-navy/50">
                      <span className="truncate max-w-[130px] font-medium">{item.author || "Dr. Swatantra Jain"}</span>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="flex items-center gap-1">
                          <Eye size={12} className="text-primary-navy/30" />
                          <span>{formatViews(item.views)}</span>
                        </span>
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-background/50 border-t border-border-custom/60 flex items-center justify-between gap-2">
                    <Link
                      href={`/dashboard/content/edit/${item.id}`}
                      className="flex-1 py-2 px-3 bg-white hover:bg-primary-navy hover:text-white border border-border-custom rounded-lg text-xs font-semibold text-primary-navy transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-soft"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </Link>

                    <button
                      onClick={() => handleToggleStatus(item.id, item.status)}
                      className="p-2 bg-white hover:bg-accent-gold/10 border border-border-custom hover:border-accent-gold/30 rounded-lg text-primary-navy/70 hover:text-accent-gold cursor-pointer transition-colors"
                      title={item.status === "Published" ? "Unpublish to Draft" : "Publish Content"}
                    >
                      <Globe size={14} />
                    </button>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 bg-white hover:bg-danger/10 border border-border-custom hover:border-danger/30 rounded-lg text-danger/70 hover:text-danger cursor-pointer transition-colors"
                      title="Delete Content"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white border border-border-custom rounded-card shadow-soft space-y-3">
              <BookOpen size={32} className="mx-auto text-primary-navy/20" />
              <p className="text-sm font-semibold text-primary-navy/70">No content items found</p>
              <p className="text-xs text-primary-navy/40 max-w-sm mx-auto font-light">
                Try selecting a different category or search term, or click below to add new content.
              </p>
              <Link
                href="/dashboard/content/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-navy text-white rounded-button text-xs font-semibold shadow-soft hover:bg-primary-navy/90"
              >
                <Plus size={14} />
                <span>Create Content</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-border-custom rounded-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto min-h-[380px]">
            <table className="w-full border-collapse text-left font-ui">
              <thead>
                <tr className="border-b border-border-custom bg-background/30 text-[10px] uppercase tracking-wider font-semibold text-primary-navy/40">
                  <th className="py-4 px-6 font-medium">Content</th>
                  <th className="py-4 px-4 font-medium">Category</th>
                  <th className="py-4 px-4 font-medium">Type</th>
                  <th className="py-4 px-4 font-medium">Author</th>
                  <th className="py-4 px-4 font-medium">Status</th>
                  <th className="py-4 px-4 font-medium">Views</th>
                  <th className="py-4 px-4 font-medium">Date</th>
                  <th className="py-4 px-6 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/50 text-xs">
                {filteredContent.length > 0 ? (
                  filteredContent.map((item) => (
                    <tr key={item.id} className="hover:bg-primary-navy/[0.005] group transition-colors">
                      {/* Content Column */}
                      <td className="py-3 px-6 flex items-center gap-4">
                        <div className="w-10 h-12 border border-border-custom bg-primary-navy/[0.02] rounded-md flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                          {item.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BookOpen size={16} className="text-primary-navy/30" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-primary-navy truncate">{item.title}</p>
                          <p className="text-[10px] text-primary-navy/40 mt-0.5 truncate leading-relaxed">{stripHtml(item.subtitle)}</p>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-primary-navy/70 font-medium">{item.category || "General"}</td>

                      {/* Type */}
                      <td className="py-3 px-4 text-primary-navy/70">{item.type}</td>

                      {/* Author */}
                      <td className="py-3 px-4 text-primary-navy/70">{item.author}</td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.status === "Published" ? "bg-success/5 border-success/20 text-success" :
                          item.status === "Draft" ? "bg-warning/5 border-warning/20 text-warning" :
                          "bg-danger/5 border-danger/20 text-danger"
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Views */}
                      <td className="py-3 px-4 text-primary-navy/70 font-semibold">{formatViews(item.views)}</td>

                      {/* Date */}
                      <td className="py-3 px-4 text-primary-navy/40">{item.date}</td>

                      {/* Actions */}
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/content/edit/${item.id}`}
                            className="p-1.5 rounded-lg hover:bg-primary-navy/5 text-primary-navy/50 hover:text-primary-navy cursor-pointer transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(item.id, item.status)}
                            className="p-1.5 rounded-lg hover:bg-primary-navy/5 text-primary-navy/50 hover:text-accent-gold cursor-pointer transition-colors"
                            title="Status"
                          >
                            <Globe size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg hover:bg-danger/5 text-danger/70 hover:text-danger cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <p className="text-xs text-primary-navy/35 font-ui">No content matching the active filters found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
