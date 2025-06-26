import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "../index.css";
import {
  calculateHashesBatch,
  extractImageIdentifier,
} from "@/utils/imageHash";

/* ──────────────── 定数 ─────────────────────────── */
const PRESETS = {
  square: { w: 1080, h: 1080 },
  fourFive: { w: 1080, h: 1350 },
  nineNineteen: { w: 1080, h: 1920 },
} as const;
const PER_PAGE = 10;

/* ──────────────── 型 ───────────────────────────── */
interface Props {
  phraseId: string;
}

/* ──────────────── util ─────────────────────────── */
const seenId = new Set<string>(); // URL ID 重複判定
const seenHash = new Set<string>(); // 軽量ハッシュ重複判定

function clamp(n: number, min = 0.5, max = 5) {
  return Math.min(max, Math.max(min, n));
}

/* ─────────────────────────────────────────────────── */
export default function SelectBackground({ phraseId }: Props) {
  /* -------   共通 state  ------- */
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState<"grid" | "detail">("grid");
  const [chosen, setChosen] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<string>("");

  /* -------   クロップ state ------- */
  const [selectedPreset, setSelectedPreset] =
    useState<keyof typeof PRESETS>("square");
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chosenImgRef = useRef<HTMLImageElement | null>(null);
  /* フレーム可視用 */
  const [showFrame, setShowFrame] = useState(false);

  /* -------   ピンチズーム state ------- */
  const [scale, setScale] = useState(1);
  const lastScale = useRef(1);
  const pointers = useRef<Map<number, PointerEvent>>(new Map());

  const navigate = useNavigate();

  /* ──────────── 画像読み込み ───────────── */
  const load = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.get("/api/select", {
        params: { phrase_id: phraseId, page, per: PER_PAGE },
      });
      const { images: rawImgs, content_id, text } = res.data as any;
      if (page === 1) {
        setContentId(content_id);
        if (text) setDraftText(text);
      }
      // --- 1st: URL ID 重複除外 ---
      const stage1 = rawImgs.filter((u: string) => {
        const id = extractImageIdentifier(u);
        if (seenId.has(id)) return false;
        seenId.add(id);
        return true;
      });
      // --- 2nd: 軽量ハッシュ重複除外 ---
      const hashResults = await calculateHashesBatch(stage1);
      const uniq = hashResults.filter((r) => {
        if (!r.hash) return true;
        if (seenHash.has(r.hash)) return false;
        seenHash.add(r.hash);
        return true;
      }).map((r) => r.url);

      setImages((prev) => [...prev, ...uniq]);
      setPage((p) => p + 1);
      if (uniq.length === 0) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, phraseId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ──────────── ドラッグ矩形 ───────────── */
  const onMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setCropRect({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
  };
  const onMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragging || !cropRect) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setCropRect((r) => r && { ...r, w: e.clientX - rect.left - r.x, h: e.clientY - rect.top - r.y });
  };
  const onMouseUp = () => setDragging(false);

  /* ──────────── ピンチズーム ────────────── */
  const onPtrDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, e.nativeEvent);
  };
  const onPtrMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e.nativeEvent);
    if (pointers.current.size === 2) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const start = (p1 as any).startDist ?? dist;
      if (!(p1 as any).startDist) {
        (p1 as any).startDist = (p2 as any).startDist = dist;
        lastScale.current = scale;
      }
      const next = clamp((dist / start) * lastScale.current, 0.5, 5);
      setScale(next);
    }
  };
  const onPtrUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pointers.current.forEach((p) => delete (p as any).startDist);
    }
  };

  /* ──────────── 保存 → 編集画面へ ─────────── */
  const goEdit = () => {
    if (!contentId) return;
    navigate(`/edit/${contentId}`, { state: { bg: chosen } });
  };
  const handleCropSave = async () => {
    if (!chosen || !contentId) return;
    await api.put(`/api/contents/${contentId}`, { image_url: chosen, editor_json: "{}", status: "draft" });
    goEdit();
  };

  /* ──────────── JSX ─────────────────────── */
  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      {/* ---------- GRID ---------- */}
      {view === "grid" && (
        <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
            {images.map((url) => (
              <button key={url} type="button" style={{ padding: 0, border: 0 }} onClick={() => { setChosen(url); setView("detail"); setScale(1); setShowFrame(false); }}>
                <img src={url} loading="lazy" style={{ width: "100%", height: 192, objectFit: "cover" }} />
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            {loading ? <Loader2 className="animate-spin inline" /> : <Button size="sm" variant="outline" onClick={load} disabled={!hasMore}>{hasMore ? "もっと見る" : "これ以上ありません"}</Button>}
          </div>
        </div>
      )}

      {/* ---------- DETAIL ---------- */}
      {view === "detail" && chosen && (
        <>
          {/* top bar */}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,.9)", borderBottom: "1px solid #e5e7eb", display: "flex", flexWrap: "wrap", gap: 8, padding: 8 }}>
            <Button size="sm" variant="outline" onClick={() => setView("grid")}>戻る</Button>
            {Object.entries(PRESETS).map(([k]) => (
              <Button key={k} size="sm" variant={selectedPreset === k ? "default" : "outline"} onClick={() => { setSelectedPreset(k as any); setShowFrame(true); }}>
                {k === "square" ? "1:1" : k === "fourFive" ? "4:5" : "16:9"}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setMode((m) => (m === "horizontal" ? "vertical" : "horizontal"))}>
              {mode === "horizontal" ? "縦書き" : "横書き"}
            </Button>
          </div>

          {/* phrase draft */}
          {draftText && (
            <p className={`phrase-draft ${mode}`} style={{ position: "fixed", top: 52, left: 8, right: 8, zIndex: 45 }}>{draftText}</p>
          )}

          {/* image container */}
          <div style={{ position: "absolute", inset: "52px 0 60px", overflow: "auto", touchAction: "none" }} onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} onPointerCancel={onPtrUp}>
            <img ref={(el) => { if (el) chosenImgRef.current = el; }} src={chosen} alt="selected" style={{ transform: `scale(${scale})`, transformOrigin: "center top", maxWidth: "none", maxHeight: "none", userSelect: "none" }} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} draggable={false} />
          </div>

          {/* aspect frame */}
          {showFrame && (() => {
            const { w, h } = PRESETS[selectedPreset];
            const ratio = h / w;
            const screenW = window.innerWidth * 0.9;
            return (
              <div style={{ pointerEvents: "none", position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: screenW, height: screenW * ratio, border: "3px solid #facc15", background: "rgba(0,0,0,.2)", zIndex: 40 }} />
            );
          })()}

          {/* bottom bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "rgba(255,255,255,.95)", borderTop: "1px solid #e5e7eb", display: "flex", justifyContent: "center", gap: 12, padding: 12 }}>
            <Button size="sm" variant="secondary" onClick={handleCropSave}>切り抜き→編集へ</Button>
            <Button size="sm" variant="outline" onClick={goEdit}>背景だけ保存</Button>
          </div>
        </>
      )}

      {/* hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
