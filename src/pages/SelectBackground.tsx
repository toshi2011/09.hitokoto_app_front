import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import "../index.css"; // フレーズドラフト用 CSS

const PRESETS = {
  square: { w: 1080, h: 1080 },
  fourFive: { w: 1080, h: 1350 },
  nineNineteen: { w: 1080, h: 1920 },
};

type Props = {
  phraseId: string;
  phraseText: string; // POSTテキスト＋選択フレーズ
};

export default function SelectBackground({ phraseId, phraseText }: Props) {
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);

  // クロップ用 state
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('square');
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [draftText, setDraftText] = useState<string>("");
  type Rect = { x: number; y: number; w: number; h: number };
  const [cropRect, setCropRect] = useState<Rect | null>(null);   // ← 半透明矩形
  const rectRef = useRef<HTMLDivElement>(null);                  // ← overlay 用

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
        text?: string;
      };
      if (page === 1) setContentId(content_id);
      if (page === 1 && res.data.text) setDraftText(res.data.text);
      setImages(prev => [...prev, ...imgs]);
      setPage(p => p + 1);
    } finally {
      setLoading(false);
    }
  }, [phraseId, page, loading]);

  useEffect(() => {
    load();
    if (!cropRect || !chosen) return;
    const canvas  = canvasRef.current!;
    const imgEl   = imgRef.current!;
    const ctx     = canvas.getContext("2d")!;
    const scaleX  = imgEl.naturalWidth  / imgEl.clientWidth;
    const scaleY  = imgEl.naturalHeight / imgEl.clientHeight;
    const { x, y, w, h } = cropRect;
    canvas.width  = w * scaleX;
    canvas.height = h * scaleY;
    const img     = new Image();
    img.src       = chosen;
    img.onload    = () => {
      ctx.drawImage(
        img,
        x * scaleX, y * scaleY, w * scaleX, h * scaleY,   // src
        0, 0, canvas.width, canvas.height                 // dst
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cropRect, chosen]);

  const save = async () => {
    if (!chosen || !contentId) return;
    await api.put(`/api/contents/${contentId}`, {
      image_url: chosen,
      editor_json: "{}", // 編集結果は後で渡す
      status: "draft",
    });
    if ((window as any).liff?.closeWindow) {
      (window as any).liff.closeWindow();
    } else {
      alert("保存しました！\nLINE に戻ってください。");
    }
  };

  // --- handleMouseDown ---
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
  const { left, top } = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setCropRect({ x: e.clientX - left, y: e.clientY - top, w: 0, h: 0 });
};

  // --- handleMouseUp ---
const handleMouseUp = () => setDragging(false);

  // --- handleMouseMove ---
  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragging || !cropRect) return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setCropRect(r => r && ({ ...r,
        w: e.clientX - left - r.x,
        h: e.clientY - top  - r.y,
  }));
};

  const handleCrop = () => {
    if (!canvasRef.current || !imgRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const preset = PRESETS[selectedPreset];
    const imgEl = imgRef.current;
    canvas.width = preset.w;
    canvas.height = preset.h;
    const scale = imgEl.naturalWidth / imgEl.clientWidth;
    ctx.drawImage(
      imgEl,
      -offset.x * scale,
      -offset.y * scale,
      imgEl.naturalWidth,
      imgEl.naturalHeight
    );
    canvas.toBlob(blob => {
      if (blob) {
        // 保存ではなく next-step 呼び出しに変更可
        save();
      }
    });
  };

  return (
    <div className="h-dvh flex flex-col bg-white relative">
      <h1 className="text-2xl font-bold text-center my-2">背景を選択</h1>
      {/* ドラフトテキスト（phraseText/draftTextいずれか一方） */}
      {(phraseText || draftText) && (
        <div className={`phrase-draft ${mode} mb-2`}>
          {phraseText || draftText}
        </div>
      )}
  
      {/* プリセット＆縦横切替（画面上部に固定） */}
      <div className="flex flex-wrap gap-2 justify-center mb-2 sticky top-0 z-10 bg-white/95 backdrop-blur">
        {Object.entries(PRESETS).map(([key]) => (
          <Button
            key={key}
            variant={selectedPreset === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPreset(key as any)}
          >
            {key === 'square' ? '1:1' : key === 'fourFive' ? '4:5' : '9:19'}
          </Button>
        ))}
        <Button
          onClick={() => setMode(m => (m === 'horizontal' ? 'vertical' : 'horizontal'))}
          size="sm"
        >
          {mode === 'horizontal' ? '縦書き' : '横書き'}
        </Button>
      </div>
  
      {/* スクロールエリア（画像リスト＋プレビュー） */}
      <div className="flex-1 overflow-y-auto pb-44 relative z-0">
        {/* 画像グリッド */}
        <div className="grid grid-cols-2 gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              onClick={() => setChosen(url)}
              className={
                "relative group rounded-lg overflow-hidden border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 " +
                (chosen === url ? "ring-4 ring-blue-500 border-blue-500" : "")
              }
            >
              <img
                src={url}
                alt="候補画像"
                ref={i === 0 ? imgRef : undefined}
                className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              />

              {cropRect && chosen === url && (
                <div
                  ref={rectRef}
                  style={{
                    position: "absolute",
                    left:   Math.min(cropRect.x, cropRect.x + cropRect.w),
                    top:    Math.min(cropRect.y, cropRect.y + cropRect.h),
                    width:  Math.abs(cropRect.w),
                    height: Math.abs(cropRect.h),
                  }}
                  className="bg-black/30 border-2 border-yellow-400 pointer-events-none"
                />
              )}

              {chosen === url && (
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
  
        {/* トリミングプレビュー */}
        <div
          style={{
            width: PRESETS[selectedPreset].w / 4,
            height: PRESETS[selectedPreset].h / 4,
            overflow: 'hidden',
            position: 'relative',
            margin: '24px auto 0 auto'
          }}
        >
          <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
        </div>
      </div>
  
      {/* 下部固定の操作ボタン */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur p-4 pt-2 space-y-2 shadow-xl z-20">
        <div className="flex justify-center space-x-2 mb-2">
          <Button disabled={!chosen} variant="secondary" onClick={handleCrop}>切り取り・保存</Button>
          <Button disabled={!chosen} variant="outline" onClick={save}>選択背景だけ保存</Button>
        </div>
        <div className="flex justify-center">
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Button variant="outline" onClick={load} size="sm">もっと見る</Button>
          )}
        </div>
      </div>
    </div>
  );  
}
