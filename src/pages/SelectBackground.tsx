// === apps/frontend/src/pages/SelectBackground.tsx =========================
// 2025‑06‑26 merge – pinch‑zoom + /edit navigation + duplicate fix
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

/* ──────────────── 定数 / ヘルパ ────────────────── */
const PRESETS = {
  square: { w: 1080, h: 1080 },
  fourFive: { w: 1080, h: 1350 },
  nineNineteen: { w: 1080, h: 1920 },
} as const;

const PER_PAGE = 10;
const seenRef = new Set<string>();       // ★ グローバルで保持（コンポ再作成でも有効）

/**
 * Unsplash 等の URL 末尾 ?w=1080&… を削除して正規化。
 */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.search = "";              // クエリ文字列を除去して比較
    return u.toString();
  } catch {
    return raw.split("?")[0];
  }
}

/* ──────────────── 型定義 ───────────────────────── */
type Props = {
  phraseId: string;
};

/* ────────────────────────────────────────────────── */
export default function SelectBackground({ phraseId }: Props) {
  /* ─ state ─────────────────────────────── */
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [view, setView] = useState<"grid" | "detail">("grid");
  const [chosen, setChosen] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);

  // crop
  const [selectedPreset, setSelectedPreset] =
    useState<keyof typeof PRESETS>("square");
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");
  const [cropRect, setCropRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chosenImgRef = useRef<HTMLImageElement | null>(null);

  // pinch‑zoom（DETAIL 画面専用）
  const [scale, setScale] = useState(1);
  const lastScaleRef = useRef(1);
  const pointers = useRef<Map<number, React.PointerEvent>>(new Map());

  const navigate = useNavigate();

  /* ──────────── 画像ロード ───────────── */
  const load = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.get("/api/select", {
        params: { phrase_id: phraseId, page, per: PER_PAGE },
      });
      const { images: rawImgs, content_id } = res.data as {
        images: string[];
        content_id: string;
      };
      if (page === 1) setContentId(content_id);

      // ---------- 重複排除 ---------- //
      const uniq = rawImgs.filter((u) => {
        const key = normalizeUrl(u);
        if (seenRef.has(key)) return false;
        seenRef.add(key);
        return true;
      });
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

  /* ──────────── crop canvas 描画 ─────────── */
  useEffect(() => {
    if (!cropRect || !chosen || !chosenImgRef.current) return;
    const canvas = canvasRef.current!;
    const imgEl = chosenImgRef.current!;
    const ctx = canvas.getContext("2d")!;

    const scaleX = imgEl.naturalWidth / imgEl.clientWidth;
    const scaleY = imgEl.naturalHeight / imgEl.clientHeight;
    const { x, y, w, h } = cropRect;

    canvas.width = w * scaleX;
    canvas.height = h * scaleY;

    const img = new Image();
    img.src = chosen;
    img.onload = () => {
      ctx.drawImage(
        img,
        x * scaleX,
        y * scaleY,
        w * scaleX,
        h * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    };
  }, [cropRect, chosen]);

  /* ──────────── 保存 & /edit 遷移 ────────── */
  const routeToEdit = useCallback(() => {
    if (!contentId) return;
    navigate(`/edit/${contentId}`, {
      state: { backgroundUrl: chosen },
      replace: false,
    });
  }, [navigate, contentId, chosen]);

  const handleCropAndSave = async () => {
    if (!chosen || !contentId) return;
    // ※ 本来は Blob をアップロード → 下書き保存
    await api.put(`/api/contents/${contentId}`, {
      image_url: chosen,
      editor_json: "{}",
      status: "draft",
    });
    routeToEdit();
  };

  /* ──────────── pointer pinch handlers ───── */
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, e);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e);
    if (pointers.current.size === 2) {
      const evts = [...pointers.current.values()];
      const dist = Math.hypot(
        evts[0].clientX - evts[1].clientX,
        evts[0].clientY - evts[1].clientY,
      );
      const start = (evts[0] as any).startDist ?? dist;
      if (!(evts[0] as any).startDist) {
        (evts[0] as any).startDist = dist;
        (evts[1] as any).startDist = dist;
        lastScaleRef.current = scale;
      }
      const next = Math.min(5, Math.max(1, (dist / start) * lastScaleRef.current));
      setScale(next);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      // reset startDist for next gesture
      pointers.current.forEach((v) => {
        delete (v as any).startDist;
      });
    }
  };

  /* ──────────── Render ───────────────────── */
  return (
    <div
      style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}
    >
      {/* ========= GRID VIEW ========= */}
      {view === "grid" && (
        <>
          {/* 画像リスト */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              overflowY: "auto",
              padding: "12px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,1fr)",
                gap: "8px",
              }}
            >
              {images.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => {
                    setChosen(url);
                    setView("detail");
                    setScale(1);
                  }}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    overflow: "hidden",
                    padding: 0,
                    background: "transparent",
                  }}
                >
                  <img
                    src={url}
                    style={{ width: "100%", height: 192, objectFit: "cover" }}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            {/* もっと見る */}
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              {loading ? (
                <Loader2 style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Button size="sm" variant="outline" onClick={load} disabled={!hasMore}>
                  {hasMore ? "もっと見る" : "これ以上ありません"}
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========= DETAIL VIEW ========= */}
      {view === "detail" && chosen && (
        <>
          {/* top bar */}
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              background: "rgba(255,255,255,.9)",
              borderBottom: "1px solid #e5e7eb",
              zIndex: 20,
              display: "flex",
              gap: 8,
              padding: 8,
              justifyContent: "space-between",
            }}
          >
            <Button size="sm" variant="outline" onClick={() => setView("grid")}>戻る</Button>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(PRESETS).map(([k]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={selectedPreset === k ? "default" : "outline"}
                  onClick={() => setSelectedPreset(k as keyof typeof PRESETS)}
                >
                  {k === "square" ? "1:1" : k === "fourFive" ? "4:5" : "16:9"}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setMode((m) => (m === "horizontal" ? "vertical" : "horizontal"))}
              >
                {mode === "horizontal" ? "縦書き" : "横書き"}
              </Button>
            </div>
          </div>

          {/* image container */}
          <div
            style={{
              position: "absolute",
              top: 48,
              bottom: 0,
              left: 0,
              right: 0,
              overflow: "auto",
              touchAction: "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              ref={(el) => {
                if (el) chosenImgRef.current = el;
              }}
              src={chosen}
              alt="選択画像"
              style={{
                display: "block",
                transform: `scale(${scale})`,
                transformOrigin: "center top",
                maxWidth: "none", // 自然サイズ
                maxHeight: "none",
              }}
              draggable={false}
            />
          </div>

          {/* bottom actions */}
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(255,255,255,.95)",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              gap: 12,
              justifyContent: "center",
              padding: "12px 0",
            }}
          >
            <Button size="sm" variant="secondary" onClick={handleCropAndSave}>
              切り抜き→編集へ
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={routeToEdit}
            >
              背景だけ保存
            </Button>
          </div>
        </>
      )}

      {/* hidden canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
