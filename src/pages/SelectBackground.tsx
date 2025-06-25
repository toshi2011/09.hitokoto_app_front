import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import "../index.css";

// ───────────────────────────────────────────────────────────
//  グリッド → 詳細 → クロップ UI
//   * グリッド画面 …… 画像サムネイルを 2 列グリッドで表示
//   * 詳細画面 …… 元サイズで 1 枚だけ表示（スクロールで全体確認）
//   * クロップ …… アスペクト比プリセットをボタンで切替、黄色枠表示
//   * 戻る …… 詳細 → グリッド へ必ず遷移（window.open 多重防止）
// ───────────────────────────────────────────────────────────

/* ── 重複 URL 排除用 ── */
const seenRef = new Set<string>(); // ファイルレベルで永続化

const PRESETS = {
  square: { w: 1080, h: 1080 },      // 1:1
  fourFive: { w: 1080, h: 1350 },   // 4:5
  nineNineteen: { w: 1080, h: 1920 } // 9:16
} as const;

type Props = {
  phraseId: string;
};

type Rect = { x: number; y: number; w: number; h: number };

export default function SelectBackground({ phraseId }: Props) {
  /* -------------------------------- state -------------------------------- */
  const [view, setView] = useState<'grid' | 'detail'>('grid');
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // 詳細用
  const [chosen, setChosen] = useState<string | null>(null);
  const chosenImgRef = useRef<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof PRESETS>('square');

  // クロップ描画
  const [dragging, setDragging] = useState(false);
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const PER_PAGE = 10;

  /* -------------------------------- 画像ロード -------------------------------- */
  const normalizeUrl = (url: string) => url.split('?')[0]; // ?w=… などを無視

  const load = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.get("/api/select", { params: { phrase_id: phraseId, page, per: PER_PAGE } });
      const rawImgs: string[] = res.data.images;
      const uniq = rawImgs.filter(u => !seenRef.has(normalizeUrl(u)));
      uniq.forEach(u => seenRef.add(normalizeUrl(u)));
      setImages(prev => [...prev, ...uniq]);
      if (uniq.length === 0) setHasMore(false);
      setPage(p => p + 1);
    } finally {
      setLoading(false);
    }
  }, [phraseId, page, loading, hasMore]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */}, []);

  /* -------------------------------- クロップ枠計算 -------------------------------- */
  useLayoutEffect(() => {
    if (!chosen) { setFrame(null); return; }
    const { innerWidth: w, innerHeight: h } = window;
    const { w: pw, h: ph } = PRESETS[selectedPreset];
    const ratio = pw / ph;
    // 画面の 80% を上限に計算
    let fw = w * 0.8;
    let fh = fw / ratio;
    if (fh > h * 0.6) { fh = h * 0.6; fw = fh * ratio; }
    setFrame({ x: (w - fw) / 2, y: (h - fh) / 2, w: fw, h: fh });
  }, [selectedPreset, chosen]);

  /* -------------------------------- クロップ Canvas 描画 -------------------------------- */
  useEffect(() => {
    if (!cropRect || !chosen || !chosenImgRef.current) return;
    const imgEl = chosenImgRef.current;
    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    const { x, y, w, h } = cropRect;
    const canvas = canvasRef.current!;
    canvas.width = w * scaleX;
    canvas.height = h * scaleY;

    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = chosen;
    img.onload = () => {
      ctx.drawImage(img, x * scaleX, y * scaleY, w * scaleX, h * scaleY, 0, 0, canvas.width, canvas.height);
    };
  }, [cropRect, chosen]);

  /* -------------------------------- 画像保存（ダミー） -------------------------------- */
  const save = () => {
    if (!chosen) return;
    // TODO: API 保存処理
    alert('保存しました (stub)');
  };

  /* -------------------------------- マウスイベント（ドラッグ矩形） -------------------------------- */
  const onMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setCropRect({ x: e.clientX - left, y: e.clientY - top, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragging || !cropRect) return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setCropRect(r => r && ({ ...r, w: e.clientX - left - r.x, h: e.clientY - top - r.y }));
  };
  const onMouseUp = () => setDragging(false);

  /* -------------------------------- JSX -------------------------------- */
  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', background: '#fff' }}>

      {/* ───── 上部バー ───── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: 'rgba(255,255,255,.95)', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
        {view === 'detail' && (
          <Button variant="ghost" size="sm" onClick={() => { setView('grid'); setChosen(null); }} style={{ padding: 6 }}>
            <ArrowLeft className="w-4 h-4" /> 戻る
          </Button>
        )}
        {Object.entries(PRESETS).map(([k]) => (
          <Button key={k} size="sm" variant={selectedPreset === k ? 'default' : 'outline'} onClick={() => setSelectedPreset(k as keyof typeof PRESETS)} style={{ padding: '6px 12px', fontSize: 12 }}>{k === 'square' ? '1:1' : k === 'fourFive' ? '4:5' : '9:16'}</Button>
        ))}
      </div>

      {/* ───── グリッド画面 ───── */}
      {view === 'grid' && (
        <div style={{ position: 'absolute', top: 60, bottom: 80, left: 0, right: 0, overflowY: 'auto', padding: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {images.map(url => (
              <button key={url} type="button" onClick={() => { setChosen(url); setView('detail'); }} style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', padding: 0 }}>
                <img src={url} alt="候補" style={{ display: 'block', width: '100%', height: 192, objectFit: 'cover' }} loading="lazy" />
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', padding: 16 }}>
            {loading ? <Loader2 className="animate-spin inline-block" /> : (
              <Button variant="outline" size="sm" onClick={load} disabled={!hasMore}>{hasMore ? 'もっと見る' : 'これ以上ありません'}</Button>
            )}
          </div>
        </div>
      )}

      {/* ───── 詳細画面 ───── */}
      {view === 'detail' && chosen && (
        <div style={{ position: 'absolute', top: 60, bottom: 80, left: 0, right: 0, overflow: 'auto' }}>
          <img
            ref={el => { chosenImgRef.current = el; }}
            src={chosen}
            alt="選択画像"
            style={{ display: 'block', maxWidth: 'none', height: 'auto' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          />
        </div>
      )}

      {/* ───── クロップ枠 ───── */}
      {view === 'detail' && frame && (
        <div style={{ position: 'fixed', left: frame.x, top: frame.y, width: frame.w, height: frame.h, border: '4px solid #facc15', background: 'rgba(0,0,0,.25)', zIndex: 900, pointerEvents: 'none' }} />
      )}

      {/* ───── 下部バー ───── */}
      {view === 'detail' && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,.95)', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', gap: 12, padding: 12, zIndex: 1000 }}>
          <Button size="sm" variant="secondary" disabled={!cropRect} onClick={save}>切り取り・保存</Button>
          <Button size="sm" variant="outline" disabled={!chosen} onClick={() => alert('背景だけ保存 (stub)')}>背景だけ保存</Button>
        </div>
      )}

      {/* Hidden canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
