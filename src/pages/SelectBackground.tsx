import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import axios from "axios";

interface Props {
  phraseId: string;
}

export default function SelectBackground({ phraseId }: Props) {
  const [images, setImages]     = useState<string[]>([]);
  const [contentId, setContent] = useState<string>();

  /* 画像３枚を取得 */
  useEffect(() => {
    if (!phraseId) return;
    (async () => {
      const r = await axios.get("/api/select", { params: { phrase_id: phraseId } });
      setImages(r.data.images);
      setContent(r.data.content_id);
    })();
  }, [phraseId]);

  /* 背景選択 → contents 更新 */
  const choose = async (url: string) => {
    if (!contentId) return;
    const editorJson = JSON.stringify({ background: url, animations: [] });
    await axios.put(`/api/contents/${contentId}`, {
      image_url: url,
      editor_json: editorJson,   // ← 変数名合わせ
    });
    // TODO: /edit 画面へ navigate など
    alert("背景を保存しました ✔");
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-center">背景画像を選んでください</h2>
      <Swiper spaceBetween={12} slidesPerView={2}>
        {images.map((url) => (
          <SwiperSlide key={url}>
            <img
              src={url}
              alt="背景候補"
              className="w-full cursor-pointer rounded-lg"
              onClick={() => choose(url)}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
