import { Heart, MessageSquare, Eye, Play } from "lucide-react";

interface Reel {
  id: string;
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

interface ReelCardProps {
  reel: Reel;
  onAutomate: () => void;
}

export default function ReelCard({ reel, onAutomate }: ReelCardProps) {
  const thumbnail = reel.thumbnail_url || reel.media_url;
  return (
    <div className="group overflow-hidden rounded-2xl border border-white/20 bg-white/70 shadow-lg backdrop-blur-xl transition hover:shadow-xl hover:-translate-y-1">
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={reel.caption || "Reel"}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
            <Play size={40} className="text-purple-300" />
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
          {reel.permalink && (
            <a
              href={reel.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 backdrop-blur transition hover:bg-white"
            >
              <Eye size={16} />
              View on Instagram
            </a>
          )}
        </div>
      </div>
      <div className="p-5">
        <p className="line-clamp-2 text-sm text-slate-700 leading-relaxed">
          {reel.caption || "No caption"}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Heart size={13} className="text-pink-400" />
            {reel.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare size={13} className="text-blue-400" />
            {reel.comments_count ?? 0}
          </span>
        </div>
        <button
          onClick={onAutomate}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
        >
          <Play size={15} />
          Automate
        </button>
      </div>
    </div>
  );
}
