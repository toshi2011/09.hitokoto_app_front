import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import "../index.css"; // phrase‑draft などの既存クラス定義を流用

/* ---------------------------------- 定数 ---------------------------------- */
const PRESETS = {
  square: { w: 1080, h: 1080 },
  fourFive: { w: 1080, h: 1350 },
  nineNineteen: { w: 1080, h: 1920 },
} as const;

/* ---------------------------------- 型 ---------------------------------- */
interface Props {
  phraseId: string;
  phraseText: string; // POST テキスト＋選択フレーズ
}

/* ========================================================================== */
export default function SelectBackground({ phraseId }: Props) {
  /* ---------------------------- 共通ステート ---------------------------- */
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [chosen, setChosen] = useState<string | null>(null);
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const [contentId, setContentId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<string>("");

  /* --------------------------- クロップ関連 --------------------------- */
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('square');
  const [mode, setMode] = useState<'horizontal' | 'vertical'>('horizontal');
  const [dragging, setDragging] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const seenRef = useRef<Set<string>>(new Set());

  /* ----------------------------- Ref 群 ------------------------------ */
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chosenImgRef = useRef<HTMLImageElement | null>(null);

  /* ------------------------- ページング読込 -------------------------- */
  const PER_PAGE = 10;
  const load = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.get("/api/select", {
        params: { phrase_id: phraseId, page, per: PER_PAGE },
      });
      const { images: rawImgs, content_id, text } = res.data as {
        images: string[];
        content_id: string;
        text?: string;
      };
      if (page === 1) {
        setContentId(content_id);
        if (text) setDraftText(text);
      }
      const uniq = rawImgs.filter((u) => !seenRef.current.has(u));
      uniq.forEach((u) => seenRef.current.add(u));
      setImages((prev) => [...prev, ...uniq]);
      setPage((p) => p + 1);
      if (uniq.length === 0) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, phraseId]);

  /* ------------------------- 初回ロード ------------------------- */
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------ 実寸表示に合わせた中央枠計算 ------------------ */
  useLayoutEffect(() => {
    if (!chosen || view !== 'detail') {
      setFrame(null);
      return;
    }
    const { innerWidth: width, innerHeight: height } = window;
    const { w: pw, h: ph } = PRESETS[selectedPreset];
    const ratio = pw / ph;
    const maxWidth = width * 0.9;
    const maxHeight = height * 0.7;
    let w = maxWidth;
    let h = w / ratio;
    if (h > maxHeight) {
      h = maxHeight;
      w = h * ratio;
    }
    setFrame({ x: (width - w) / 2, y: (height - h) / 2, w, h });
  }, [selectedPreset, chosen, view]);

  /* ---------------------- 画面ドラッグでクロップ ---------------------- */
  const handleDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setCropRect({ x: e.clientX - left, y: e.clientY - top, w: 0, h: 0 });
  };
  const handleMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragging || !cropRect) return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setCropRect((r) => r && { ...r, w: e.clientX - left - r.x, h: e.clientY - top - r.y });
  };
  const handleUp = () => setDragging(false);

  /* --------------------- canvas へプレビュー描写 ---------------------- */
  useEffect(() => {
    if (!cropRect || !chosen || view !== 'detail') return;
    const canvas = canvasRef.current!;
    const imgEl = chosenImgRef.current!;
    const ctx = canvas.getContext('2d')!;
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    const { x, y, w, h } = cropRect;
    canvas.width = w * scaleX;
    canvas.height = h * scaleY;
    ctx.drawImage(imgEl, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, canvas.width, canvas.height);
  }, [cropRect, chosen, view]);

  /* ------------------------- 保存 / API 送信 ------------------------- */
  const save = async () => {
    if (!chosen || !contentId) return;
    await api.put(`/api/contents/${contentId}`, {
      image_url: chosen,
      editor_json: '{}',
      status: 'draft',
    });
    (window as any).liff?.closeWindow ? (window as any).liff.closeWindow() : alert('保存しました！');
  };

  const handleCrop = () => {
    if (!chosen || !cropRect) return;
    // TODO: canvas から Blob 化 → R2 へ PUT し URL を save()
    save();
  };

  /* ==================================================================== */
  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* ─── 上部バー ─── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, padding: 12 }}>
          {Object.entries(PRESETS).map(([key]) => (
            <Button key={key} size="sm" type="button" variant={selectedPreset === key ? 'default' : 'outline'} onClick={() => setSelectedPreset(key as keyof typeof PRESETS)}>
              {key === 'square' ? '1:1' : key === 'fourFive' ? '4:5' : '16:9'}
            </Button>
          ))}
          <Button size="sm" type="button" onClick={() => setMode((m) => (m === 'horizontal' ? 'vertical' : 'horizontal'))}>
            {mode === 'horizontal' ? '縦書き' : '横書き'}
          </Button>
          {view === 'detail' && (
            <Button size="icon" variant="ghost" type="button" onClick={() => setView('grid')}>
              <ArrowLeft className="size-4" />
            </Button>
          )}
        </div>
        {draftText && <div className={`phrase-draft ${mode}`}>{draftText}</div>}
      </div>

      {/* ─── GRID 画面 ─── */}
      {view === 'grid' && (
        <div style={{ position: 'absolute', inset: '70px 0 80px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {images.map((url) => (
              <button key={url} type="button" onClick={() => { setChosen(url); setView('detail'); }} style={{ border: chosen === url ? '4px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', padding: 0 }}>
                <img src={url} alt="候補画像" loading="lazy" style={{ width: '100%', height: 192, objectFit: 'cover', display: 'block' }} />
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {loading ? <Loader2 className="animate-spin inline" /> : <Button size="sm" variant="outline" type="button" disabled={!hasMore} onClick={load}>{hasMore ? 'もっと見る' : 'これ以上ありません'}</Button>}
          </div>
        </div>
      )}

      {/* ─── DETAIL 画面 ─── */}
      {view === 'detail' && chosen && (
        <div style={{ position: 'absolute', inset: '70px 0 80px', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', justifyContent: 'center' }}>
          <img src={chosen} ref={chosenImgRef} alt="selected" style={{ maxWidth: '100%', height: 'auto', objectFit: 'contain', userSelect: 'none' }} onMouseDown={handleDown} onMouseMove={handleMove} onMouseUp={handleUp} />
        </div>
      )}

      {/* ─── 下部バー ─── */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid #e5e7eb', padding: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
        <Button variant="secondary" size="sm" type="button" disabled={view !== 'detail'} onClick={handleCrop}>切り取り・保存</Button>
        <Button variant="outline" size="sm" type="button" disabled={view !== 'detail'} onClick={save}>背景だけ保存</Button>
      </div>

      {/* トリミング枠 */}
      {cropRect && view === 'detail' && (
        <div style={{ position: 'absolute', left: cropRect.x, top: cropRect.y + 70 /* ヘッダ分 */, width: cropRect.w, height: cropRect.h, border: '2px solid #facc15', background: 'rgba(0,0,0,.25)', pointerEvents: 'none', zIndex: 40 }} />
      )}

      {/* hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
