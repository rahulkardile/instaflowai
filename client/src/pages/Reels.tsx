import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../utils/api";
import Header from "../components/layout/Header";
import ReelCard from "../components/ReelCard";
import { Loader2 } from "lucide-react";

interface Reel {
  id: string;
  caption?: string;
  thumbnail_url?: string;
  media_url?: string;
  like_count?: number;
  comments_count?: number;
  permalink?: string;
}

export default function Reels() {
  const { data: reels = [], isLoading } = useQuery<Reel[]>({
    queryKey: ["reels"],
    queryFn: async () => {
      const { data } = await api.get("/instagram/reels");
      return Array.isArray(data?.data) ? data.data : [];
    },
    // Keep enabled to allow fetching when Instagram is connected
    enabled: true,
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50/80 pb-20">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <h1 className="text-3xl font-bold mb-6">Your Instagram Reels</h1>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin text-purple-500" />
            </div>
          ) : reels.length === 0 ? (
            <p className="text-center text-slate-600">No reels found. Post some reels on Instagram.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {reels.map((reel) => (
                <ReelCard key={reel.id} reel={reel} onAutomate={() => {}} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

