import React, { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import gsap from "gsap";
import Draggable from "gsap/Draggable";
import WebFont from "webfontloader";
import { Button } from "@/components/ui/button";

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
  const location = useLocation() as { state: { bg: string } };
  const bgUrl = location.state?.bg ?? ""; // 必須

  const textRef = useRef<HTMLDivElement>(null);

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
    if (textRef.current) {
      Draggable.create(textRef.current, {
        bounds: "#canvas",
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

  return (
    <div className="flex flex-col h-dvh">
      {/* ===== 編集キャンバス ===== */}
      <div
        id="canvas"
        className="relative flex-1 overflow-hidden bg-black"
        style={{
          backgroundImage: `url(${bgUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          ref={textRef}
          className="absolute top-1/2 left-1/2 cursor-move select-none whitespace-pre-wrap"
          style={textStyle}
          contentEditable
          suppressContentEditableWarning
        >
          ここに文字を入力
        </div>
      </div>

      {/* ===== ツールバー ===== */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-white border-t text-sm">
        {/* フォントファミリ */}
        <label className="flex flex-col gap-1">
          フォント
          <select
            className="border rounded p-1"
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
          サイズ: {fontSize}px
          <input
            type="range"
            min={12}
            max={128}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </label>

        {/* フォントカラー */}
        <label className="flex items-center gap-2 col-span-2">
          色
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </label>

        {/* 太字 & 斜体 */}
        <div className="flex items-center gap-2 col-span-2">
          <Button
            size="sm"
            variant={bold ? "secondary" : "outline"}
            onClick={() => setBold((v) => !v)}
          >
            B
          </Button>
          <Button
            size="sm"
            variant={italic ? "secondary" : "outline"}
            onClick={() => setItalic((v) => !v)}
          >
            I
          </Button>
        </div>
      </div>
    </div>
  );
}
