"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { useAdminStore } from "@/store/adminStore";
import { apiService } from "@/services/api";

interface R2UploaderProps {
  label: string;
  acceptType: "image" | "pdf" | "audio" | "video";
  onUploadSuccess: (file: { name: string; size: string; url: string }) => void;
  onRemove: () => void;
  value?: { name: string; size: string; url: string };
  maxSizeMB?: number;
}

export default function R2Uploader({
  label,
  acceptType,
  onUploadSuccess,
  onRemove,
  value,
  maxSizeMB = 50
}: R2UploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { uploadMediaItem } = useAdminStore();

  const getAcceptParams = (): Record<string, string[]> => {
    switch (acceptType) {
      case "image":
        return { "image/*": [".jpg", ".jpeg", ".png", ".webp"] };
      case "pdf":
        return { "application/pdf": [".pdf"] };
      case "audio":
        return { "audio/*": [".mp3", ".wav", ".m4a"] };
      case "video":
        return { "video/*": [".mp4", ".mov", ".mkv"] };
      default:
        return {};
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploading(true);
    setProgress(0);

    try {
      // Upload file directly to the API which saves it to R2
      const { publicUrl } = await apiService.uploadFile(file, (p) => setProgress(p));

      // Format file size
      const sizeStr = 
        file.size > 1024 * 1024 
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
          : `${(file.size / 1024).toFixed(0)} KB`;

      // Upload to local state library store (optional, but good for optimistic UI)
      uploadMediaItem({
        name: file.name,
        type: acceptType === "image" ? "image" : acceptType === "pdf" ? "pdf" : acceptType === "audio" ? "audio" : "video",
        size: sizeStr,
        url: publicUrl,
        folder: acceptType === "image" ? "Thumbnails" : acceptType === "pdf" ? "Books" : acceptType === "audio" ? "Audios" : "Videos"
      });

      onUploadSuccess({
        name: file.name,
        size: sizeStr,
        url: publicUrl
      });
    } catch (error: any) {
      console.error("Upload failed:", error);
      alert(`Failed to upload file. Error: ${error.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  
  const onDropRejected = (fileRejections: any[]) => {
    const errorMsg = fileRejections[0]?.errors[0]?.message;
    alert(`File upload failed: ${errorMsg || 'File is too large.'}`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropRejected,

    onDrop,
    accept: getAcceptParams(),
    maxFiles: 1,
    maxSize: maxSizeMB * 1024 * 1024
  });

  return (
    <div className="space-y-2 select-none">
      <label className="text-[11px] font-semibold tracking-wider text-primary-navy/70 uppercase font-ui">
        {label}
      </label>

      {value ? (
        /* Uploaded View */
        <div className="flex items-center gap-3.5 p-3.5 border border-border-custom bg-white rounded-input group shadow-soft transition-all duration-200">
          <div className="w-10 h-10 bg-primary-navy/[0.02] border border-border-custom rounded-lg flex items-center justify-center flex-shrink-0">
            {acceptType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value.url}
                alt="Upload preview"
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  // Fallback to placeholder icon
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <FileText size={18} className="text-primary-navy/60" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-primary-navy truncate font-ui">{value.name}</p>
            <p className="text-[10px] text-primary-navy/40 font-ui mt-0.5">{value.size} • {acceptType.toUpperCase()}</p>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-full hover:bg-danger/10 text-primary-navy/40 hover:text-danger cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : uploading ? (
        /* Uploading Progress View */
        <div className="border border-dashed border-accent-gold/40 bg-accent-gold/[0.02] rounded-input p-6 flex flex-col items-center justify-center text-center">
          <Loader2 className="animate-spin text-accent-gold mb-3" size={20} />
          <p className="text-xs font-semibold text-primary-navy font-ui">Uploading to Cloudflare R2...</p>
          <div className="w-48 bg-border-custom h-1 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-accent-gold h-full rounded-full transition-all duration-200" 
              style={{ width: `${progress}%` }} 
            />
          </div>
          <span className="text-[9px] text-primary-navy/40 font-ui mt-1.5">{progress}% uploaded</span>
        </div>
      ) : (
        /* Drag & Drop Zone View */
        <div
          {...getRootProps()}
          className={`border border-dashed rounded-input p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
            isDragActive 
              ? "border-accent-gold bg-accent-gold/[0.02]" 
              : "border-border-custom bg-white hover:border-accent-gold/40"
          }`}
        >
          <input {...getInputProps()} />
          <Upload 
            size={18} 
            className={`mb-2.5 transition-colors ${
              isDragActive ? "text-accent-gold" : "text-primary-navy/40"
            }`} 
          />
          <p className="text-xs font-semibold text-primary-navy font-ui">
            Drag & drop, or <span className="text-accent-gold">browse</span>
          </p>
          <p className="text-[9px] text-primary-navy/40 font-ui mt-1">
            Max size: {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  );
}
