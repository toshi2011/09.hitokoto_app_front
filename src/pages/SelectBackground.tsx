import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import api from "@/api";
import { Loader2 } from "lucide-react";          // ← スピナー用:contentReference[oaicite:5]{index=5}

interface Props {
  phraseId: string;
}

export default function SelectBackground({ phraseId }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [contentId, setContent] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const navigate = useNavigate();
  const loadingRef = useRef(false);

  const fetchImages = async (p: number) => {
    if (loadingRef.current || !phraseId || !hasMore) return;
    loadingRef.current = true;
    try {
      const r = await api.get("/api/select", {
        params: { phrase_id: phraseId, page: p, per: 10 },
      });
      setImages((prev) => p === 1 ? r.data.images : [...prev, ...r.data.images]);
      setContent(r.data.content_id);
      if (r.data.images.length < 10) setHasMore(false);
    } finally {
      loadingRef.current = false;
    }
  };

  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
    fetchImages(1);
    // eslint-disable-next-line
  }, [phraseId]);

  const handleReachEnd = () => {
    if (hasMore && !loadingRef.current) {
      const next = page  +1;
      setPage(next);
      fetchImages(next);
    }
  };

  const handleSelect = async (url: string) => {
    if (!contentId) return;
    setSaving(true);
    try {
      const editorJson = JSON.stringify({ background: url, animations: [] });
      await api.put(`/api/contents/${contentId}`, {
        image_url: url,
        editor_json: editorJson,
      });
      navigate(`/edit/${contentId}`, { state: { imageUrl: url } });
    } catch (e) {
      alert("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-center">背景画像を選んでください</h2>
      {/* 読み込み中インジケータ */}
      {loadingRef.current && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 motion-safe:animate-spin text-gray-500" />
        </div>
      )}
      <div className="w-full max-w-[360px] mx-auto">
        <Swiper
          spaceBetween={12}
          slidesPerView={2}
          breakpoints={{
            320: { slidesPerView: 1 },
            480: { slidesPerView: 2 },
            640: { slidesPerView: 3 },
          }}
          onReachEnd={handleReachEnd}
        >
          {images.map((url) => (
            <SwiperSlide key={url}>
              <img
                src={url}
                alt="背景候補"
                className="w-full aspect-[9/16] object-cover cursor-pointer rounded-lg"
                onClick={() => !saving && handleSelect(url)}
                style={{ opacity: saving ? 0.5 : 1 }}
                draggable={false}
              />
            </SwiperSlide>
          ))}
          {/* 無限スクロール時のスピナー slide */}
          {loadingRef.current && (
            <SwiperSlide className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </SwiperSlide>
          )}          
        </Swiper>
      </div>
    </div>
  );
}
