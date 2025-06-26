import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import api from "@/api";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  calculateHashesBatch,
  extractImageIdentifier,
} from "@/utils/imageHash";
import "../index.css";

/* ───────────────── 定数 ───────────────── */
const PRESETS = {
  square: { ratio: 1, label: "1:1" },
  fourFive: { ratio: 4 / 5, label: "4:5" },
  sixteenNine: { ratio: 9 / 16, label: "9:16" },
} as const;
const PER_PAGE = 10;

/* ───── 画像をプロキシ経由で読み込む関数 ───── */
const loadImageWithCORS = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";          // CORS 対応
    img.onload = () => resolve(img);
    img.onerror = () => {
      /* ---------- 失敗時: backend の proxy エンドポイントへ ---------- */
      const proxyImg = new Image();
      proxyImg.crossOrigin = "anonymous";
      proxyImg.onload = () => resolve(proxyImg);
      proxyImg.onerror = reject;
      proxyImg.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    };
    img.src = url;
  });
};

/* ───────────────── 型 ─────────────────── */
interface Props {
  phraseId: string;
}

/* ─────────────── util ─────────────────── */
const seenId = new Set<string>();
const seenHash = new Set<string>();
const clamp = (n: number, mi = 0.5, ma = 5) => (n < mi ? mi : n > ma ? ma : n);

/* ───────────────────────────────────────── */
export default function SelectBackground({ phraseId }: Props) {
  /* ----- 基本 state ----- */
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [view, setView] = useState<"grid" | "detail">("grid");
  const [chosen, setChosen] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<string>("");

  /* ----- クロップ / 描画 ----- */
  const [presetKey, setPresetKey] = useState<keyof typeof PRESETS>("square");
  const [dragging, setDragging] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");

  /* ----- ズーム / パン ----- */
  const [scale, setScale] = useState(1);
  const lastScale = useRef(1);
  const pointers = useRef<Map<number, PointerEvent>>(new Map());
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  const navigate = useNavigate();

  /* ───── 画像をプロキシ経由で読み込む関数 ───── */
  const loadImageWithCORS = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // CORS対応
      img.onload = () => resolve(img);
      img.onerror = () => {
        // CORSエラーの場合、プロキシ経由で再試行
        const proxyImg = new Image();
        proxyImg.crossOrigin = "anonymous";
        proxyImg.onload = () => resolve(proxyImg);
        proxyImg.onerror = reject;
        // バックエンドにプロキシエンドポイントがある場合
        proxyImg.src = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      };
      img.src = url;
    });
  };

  /* ───── 画像ロード ───── */
  const load = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const { data } = await api.get("/api/select", {
        params: { phrase_id: phraseId, page, per: PER_PAGE },
      });
      const { images: raws, content_id, text } = data;
      if (page === 1) {
        setContentId(content_id);
        if (text) setDraftText(text);
      }
      // URL ID 重複 → 軽量ハッシュ重複
      const stage1 = raws.filter((u: string) => {
        const id = extractImageIdentifier(u);
        if (seenId.has(id)) return false;
        seenId.add(id);
        return true;
      });
      const hashResults = await calculateHashesBatch(stage1);
      const uniq = hashResults
        .filter((r) => {
          if (!r.hash) return true;
          if (seenHash.has(r.hash)) return false;
          seenHash.add(r.hash);
          return true;
        })
        .map((r) => r.url);
      setImages((prev) => [...prev, ...uniq]);
      setPage((p) => p + 1);
      if (!uniq.length) setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, phraseId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───── ドラッグ矩形 ───── */
  const onImgDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setCrop({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
    lastPos.current = { x: e.clientX, y: e.clientY }; // パン開始位置
  };
  const onImgMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (dragging && crop) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCrop((c) => c && { ...c, w: e.clientX - rect.left - c.x, h: e.clientY - rect.top - c.y });
    } else if (dragging && !crop) {
      // パン
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setImgPos((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onImgUp = () => setDragging(false);

  /* ───── ピンチズーム + タッチパン ───── */
  const onPtrDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, e.nativeEvent);
    
    // 単一指の場合、パン開始位置を記録
    if (pointers.current.size === 1) {
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPtrMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, e.nativeEvent);
    
    if (pointers.current.size === 2) {
      // ピンチズーム処理
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const start = (p1 as any).s ?? dist;
      if (!(p1 as any).s) {
        (p1 as any).s = (p2 as any).s = dist;
        lastScale.current = scale;
      }
      setScale(clamp((dist / start) * lastScale.current));
    } else if (pointers.current.size === 1) {
      // 単一指でのパン処理
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      setImgPos((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const onPtrUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    pointers.current.forEach((p) => delete (p as any).s);
    
    // 最後の指が離れた時にパン状態をリセット
    if (pointers.current.size === 0) {
      lastPos.current = { x: 0, y: 0 };
    }
  };

/* ───── 保存→編集 ───── */
const goEdit = (bg: string | null = chosen) =>
    contentId && navigate(`/edit/${contentId}`, {
      /* 背景 URL  フレーズドラフトを渡す */
      state: { bg, draft: draftText },
    });

/** Canvas で実際に切り抜き → Blob URL を返す */
const renderCroppedImage = async (): Promise<string | null> => {
  if (!chosen || !canvasRef.current) return null;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d")!;

  try {
    // CORS対応で画像を読み込み
    const img = await loadImageWithCORS(chosen);
    
    // 表示中の画像要素のサイズを取得
    const displayImg = imgRef.current;
    if (!displayImg) return null;
    
    const rect = displayImg.getBoundingClientRect();
    const factorX = img.naturalWidth / rect.width;
    const factorY = img.naturalHeight / rect.height;

    // ① ユーザがドラッグした矩形優先
    let { x, y, w, h } = crop ?? { x: 0, y: 0, w: rect.width, h: rect.height };
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }

    const sx = x * factorX;
    const sy = y * factorY;
    const sw = w * factorX;
    const sh = h * factorY;

    // ② 出力サイズは幅 1080px 固定
    canvas.width = 1080;
    canvas.height = Math.round((1080 * sh) / sw);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    return await new Promise<string>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, "image/jpeg", 0.9);
    });
  } catch (error) {
    console.error('Failed to render cropped image:', error);
    return null;
  }
};

const cropAndSave = async () => {
  if (!contentId) return;

  try {
    /* ----- 画像を実際に切り抜く ----- */
    const croppedUrl = await renderCroppedImage();
    if (!croppedUrl) {
      alert('画像の切り抜きに失敗しました。もう一度お試しください。');
      return;
    }

    /* ----- 編集用メタを JSON で保持 ----- */
    const editorJSON = JSON.stringify({
      draft_text: draftText,
      crop: crop,
      scale,
      imgPos,
      preset: presetKey,
      mode,
    });

    /* ----- DB 更新 ----- */
    await api.put(`/api/contents/${contentId}`, {
      image_url: croppedUrl,
      editor_json: editorJSON,
      status: "draft",
    });

    /* ----- 次画面へ ----- */
    goEdit(croppedUrl);
  } catch (error) {
    console.error('Failed to crop and save:', error);
    alert('保存に失敗しました。もう一度お試しください。');
  }
};

  /* ──────────── JSX ───────────── */
  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh" }}>
      {/* ===== Grid View ===== */}
      {view === "grid" && (
        <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
            {images.map((url) => (
              <button key={url} type="button" style={{ border: 0, padding: 0 }} onClick={() => { setChosen(url); setView("detail"); setScale(1); setImgPos({ x: 0, y: 0 }); }}>
                <img src={url} style={{ width: "100%", height: 192, objectFit: "cover" }} loading="lazy" />
              </button>
            ))}
          </div>
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            {loading ? <Loader2 className="animate-spin inline" /> : <Button size="sm" variant="outline" onClick={load} disabled={!hasMore}>{hasMore ? "もっと見る" : "これ以上ありません"}</Button>}
          </div>
        </div>
      )}

      {/* ===== Detail View ===== */}
      {view === "detail" && chosen && (
        <>
          {/* top bar */}
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, background: "rgba(255,255,255,.92)", borderBottom: "1px solid #e5e7eb", display: "flex", gap: 8, padding: 8, flexWrap: "wrap" }}>
            <Button size="sm" variant="outline" onClick={() => setView("grid")}>戻る</Button>
            {Object.entries(PRESETS).map(([k, v]) => (
              <Button key={k} size="sm" variant={presetKey === k ? "default" : "outline"} onClick={() => setPresetKey(k as any)}>{v.label}</Button>
            ))}
            <Button size="sm" variant="outline" onClick={() => setMode((m) => (m === "horizontal" ? "vertical" : "horizontal"))}>{mode === "horizontal" ? "縦書き" : "横書き"}</Button>
          </div>

          {/* phrase draft */}
          {draftText && (
            <p className={`phrase-draft ${mode}`} style={{ position: "fixed", top: 46, left: 8, right: 8, zIndex: 35, maxWidth: mode === "vertical" ? "min-content" : "90%", padding: "2px 6px" }}>{draftText}</p>
          )}

          {/* image container */}
          <div style={{ position: "absolute", top: 46, bottom: 60, left: 0, right: 0, overflow: "auto", touchAction: "none" }} onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} onPointerCancel={onPtrUp}>
            <img ref={imgRef} src={chosen} alt="selected" draggable={false} onMouseDown={onImgDown} onMouseMove={onImgMove} onMouseUp={onImgUp} style={{ transform: `translate(${imgPos.x}px,${imgPos.y}px) scale(${scale})`, transformOrigin: "center top", maxWidth: "none", maxHeight: "none", userSelect: "none" }} />
            {/* Aspect frame */}
            {(() => {
              const { ratio } = PRESETS[presetKey];
              const vw = window.innerWidth * 0.9;
              let w = vw;
              let h = w / ratio;
              const vh = window.innerHeight * 0.6;
              if (h > vh) {
                h = vh;
                w = h * ratio;
              }
              return (
                <div style={{ pointerEvents: "none", position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: w, height: h, border: "2px solid #facc15", background: "rgba(0,0,0,.2)", zIndex: 30 }} />
              );
            })()}
          </div>

          {/* bottom bar */}
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, background: "rgba(255,255,255,.92)", borderTop: "1px solid #e5e7eb", display: "flex", gap: 12, justifyContent: "center", padding: 12 }}>
            <Button size="sm" variant="secondary" onClick={cropAndSave}>切り抜き→編集へ</Button>
            <Button size="sm" variant="outline" onClick={() => goEdit()}>背景だけ保存</Button>
          </div>
        </>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}