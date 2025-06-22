import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ← 追加
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
  const navigate = useNavigate(); // ← 追加

  /* 画像３枚を取得 */
  useEffect(() => {
    if (!phraseId) return;
    (async () => {
      const r = await api.get("/api/select", { params: { phrase_id: phraseId } });
      setImages(r.data.images);
      setContent(r.data.content_id);
    })();
  }, [phraseId]);

  /* 背景選択 → contents 更新＋フォント編集画面へ遷移 */
  const handleSelect = async (url: string) => {
    if (!contentId) return;
    setSaving(true);
    try {
      const editorJson = JSON.stringify({ background: url, animations: [] });
      await api.put(`/api/contents/${contentId}`, {
        image_url: url,
        editor_json: editorJson,
      });
      // 編集画面へ遷移 (2-4-1仕様)
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
