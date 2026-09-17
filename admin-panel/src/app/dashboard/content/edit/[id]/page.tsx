"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/store/adminStore";
import { 
  Book, 
  FileText, 
  Headphones, 
  Video, 
  Sparkles, 
  Quote as QuoteIcon, 
  Cloud, 
  CheckCircle,
  BookOpen,
  ArrowLeft,
  Calendar,
  Clock
} from "lucide-react";
import TipTapEditor from "@/components/ui/TipTapEditor";
import R2Uploader from "@/components/ui/R2Uploader";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";

import { apiService } from "@/services/api";

type ContentType = 'Book' | 'Article' | 'Audio' | 'Video' | 'Meditation';

export default function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { contentList, updateContentItem, categories, fetchCategories } = useAdminStore();
  
  // Find item
  const existingItem = contentList.find(item => item.id === id);

  // Form State
  const [type, setType] = useState<ContentType>("Book");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("English");
  const [category, setCategory] = useState("Spirituality");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [featured, setFeatured] = useState(false);
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [status, setStatus] = useState<"Draft" | "Published" | "Archived">("Draft");

  // File Upload State
  const [thumbnail, setThumbnail] = useState<{ name: string; size: string; url: string } | undefined>(undefined);
  const [pdfFile, setPdfFile] = useState<{ name: string; size: string; url: string } | undefined>(undefined);

  // Initialize form with existing item
  useEffect(() => {
    if (existingItem) {
      setType(existingItem.type as ContentType);
      setTitle(existingItem.title);
      setSubtitle(existingItem.subtitle);
      setAuthor(existingItem.author);
      setLanguage(existingItem.language);
      setCategory(existingItem.category);
      setSelectedTags(existingItem.tags);
      setDescription(existingItem.description);
      setQuoteText(existingItem.quoteText || "");
      setFeatured(existingItem.featured);
      setStatus(existingItem.status);
      
      setThumbnail({
        name: existingItem.thumbnail.split("/").pop() || "thumbnail.jpg",
        size: "Existing File",
        url: existingItem.thumbnail
      });

      if (existingItem.fileUrl) {
        setPdfFile({
          name: existingItem.fileName || existingItem.fileUrl.split("/").pop() || "resource.pdf",
          size: existingItem.fileSize || "Existing File",
          url: existingItem.fileUrl
        });
      }
    }
  }, [existingItem]);

  // Fetch categories if empty
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  const contentTypes = [
    { name: "Book" as ContentType, icon: Book },
    { name: "Article" as ContentType, icon: FileText },
    { name: "Audio" as ContentType, icon: Headphones },
    { name: "Video" as ContentType, icon: Video },
    { name: "Meditation" as ContentType, icon: Sparkles }
  ];

  const handleUpdate = async () => {
    if (!title.trim() || !author.trim()) {
      toast.error("Please fill in the required fields (Title, Author).");
      return;
    }

    try {
      await apiService.updateContentMetadata(id, {
        title,
        type: type.toUpperCase(),
        coverUrl: thumbnail?.url,
        fileUrl: pdfFile?.url || "text-only",
        description,
        author,
        readTime: 5,
        category
      });

      updateContentItem(id, {
        title,
        subtitle,
        type,
        author,
        status,
        language,
        category,
        tags: selectedTags,
        featured,
        description,
        thumbnail: thumbnail?.url || "",
        fileUrl: pdfFile?.url,
        fileName: pdfFile?.name,
        fileSize: pdfFile?.size
      });

      toast.success("Content updated successfully & push notification sent!");
      router.push("/dashboard/content");
    } catch (error: any) {
      console.error("Failed to update content:", error);
      toast.error(error.message || "Failed to update content in database.");
    }
  };

  const handleTagToggle = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  if (!existingItem) {
    return (
      <div className="py-24 text-center select-none font-ui">
        <h3 className="font-heading text-xl text-primary-navy">Content not found</h3>
        <p className="text-xs text-primary-navy/40 mt-2">The content item you are trying to edit does not exist or has been deleted.</p>
        <Link href="/dashboard/content" className="mt-4 text-xs font-semibold text-accent-gold hover:underline inline-block">
          Go back to content list
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none relative font-ui">
      <Toaster position="top-right" />
      
      {/* Header row */}
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary-navy">Edit Content</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-ui font-light">Update your content settings and publishing status.</p>
      </div>

      {/* Main Grid: Left is Form, Right is Preview/Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Form Details - Spans 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Content Type Selection */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider mb-4">
              Content Type
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {contentTypes.map((item) => {
                const Icon = item.icon;
                const isSelected = type === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setType(item.name)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? "border-primary-navy bg-primary-navy/5 text-primary-navy shadow-sm" 
                        : "border-border-custom bg-white hover:border-accent-gold/40 text-primary-navy/50 hover:text-primary-navy"
                    }`}
                  >
                    <Icon size={16} className={`mb-1.5 ${isSelected ? "text-primary-navy" : "text-primary-navy/40"}`} />
                    <span className="text-[10px] font-semibold">{item.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 2: Basic Information */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-5">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Basic Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter content title"
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Enter content subtitle"
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
                />
              </div>

              {/* Author */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Dr. Atmik Jain"
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors"
                />
              </div>

              {/* Language */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy focus:border-accent-gold/40 outline-none cursor-pointer"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Spanish</option>
                  <option>German</option>
                </select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy focus:border-accent-gold/40 outline-none cursor-pointer"
                >
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))
                  ) : (
                    <option value={category}>{category || "Loading..."}</option>
                  )}
                </select>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-background border border-border-custom rounded-input max-h-[85px] overflow-y-auto">
                  {["Soul", "Science", "Wisdom", "Meditation", "Awakening", "Karma"].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-2 py-0.5 text-[9px] font-semibold rounded-md border cursor-pointer transition-colors ${
                          isSelected 
                            ? "bg-primary-navy border-primary-navy text-white" 
                            : "bg-white border-border-custom text-primary-navy/60 hover:border-accent-gold/40"
                        }`}
                      >
                        {tag} {isSelected ? "×" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quote box - only visible if Book type */}
            {type === "Book" && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                  Featured Quote Preview Text
                </label>
                <textarea
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="Enter short quote statement..."
                  rows={2}
                  className="w-full px-4 py-2.5 bg-background border border-border-custom rounded-input text-xs text-primary-navy placeholder-primary-navy/30 focus:border-accent-gold/40 outline-none transition-colors resize-none"
                />
              </div>
            )}

            {/* Description (TipTap editor) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-primary-navy/60 uppercase tracking-wider">
                Description
              </label>
              <TipTapEditor value={description} onChange={setDescription} />
            </div>
          </div>

          {/* Card 3: Publishing Options */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-4">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Publishing Options
            </h3>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-between">
              {/* Featured toggle */}
              <div className="flex items-center justify-between sm:w-1/2">
                <div>
                  <p className="text-xs font-semibold text-primary-navy">Featured Content</p>
                  <p className="text-[9px] text-primary-navy/40 mt-0.5">Show in featured section on mobile app home</p>
                </div>
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-8 h-4 rounded-full bg-border-custom text-primary-navy cursor-pointer"
                />
              </div>

              {/* Schedule toggle */}
              <div className="flex items-center justify-between sm:w-1/2">
                <div>
                  <p className="text-xs font-semibold text-primary-navy">Schedule Publish</p>
                  <p className="text-[9px] text-primary-navy/40 mt-0.5">Choose future release date and time</p>
                </div>
                <input
                  type="checkbox"
                  checked={schedulePublish}
                  onChange={(e) => setSchedulePublish(e.target.checked)}
                  className="w-8 h-4 rounded-full bg-border-custom text-primary-navy cursor-pointer"
                />
              </div>
            </div>

            {/* Date time picker details if scheduled */}
            {schedulePublish && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-custom/50">
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-primary-navy/55 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={12} /> Date Picker
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-background border border-border-custom rounded-input text-xs text-primary-navy cursor-pointer outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-semibold text-primary-navy/55 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={12} /> Time Picker
                  </label>
                  <input
                    type="time"
                    className="w-full px-3 py-2 bg-background border border-border-custom rounded-input text-xs text-primary-navy cursor-pointer outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Cloudflare R2 Connection status */}
          <div className="bg-white border border-border-custom rounded-card p-5 shadow-soft flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary-navy/5 border border-border-custom flex items-center justify-center text-primary-navy/60">
                <Cloud size={18} />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-primary-navy">Storage Information</p>
                <p className="text-[9px] text-primary-navy/40 mt-0.5">
                  Files will be uploaded directly to Cloudflare R2 bucket • Bucket: <span className="font-semibold text-primary-navy/70">atmik-content</span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-success/5 border border-success/20 rounded-full text-[10px] font-semibold text-success">
              <CheckCircle size={12} /> Ready to Upload
            </span>
          </div>

        </div>

        {/* Right Side: Operations, Uploads, and Notion-style Live Mobile App Preview */}
        <div className="space-y-6">
          
          {/* Card A: Submit Actions */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft flex items-center justify-between gap-4">
            <Link
              href="/dashboard/content"
              className="flex-1 py-3 px-4 border border-border-custom bg-white text-primary-navy hover:bg-primary-navy/[0.01] rounded-button text-xs font-semibold shadow-soft transition-all duration-200 cursor-pointer text-center"
            >
              Cancel
            </Link>
            <button
              onClick={handleUpdate}
              className="flex-1 py-3 px-4 bg-primary-navy text-white hover:bg-primary-navy/90 rounded-button text-xs font-semibold shadow-soft transition-all duration-200 cursor-pointer"
            >
              Update
            </button>
          </div>

          {/* Card B: Media Uploaders */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-5">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Media & Files
            </h3>
            
            {/* Thumbnail */}
            <R2Uploader
              label="Thumbnail Image (Optional)"
              acceptType="image"
              value={thumbnail}
              onUploadSuccess={setThumbnail}
              onRemove={() => setThumbnail(undefined)}
              maxSizeMB={2}
            />

            {/* Resource file */}
            <R2Uploader
              label={type === "Book" ? "Book/PDF File *" : type === "Audio" ? "Audio Resource File *" : "Video File *"}
              acceptType={type === "Book" ? "pdf" : type === "Audio" ? "audio" : "video"}
              value={pdfFile}
              onUploadSuccess={setPdfFile}
              onRemove={() => setPdfFile(undefined)}
              maxSizeMB={type === "Book" ? 5 : 50}
            />
          </div>

          {/* Card C: Notion-Style Live App Preview */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-4">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Live Preview
            </h3>
            
            {/* Mobile App Screen Frame Mockup */}
            <div className="border border-border-custom/80 bg-background/55 rounded-[24px] p-4 shadow-inner relative overflow-hidden select-none">
              
              {/* Internal Mock Card */}
              <div className="bg-white border border-border-custom rounded-xl p-3.5 shadow-sm space-y-3.5">
                
                {/* Image Cover */}
                <div className="w-full aspect-[4/5] bg-primary-navy/5 border border-border-custom rounded-lg overflow-hidden relative flex items-center justify-center">
                  {thumbnail && thumbnail.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail.url}
                      alt="Thumbnail cover preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen size={24} className="text-primary-navy/35 animate-pulse" />
                  )}
                  
                  {/* Floating type badge */}
                  <span className="absolute top-2.5 right-2.5 bg-primary-navy text-white text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-md">
                    {type}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-left">
                  <h4 className="font-heading text-lg font-bold text-primary-navy leading-snug">{title || "Untitled Content"}</h4>
                  <p className="text-[10px] text-primary-navy/40 font-light truncate">{subtitle || "No subtitle provided"}</p>
                  <div className="flex justify-between items-center pt-1.5 border-t border-border-custom/40">
                    <span className="text-[9.5px] text-accent-gold font-semibold uppercase">{author || "Unknown Author"}</span>
                    <span className="text-[8px] bg-background px-2 py-0.5 rounded border border-border-custom text-primary-navy/40">{language}</span>
                  </div>
                </div>

                {/* Dynamic Quote Text Block if Book */}
                {type === "Book" && quoteText && (
                  <div className="bg-primary-navy/[0.01] border-l-2 border-accent-gold p-2.5 rounded-r-lg text-left font-heading text-xs italic text-primary-navy/80 leading-relaxed">
                    &ldquo;{quoteText}&rdquo;
                  </div>
                )}
              </div>
              
              <div className="mt-3 text-center">
                <span className="text-[9px] text-primary-navy/30 font-medium uppercase tracking-widest">
                  Atmik.ai App Mock View
                </span>
              </div>
            </div>
          </div>

          {/* Card D: Publishing Status Selector */}
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-4">
            <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider border-b border-border-custom/50 pb-2">
              Status
            </h3>
            
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Draft"
                  checked={status === "Draft"}
                  onChange={() => setStatus("Draft")}
                  className="w-4 h-4 text-primary-navy border-border-custom"
                />
                <span className="text-xs text-primary-navy/70 font-medium">Draft (save as draft)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Published"
                  checked={status === "Published"}
                  onChange={() => setStatus("Published")}
                  className="w-4 h-4 text-primary-navy border-border-custom"
                />
                <span className="text-xs text-primary-navy/70 font-medium">Published (publish immediately)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  value="Archived"
                  checked={status === "Archived"}
                  onChange={() => setStatus("Archived")}
                  className="w-4 h-4 text-primary-navy border-border-custom"
                />
                <span className="text-xs text-primary-navy/70 font-medium">Archived (hide from public)</span>
              </label>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
