import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import WebFont from "webfontloader";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/*
  ✨ ひとこと編集画面
  - 背景画像は SelectBackground → Crop で決めたものを location.state.bg から受け取る
  - 文字ボックスは GSAP Draggable でキャンバス内を自由に移動
  - フォント/サイズ/色/太字/斜体 をリアルタイム編集
  - 主要 UI は shadcn/ui の Button を活用（Tailwind CSS 対応）
*/

/** 動的ロード対象の Google Fonts
 * ここに追加すれば UI に自動反映される
 */
const FONT_FAMILIES = [
  "Noto Sans JP",
  "Roboto",
  "M PLUS Rounded 1c",
  "Kosugi Maru",
];

export default function EditContent() {
  const { contentId } = useParams<{ contentId: string }>();
  const location = useLocation() as { state: { bg: string; draft?: string } };
  const navigate = useNavigate();
  
  /* 受け取ったフレーズドラフトを初期値に利用 */
  const initialText = location.state?.draft ?? "ここに文字を入力";
  const bgUrl = location.state?.bg ?? ""; // 必須

  const textRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ------------------------ 文字スタイル state ------------------------ */
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]);
  const [fontSize, setFontSize] = useState(32); // px
  const [color, setColor] = useState("#ffffff");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  /* ------------------------ Google Fonts 動的ロード ------------------------ */
  useEffect(() => {
    WebFont.load({
      google: {
        families: [`${fontFamily}:wght@400;700&display=swap`],
      },
    });
  }, [fontFamily]);

  /* ------------------------ GSAP Draggable 初期化 ------------------------ */
  useEffect(() => {
    gsap.registerPlugin(Draggable);
    if (textRef.current && canvasRef.current) {
      Draggable.create(textRef.current, {
        bounds: canvasRef.current,
        inertia: true,
      });
    }
  }, []);

  /* ------------------------ textBox インライン style ------------------------ */
  const textStyle: React.CSSProperties = {
    fontFamily: `'${fontFamily}', sans-serif`,
    fontSize: `${fontSize}px`,
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? "italic" : "normal",
    color,
  };

  /* ------------------------ 戻るボタン ------------------------ */
  const handleBack = () => {
    navigate(-1); // 前のページに戻る
  };

  return (
    <div className="flex flex-col h-dvh bg-black">
      {/* ===== ヘッダーバー（戻るボタン） ===== */}
      <div className="flex items-center justify-between p-3 bg-black bg-opacity-50 backdrop-blur-sm relative z-50">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleBack}
          className="text-white hover:bg-white hover:bg-opacity-20"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          戻る
        </Button>
        <div className="text-white text-sm font-medium">テキスト編集</div>
        <div className="w-16"></div> {/* スペーサー */}
      </div>

      {/* ===== 編集キャンバス ===== */}
      <div className="flex-1 relative overflow-hidden">
        {/* 背景画像コンテナ - 9:16のアスペクト比を維持 */}
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <div 
            className="relative w-full h-full max-w-full max-h-full"
            style={{
              aspectRatio: "9/16",
            }}
          >
            {/* 実際の背景画像 */}
            <div
              ref={canvasRef}
              id="canvas"
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{
                backgroundImage: `url(${bgUrl})`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            >
              {/* テキスト要素 */}
              <div
                ref={textRef}
                className="absolute cursor-move select-none whitespace-pre-wrap"
                style={{
                  ...textStyle,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  maxWidth: "85%",
                  textAlign: "center",
                  lineHeight: "1.4",
                  textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                  padding: "8px",
                  wordWrap: "break-word",
                  hyphens: "auto",
                }}
                contentEditable
                suppressContentEditableWarning
              >
                {initialText}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ツールバー ===== */}
      <div className="bg-white border-t shadow-lg p-4 relative z-40">
        <div className="grid grid-cols-2 gap-4 text-sm max-w-md mx-auto">
          {/* フォントファミリ */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">フォント</span>
            <select
              className="border border-gray-300 rounded-md p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          {/* フォントサイズ */}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">サイズ: {fontSize}px</span>
            <input
              type="range"
              min={16}
              max={72}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </label>

          {/* フォントカラー */}
          <label className="flex items-center gap-3 col-span-2">
            <span className="text-xs font-medium text-gray-700">色</span>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-12 h-8 border border-gray-300 rounded cursor-pointer"
            />
            <span className="text-xs text-gray-500">{color}</span>
          </label>

          {/* 太字 & 斜体 */}
          <div className="flex items-center gap-3 col-span-2">
            <span className="text-xs font-medium text-gray-700">スタイル:</span>
            <Button
              size="sm"
              variant={bold ? "default" : "outline"}
              onClick={() => setBold((v) => !v)}
              className="font-bold"
            >
              B
            </Button>
            <Button
              size="sm"
              variant={italic ? "default" : "outline"}
              onClick={() => setItalic((v) => !v)}
              className="italic"
            >
              I
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}