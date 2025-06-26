import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Cropper, { Area, MediaSize } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { api } from "@/api";

/* ==============================================================
 *  定数
 * ==============================================================*/
const ASPECT_PRESETS = {
  square: 1 / 1,
  fourFive: 4 / 5,
  nineSixteen: 9 / 16,
  nineNineteen: 9 / 19, // (= 0.47368...) TikTok 推奨に合わせ枠を縦長に
};

/* ==============================================================
 *  ユーティリティ
 *   - 画像サイズに合わせた最小ズームを計算し
 *     枠が画像をはみ出さないようにする
 * ==============================================================*/
function calcMinZoom(
  imgW: number,
  imgH: number,
  containerW: number,
  containerH: number,
  aspect: number,
): number {
  // react‑easy‑crop のズームは "画像を拡大して枠内に収める係数" (1 = 等倍)
  // 枠が短辺にフィットするよう   minZoom = max(widthRatio, heightRatio)
  const fitW = containerW / imgW;
  const fitH = containerH / imgH;
  const fit = Math.max(fitW, fitH);

  // その上でアスペクトが極端に違う場合は追加倍率
  //   枠縦 = 横 / aspect
  const frameW = containerW;
  const frameH = frameW / aspect;
  const overH = frameH > containerH ? frameH / containerH : 1;

  return Number((fit * overH).toFixed(3)); // 端数切り捨てで暴走防止
}

/* ==============================================================
 *  Component
 * ==============================================================*/
interface Props {
  phraseId: string;
}

export default function SelectBackground({ phraseId }: Props) {
  /* ----- 画像一覧 & 選択中 ----- */
  const [images, setImages] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);

  /* ----- Cropper ----- */
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState<number>(ASPECT_PRESETS.nineSixteen);
  const [minZoom, setMinZoom] = useState(1);
  const mediaDims = useRef<MediaSize | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* ----- Phrase Draft 表示 ----- */
  const [draftText, setDraftText] = useState<string>("");
  const [mode, setMode] = useState<"horizontal" | "vertical">("horizontal");
  const draftRef = useRef<HTMLParagraphElement | null>(null);

  /* =================  初回ロード ================= */
  useEffect(() => {
    (async () => {
      const { data } = await api.get(`/api/select`, {
        params: { phrase_id: phraseId, page: 1, per: 10 },
      });
      setImages(data.images);
      setDraftText(data.text);
    })();
  }, [phraseId]);

  /* =================  draft 縦書き幅フィット ================= */
  useEffect(() => {
    if (!draftRef.current) return;
    if (mode === "vertical") {
      // inline‑block で必要幅だけに縮める
      draftRef.current.style.display = "inline-block";
      draftRef.current.style.width = "auto";
    } else {
      draftRef.current.style.display = "block";
      draftRef.current.style.width = "auto";
    }
  }, [mode, draftText]);

  /* =================  アスペクトボタン ================= */
  const changeAspect = useCallback(
    (ratio: number) => {
      setAspect(ratio);
      if (mediaDims.current && containerRef.current) {
        const { naturalWidth: w, naturalHeight: h } = mediaDims.current;
        const { clientWidth: cw, clientHeight: ch } = containerRef.current;
        const mz = calcMinZoom(w, h, cw, ch, ratio);
        setMinZoom(mz);
        setZoom(mz);
      }
    },
    [],
  );

  /* =================  onMediaLoaded で最小ズーム再計算 ================= */
  const handleMediaLoaded = useCallback(
    (size: MediaSize) => {
      mediaDims.current = size;
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const mz = calcMinZoom(
          size.naturalWidth,
          size.naturalHeight,
          clientWidth,
          clientHeight,
          aspect,
        );
        setMinZoom(mz);
        setZoom(mz);
      }
    },
    [aspect],
  );

  /* =================  Crop 完了（未使用だが保持） =============== */
  const pixelsArea = useRef<Area | null>(null);
  const handleCropComplete = useCallback((_: Area, p: Area) => {
    pixelsArea.current = p;
  }, []);

  /* =================  JSX ================= */
  const currentImg = images[activeIdx] || "";

  return (
    <div
      ref={containerRef}
      style={{ touchAction: "none" }} // 重要: Safari 17+ でドラッグ有効化
      className="relative h-svh w-full overflow-hidden bg-black pb-safe text-white"
    >
      {/* === 画像 & Cropper === */}
      {currentImg && (
        <Cropper
          image={currentImg}
          crop={crop}
          zoom={zoom}
          minZoom={minZoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
          onMediaLoaded={handleMediaLoaded}
          restrictPosition={false}
          objectFit="contain"
          style={{ containerStyle: { width: "100%", height: "100%" } }}
          showGrid={false}
        />
      )}

      {/* === アスペクト比ボタン === */}
      <div className="absolute right-3 top-[calc(env(safe-area-inset-top)+12px)] flex flex-col gap-2">
        <Button size="sm" onClick={() => changeAspect(ASPECT_PRESETS.square)}>
          1:1
        </Button>
        <Button size="sm" onClick={() => changeAspect(ASPECT_PRESETS.fourFive)}>
          4:5
        </Button>
        <Button size="sm" onClick={() => changeAspect(ASPECT_PRESETS.nineSixteen)}>
          9:16
        </Button>
        <Button size="sm" onClick={() => changeAspect(ASPECT_PRESETS.nineNineteen)}>
          9:19
        </Button>
      </div>

      {/* === ズーム UI (pinch + wheel) === */}
      <input
        type="range"
        min={minZoom}
        max={minZoom + 3}
        step={0.01}
        value={zoom}
        onChange={(e) => setZoom(Number(e.target.value))}
        className="absolute left-1/2 -translate-x-1/2 bottom-4 w-2/3"
      />

      {/* === Phrase Draft === */}
      {draftText && (
        <p
          ref={draftRef}
          className={`phrase-draft ${mode}`}
          style={{ pointerEvents: "none" }}
        >
          {draftText}
        </p>
      )}

      <Button
        size="sm"
        type="button"
        onClick={() =>
          setMode((m) => (m === "horizontal" ? "vertical" : "horizontal"))
        }
        className="absolute left-3 top-[calc(env(safe-area-inset-top)+12px)]"
      >
        {mode === "horizontal" ? "縦書き" : "横書き"}
      </Button>
    </div>
  );
}
