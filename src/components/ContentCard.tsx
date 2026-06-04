import React from "react";
import { Folder, FolderOpen, FileText, Video, Eye, Download, Bookmark, Trash2, Edit2, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContentCardProps {
  type: "folder" | "material";
  title: string;
  description?: string;
  folderType?: "class" | "subject" | "chapter" | "category" | "general";
  materialType?: "notes" | "pyqs" | "assignments" | "dpps" | "video_lectures" | "formula_sheets" | "tests";
  count?: number;
  url?: string;
  isLocked?: boolean;
  isHidden?: boolean;
  isBookmarked?: boolean;
  downloadCount?: number;
  onClick?: () => void;
  onEdit?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onDownload?: (e: React.MouseEvent) => void;
  onBookmark?: (e: React.MouseEvent) => void;
  className?: string;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  type,
  title,
  description,
  folderType = "general",
  materialType,
  count,
  isLocked = false,
  isHidden = false,
  isBookmarked = false,
  downloadCount = 0,
  onClick,
  onEdit,
  onDelete,
  onDownload,
  onBookmark,
  className,
}) => {
  const isVideo = materialType === "video_lectures";

  // Define Folder styles and icons
  let FolderIcon = Folder;
  let folderBgColor = "bg-orange-500/10 text-orange-500 border-orange-500/20";
  if (folderType === "class") {
    folderBgColor = "bg-orange-500/10 text-orange-500 border-orange-500/20";
  } else if (folderType === "subject") {
    folderBgColor = "bg-amber-500/10 text-amber-500 border-amber-500/20";
  } else if (folderType === "chapter") {
    FolderIcon = FolderOpen;
    folderBgColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  } else if (folderType === "category") {
    folderBgColor = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
  }

  // Get material badges & visual style
  const getMaterialLabel = () => {
    switch (materialType) {
      case "notes":
        return "Study Notes";
      case "pyqs":
        return "PYQ Paper";
      case "assignments":
        return "Assignment";
      case "dpps":
        return "DPP Practice";
      case "video_lectures":
        return "Video Lecture";
      case "formula_sheets":
        return "Formula Sheet";
      case "tests":
        return "Mock Test";
      default:
        return "Material";
    }
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "theme-card-themed group relative flex flex-col p-5 bg-[var(--glass-bg)] border border-[var(--theme-card-border)] shadow-sm hover:shadow-[var(--theme-shadow-glow)] transition-all duration-300 select-none",
        onClick && "cursor-pointer active:scale-[0.98]",
        isHidden && "opacity-60",
        className
      )}
    >
      {/* Background Hover Accent Glow */}
      <div className="absolute -inset-px rounded-[var(--theme-card-radius,16px)] bg-gradient-to-tr from-[var(--primary-custom)]/5 via-transparent to-[var(--theme-accent-glow)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10" />

      {/* Admin Quick Action Handles (Edit/Delete) */}
      {(onEdit || onDelete) && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10" onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg bg-black/5 hover:bg-black/15 text-zinc-600 hover:text-zinc-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-400 dark:hover:text-white transition duration-150"
              title="Edit Node"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 face-red hover:text-red-700 transition duration-150"
              title="Delete Node"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {type === "folder" ? (
        <div className="flex flex-col items-center text-center py-2 flex-1 justify-between">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-115 border", folderBgColor)}>
            <FolderIcon className="w-7 h-7 fill-current" />
          </div>

          <div className="w-full">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white truncate" title={title}>
              {title}
            </h4>
            {description && (
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                {description}
              </p>
            )}
            {count !== undefined && (
              <span className="inline-block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 mt-2 bg-zinc-500/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {count} {count === 1 ? "item" : "items"}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full justify-between flex-1">
          {/* Top Section File Icon & Badges */}
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center border",
              isVideo 
                ? "bg-rose-500/10 text-rose-500 border-rose-500/20" 
                : "bg-blue-500/10 text-blue-500 border-blue-500/20"
            )}>
              {isVideo ? (
                <Video className="w-5 h-5 fill-current" />
              ) : (
                <FileText className="w-5 h-5 fill-current" />
              )}
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-[9px] font-black uppercase tracking-wider bg-zinc-500/10 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-md border border-zinc-200/25">
                {getMaterialLabel()}
              </span>
              {isLocked && (
                <span className="p-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20" title="Premium Locked">
                  <Lock className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>

          {/* Middle Section Text Content */}
          <div className="flex-1 mb-4">
            <h4 className="text-xs font-black text-zinc-900 dark:text-white line-clamp-2 group-hover:text-[var(--primary-custom)] transition duration-200 text-left">
              {title}
            </h4>
            {description && (
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed text-left">
                {description}
              </p>
            )}
          </div>

          {/* Bottom Section Controls Info */}
          <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/50 pt-3 mt-auto">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500">
              {downloadCount !== undefined && downloadCount > 0 && (
                <span>⬇ {downloadCount}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {onBookmark && (
                <button
                  onClick={onBookmark}
                  className={cn(
                    "p-1.5 rounded-lg border transition duration-150",
                    isBookmarked
                      ? "bg-[var(--primary-custom)]/10 border-[var(--primary-custom)]/20 text-[var(--primary-custom)]"
                      : "bg-transparent border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
                  )}
                  title="Bookmark File"
                >
                  <Bookmark className={cn("w-3.5 h-3.5", isBookmarked && "fill-current")} />
                </button>
              )}
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="p-1.5 rounded-lg border border-[var(--primary-custom)]/20 bg-[var(--primary-custom)]/5 text-[var(--primary-custom)] hover:bg-[var(--primary-custom)] hover:text-white hover:border-transparent transition duration-150"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
