import React, { useEffect, useState, useCallback } from "react";
import { useLayoutEffect, useRef } from "react";
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
  const chosenImgRef = useRef<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

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

  // 中央に固定された比率枠を計算
  useLayoutEffect(() => {
    const { innerWidth: width, innerHeight: height } = window;
    const { w: pw, h: ph } = PRESETS[selectedPreset];
    const ratio = pw / ph;
    let w = width, h = width / ratio;
    if (h > height) { h = height; w = height * ratio; }
    setFrame({ x: (width - w) / 2, y: (height - h) / 2, w, h });
  }, [selectedPreset]);

  // ユーザー選択エリアをcanvasに描画（ドラッグ時 or 選択時）
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
    <div className="relative h-screen w-full overflow-hidden bg-background">
  
      {/* ── 上部固定バー ── */}
      <div className="fixed inset-x-0 top-0 bg-white/95 backdrop-blur border-b z-40">
        <div className="flex flex-wrap justify-center gap-2 p-3">
          {Object.entries(PRESETS).map(([key]) => (
            <Button
              key={key}
              variant={selectedPreset === key ? "default" : "outline"}
              size="sm"
              type="button"                              // ← ★ blank 画面対策
              onClick={() => setSelectedPreset(key as any)}
            >
              {key === "square" ? "1:1" : key === "fourFive" ? "4:5" : "16:9"}
            </Button>
          ))}
          <Button size="sm" type="button" onClick={() => setMode(m => m === "horizontal" ? "vertical" : "horizontal")}>
            {mode === "horizontal" ? "縦書き" : "横書き"}
          </Button>
        </div>
  
        {/* フレーズ下げてボタンに被らせない */}
        {draftText && (
          <div className={`phrase-draft ${mode}`}>{draftText}</div>
        )}
      </div>
  
      {/* ── 画像リスト（メインコンテンツエリア）── */}
      <div className="absolute inset-x-0 top-[120px] bottom-[80px] overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {images.map(url => (
            <button
              key={url}
              type="button"
              onClick={() => setChosen(url)}
              className={
                "relative group rounded-lg overflow-hidden border focus-visible:ring-2 focus-visible:ring-ring/50 " +
                (chosen === url ? "ring-4 ring-blue-500 border-blue-500" : "")
              }
            >
              <img
                src={url}
                alt="候補画像"
                className="h-48 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                ref={el => { if (chosen === url) chosenImgRef.current = el; }}
              />
              {chosen === url && (
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
  
        {/* もっと見る */}
        <div className="text-center py-4">
          {loading
            ? <Loader2 className="inline animate-spin" />
            : <Button variant="outline" size="sm" type="button" onClick={load}>もっと見る</Button>}
        </div>
      </div>
  
      {/* ── 下部固定バー ── */}
      <div className="fixed inset-x-0 bottom-0 bg-white/95 backdrop-blur border-t p-4 flex justify-center gap-3 z-40">
        <Button variant="secondary" disabled={!chosen} type="button" onClick={handleCrop}>
          切り取り・保存
        </Button>
        <Button variant="outline" disabled={!chosen} type="button" onClick={save}>
          背景だけ保存
        </Button>
      </div>
  
      {/* ── トリミング枠（最前面・中央固定）── */}
      {frame && (
        <div className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center">
          <div
            ref={rectRef}
            className="border-4 border-yellow-400 bg-black/25"
            style={{ width: frame.w, height: frame.h }}
          />
        </div>
      )}
    </div>
  );
}