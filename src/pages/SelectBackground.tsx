import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

/**
 * SelectBackground page
 * Props (when used standalone): phraseId (required)
 *
 * `/api/select` returns
 *   {
 *     content_id: string;
 *     images: string[];
 *     tags: string[];
 *     page: number;
 *     per: number;
 *   }
 */
export default function SelectBackground({ phraseId }: { phraseId: string }) {
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const PER_PAGE = 10;

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.get("/api/select", {
        params: { phrase_id: phraseId, page, per: PER_PAGE },
      });
      const { images: imgs, content_id } = res.data as {
        images: string[];
        content_id: string;
      };
      if (page === 1) setContentId(content_id);
      setImages((prev) => [...prev, ...imgs]);
      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }, [phraseId, page, loading]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!chosen || !contentId) return;
    await api.put(`/api/contents/${contentId}`, {
      image_url: chosen,
      editor_json: "{}", // placeholder – the canvas editor will fill later
      status: "draft",
    });
    // For now we just close LIFF window if inside LINE Mini App
    if ((window as any).liff && (window as any).liff.closeWindow) {
      (window as any).liff.closeWindow();
    } else {
      alert("保存しました！\nLINE に戻ってください。");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">背景を選択</h1>
      {/* grid */}
      <div className="grid grid-cols-2 gap-2">
        {images.map((url) => (
          <button
            key={url}
            onClick={() => setChosen(url)}
            className="relative group rounded-lg overflow-hidden border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <img
              src={url}
              alt="候補画像"
              className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {chosen === url && (
              <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Load more */}
      <div className="flex justify-center">
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Button variant="outline" onClick={load} size="sm">
            もっと見る
          </Button>
        )}
      </div>

      {/* Save button */}
      <Button
        disabled={!chosen}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={save}
      >
        この背景で保存する
      </Button>
    </div>
  );
}
