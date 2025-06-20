import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { createUserProfile } from "@/api";
import {
  StyleItem,
  ToneItem,
  OptionItem,
  fetchStyles,
  // fetchTones,
  fetchOptions,
} from "@/api_prompt";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import classNames from "classnames"; // Tailwind のクラス合成


/* ----------------------------- 型定義 ----------------------------- */
type Form = {
  line_id: string;
  mbti: string;
  birthplace: string;
  residence: string;
  job: string;
  gender: string;
  age: number;
  tone: string;
  style: string;
  options: string[];
};

/* =========================== Component =========================== */
export default function SettingsPage() {
  /* --------------------------- state --------------------------- */
  const [form, setForm] = useState<Form>({
    line_id: "",
    mbti: "INTJ",
    birthplace: "",
    residence: "",
    gender: "other",
    age: 20,
    job: "",
    tone: "",
    style: "",
    options: [],
  });

  const [styles, setStyles] = useState<StyleItem[]>([]);
  // const [tones,  setTones]  = useState<ToneItem[]>([]);
  const [opts,   setOpts]   = useState<OptionItem[]>([]);

  const [done, setDone]         = useState(false);   // 既存: 完了画面切替
  const [isSaving, setIsSaving] = useState(false);

  /* --------------------------- effects --------------------------- */
  useEffect(() => {
    async function initLiff() {
      try {
        await liff.init({ liffId: import.meta.env.VITE_LIFF_ID! }); // ←ここ修正
        if (!liff.isLoggedIn()) {
          await liff.login();
        }
        const profile = await liff.getProfile();
        if (!profile.userId) {
          alert("LINEアカウントIDが取得できません。LIFF権限・設定を確認してください");
          return;
        }
        setForm(f => ({ ...f, line_id: profile.userId }));
      } catch (err) {
        alert("LIFF初期化エラー: " + (err as Error).message);
        // デバッグ用
        console.error("LIFF INIT ERROR:", err);
      }
    }
    initLiff();
    fetchStyles().then(setStyles);
    fetchOptions().then(setOpts);
  }, []);

  /* --------------------------- handlers --------------------------- */
  const update = (k: keyof Form, v: any) =>
    setForm((f) => ({ ...f, [k]: v }));

  /** 保存ボタン押下 */
  const submit = async () => {
    if (!form.line_id) {
      alert("LINEアカウント情報が取得できません。ページを再読込してください。");
      return;
    }
    setIsSaving(true);
    try {
      await createUserProfile(form);
      toast.success("設定を保存しました 🎉");
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  /* --------------------------- 完了画面 --------------------------- */
  if (done)
    return (
      <div className="p-6 text-center">
        <p className="mb-4">設定を保存しました ✅</p>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => liff.closeWindow()}
        >
          LINE に戻る
        </button>
      </div>
    );

  /* --------------------------- 入力画面 --------------------------- */
  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">初期設定</h1>

      {/* ── MBTI & 基本属性 ────────────────── */}
      <div className="grid gap-4">
        <label className="block">
          MBTI
          <select
            className="border p-2 w-full"
            value={form.mbti}
            onChange={(e) => update("mbti", e.target.value)}
          >
            {[
              "INTJ",
              "INTP",
              "ENTJ",
              "ENTP",
              "INFJ",
              "INFP",
              "ENFJ",
              "ENFP",
              "ISTJ",
              "ISFJ",
              "ESTJ",
              "ESFJ",
              "ISTP",
              "ISFP",
              "ESTP",
              "ESFP",
            ].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <input
          className="border p-2"
          placeholder="出身地"
          value={form.birthplace}
          onChange={(e) => update("birthplace", e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="現住所"
          value={form.residence}
          onChange={(e) => update("residence", e.target.value)}
        />
        <input
          className="border p-2"
          placeholder="職業"
          value={form.job}
          onChange={(e) => update("job", e.target.value)}
        />

        {/* ── 性別 ── */}
        <label className="block">
          性別
          <select
            className="border p-2 w-full"
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
          >
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </label>

        {/* ── 年齢 ── */}
        <label className="block">
          年齢
          <input
            className="border p-2 w-full"
            type="number"
            value={form.age}
            onChange={(e) => update("age", e.target.value)}
          />
        </label>
      </div>

      {/* ── 文体／トーン／オプション ────────────────── */}
      <div className="grid gap-4">
        <label className="block">
          文体
          <select
            className="border p-2 w-full"
            value={form.style}
            onChange={(e) => update("style", e.target.value)}
          >
            <option value="">（未選択）</option>
            {styles.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {/* トーンを有効にする場合はコメントアウトを外す
        <label className="block">
          トーン
          <select
            className="border p-2 w-full"
            value={form.tone}
            onChange={(e) => update("tone", e.target.value)}
          >
            <option value="">（未選択）</option>
            {tones.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </label> */}

        <fieldset className="border p-2 rounded">
          <legend>オプション</legend>
          {opts.map((o) => (
            <label key={o.key} className="block">
              <input
                type="checkbox"
                checked={form.options.includes(o.key)}
                onChange={(e) => {
                  update(
                    "options",
                    e.target.checked
                      ? [...form.options, o.key]
                      : form.options.filter((x) => x !== o.key)
                  );
                }}
              />
              {o.label}
            </label>
          ))}
        </fieldset>
      </div>

      {/* ── 保存ボタン ────────────────── */}
      <Button
        onClick={submit}
        disabled={isSaving}
        className={classNames(
          "w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded",
          { "opacity-70 pointer-events-none": isSaving }
        )}
      >
        {isSaving && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        )}
        {isSaving ? "保存中…" : "保存"}
      </Button>
    </div>
  );
}
