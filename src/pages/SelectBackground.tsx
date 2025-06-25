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
  const [cropRect, setCropRect] = useState<Rect | null>(null);
  const rectRef = useRef<HTMLDivElement>(null);
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

  // 中央に固定された比率枠を計算（画像選択時のみ表示）
  useLayoutEffect(() => {
    if (!chosen) {
      setFrame(null);
      return;
    }
    
    const { innerWidth: width, innerHeight: height } = window;
    const { w: pw, h: ph } = PRESETS[selectedPreset];
    const ratio = pw / ph;
    
    // 画面の80%を最大サイズとして計算
    const maxWidth = width * 0.8;
    const maxHeight = (height - 200) * 0.8; // 上下バー分を除く
    
    let w = maxWidth;
    let h = w / ratio;
    
    if (h > maxHeight) {
      h = maxHeight;
      w = h * ratio;
    }
    
    setFrame({ 
      x: (width - w) / 2, 
      y: ((height - 200) - h) / 2 + 120, // 上部バー分のオフセット
      w, 
      h 
    });
  }, [selectedPreset, chosen]);

  // 初回読み込み
  useEffect(() => {
    load();
  }, []);

  // クロップ用canvas描画
  useEffect(() => {
    if (!cropRect || !chosen) return;
    const canvas = canvasRef.current;
    const imgEl = chosenImgRef.current;
    if (!canvas || !imgEl) return;
    
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
        x * scaleX, y * scaleY, w * scaleX, h * scaleY,
        0, 0, canvas.width, canvas.height
      );
    };
  }, [cropRect, chosen]);

  const save = async () => {
    if (!chosen || !contentId) return;
    await api.put(`/api/contents/${contentId}`, {
      image_url: chosen,
      editor_json: "{}",
      status: "draft",
    });
    if ((window as any).liff?.closeWindow) {
      (window as any).liff.closeWindow();
    } else {
      alert("保存しました！\nLINE に戻ってください。");
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setDragging(true);
    setCropRect({ x: e.clientX - left, y: e.clientY - top, w: 0, h: 0 });
  };

  const handleMouseUp = () => setDragging(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!dragging || !cropRect) return;
    const { left, top } = e.currentTarget.getBoundingClientRect();
    setCropRect(r => r && ({ ...r,
        w: e.clientX - left - r.x,
        h: e.clientY - top - r.y,
    }));
  };

  const handleCrop = () => {
    if (!chosen || !chosenImgRef.current) return;
    
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const preset = PRESETS[selectedPreset];
    const imgEl = chosenImgRef.current;
    
    canvas.width = preset.w;
    canvas.height = preset.h;
    
    // 画像をcanvasに描画
    const img = new Image();
    img.src = chosen;
    img.onload = () => {
      // 画像を中央に配置してクロップ
      const imgAspect = img.width / img.height;
      const canvasAspect = preset.w / preset.h;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgAspect > canvasAspect) {
        // 画像が横長の場合
        drawHeight = preset.h;
        drawWidth = drawHeight * imgAspect;
        drawX = (preset.w - drawWidth) / 2;
        drawY = 0;
      } else {
        // 画像が縦長の場合
        drawWidth = preset.w;
        drawHeight = drawWidth / imgAspect;
        drawX = 0;
        drawY = (preset.h - drawHeight) / 2;
      }
      
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      
      canvas.toBlob(blob => {
        if (blob) {
          save();
        }
      });
    };
  };

  return (
    <div style={{ 
      position: 'relative', 
      height: '100vh', 
      width: '100%', 
      overflow: 'hidden', 
      display: 'flex',
      flexDirection: 'column'
    }}>
  
      {/* ── 上部固定バー ── */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e5e7eb',
        zIndex: 1000,
        padding: '0'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px'
        }}>
          {Object.entries(PRESETS).map(([key]) => (
            <Button
              key={key}
              variant={selectedPreset === key ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => setSelectedPreset(key as keyof typeof PRESETS)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                minWidth: '50px'
              }}
            >
              {key === "square" ? "1:1" : key === "fourFive" ? "4:5" : "16:9"}
            </Button>
          ))}
          <Button 
            size="sm" 
            type="button" 
            onClick={() => setMode(m => m === "horizontal" ? "vertical" : "horizontal")}
            style={{
              padding: '6px 12px',
              fontSize: '12px'
            }}
          >
            {mode === "horizontal" ? "縦書き" : "横書き"}
          </Button>
        </div>
      </div>
  
      {/* ── 画像リスト（メインコンテンツエリア）── */}
      <div style={{
        position: 'absolute',
        top: '70px',
        left: 0,
        right: 0,
        bottom: '80px',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '12px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '8px',
          marginBottom: '12px'
        }}>
          {images.map(url => (
            <button
              key={url}
              type="button"
              onClick={() => setChosen(url)}
              style={{
                position: 'relative',
                border: chosen === url ? '4px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                padding: '0',
                cursor: 'pointer'
              }}
            >
              <img
                src={url}
                alt="候補画像"
                style={{
                  height: '192px',
                  width: '100%',
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease',
                  display: 'block'
                }}
                loading="lazy"
                ref={el => { if (chosen === url) chosenImgRef.current = el; }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              />
              {chosen === url && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
  
        {/* もっと見る */}
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          {loading ? (
            <Loader2 style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }} />
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              type="button" 
              onClick={load}
              style={{
                padding: '8px 16px',
                fontSize: '14px'
              }}
            >
              もっと見る
            </Button>
          )}
        </div>
      </div>

      {/* ── フレーズドラフト（画像リスト上に固定表示）── */}
      {draftText && (
        <div 
          className={`phrase-draft ${mode}`}
          style={{
            position: 'fixed',
            top: '80px',
            left: '20px',
            right: '20px',
            zIndex: 500,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            fontSize: '14px',
            lineHeight: '1.4',
            textAlign: mode === 'horizontal' ? 'left' : 'center',
            writingMode: mode === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
            maxHeight: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {draftText}
        </div>
      )}
  
      {/* ── 下部固定バー ── */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid #e5e7eb',
        padding: '16px',
        display: 'flex',
        justifyContent: 'center',
        gap: '12px',
        zIndex: 1000
      }}>
        <Button 
          variant="secondary" 
          disabled={!chosen} 
          type="button" 
          onClick={handleCrop}
          style={{
            padding: '10px 20px',
            fontSize: '14px'
          }}
        >
          切り取り・保存
        </Button>
        <Button 
          variant="outline" 
          disabled={!chosen} 
          type="button" 
          onClick={save}
          style={{
            padding: '10px 20px',
            fontSize: '14px'
          }}
        >
          背景だけ保存
        </Button>
      </div>
  
      {/* ── トリミング枠（画像選択時に表示）── */}
      {frame && chosen && (
        <div 
          ref={rectRef}
          style={{
            position: 'fixed',
            left: `${frame.x}px`,
            top: `${frame.y}px`,
            width: `${frame.w}px`,
            height: `${frame.h}px`,
            border: '4px solid #facc15',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            zIndex: 800,
            pointerEvents: 'none'
          }}
        />
      )}

      {/* 非表示のcanvas要素 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <img ref={imgRef} style={{ display: 'none' }} alt="" />
    </div>
  );
}