import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import api from "@/api";

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
  const loadingRef = useRef(false); // 二重fetch防止

  // ページ単位で画像をfetch（10枚ずつ追加）
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

  // phraseIdが変わったら初期化
  useEffect(() => {
    setImages([]);
    setPage(1);
    setHasMore(true);
    fetchImages(1);
    // eslint-disable-next-line
  }, [phraseId]);

  // Swiper端到達時に次ページfetch
  const handleReachEnd = () => {
    if (hasMore && !loadingRef.current) {
      const next = page + 1;
      setPage(next);
      fetchImages(next);
    }
  };

  // 背景画像選択→API保存→編集画面遷移
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
      <Swiper
        spaceBetween={12}
        slidesPerView={3}
        breakpoints={{
          320: { slidesPerView: 2 },
          640: { slidesPerView: 3 },
        }}
        onReachEnd={handleReachEnd}
      >
        {images.map((url) => (
          <SwiperSlide key={url}>
            <img
              src={url}
              alt="背景候補"
              className="w-full aspect-[3/2] object-cover cursor-pointer rounded-lg"
              onClick={() => !saving && handleSelect(url)}
              style={{ opacity: saving ? 0.5 : 1 }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
