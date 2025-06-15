import React, { useEffect, useState } from "react";
import liff from "@line/liff";
import { createUserProfile } from "@/api";          // ← 1-3 で追加
import { StyleItem, ToneItem, OptionItem, fetchStyles, fetchTones, fetchOptions } from "@/api_prompt";

type Form = {
  line_id: string;
  mbti: string;
  birthplace: string;
  residence: string;
  job: string;
  gender: string;   // ★ 追加
  age: number;
  tone: string;
  style: string;
  options: string[];
};

export default function SettingsPage() {
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
//   const [tones, setTones]   = useState<ToneItem[]>([]);
  const [opts, setOpts]     = useState<OptionItem[]>([]);
  const [done, setDone]     = useState(false);

  // --- LIFF 初期化 ---
  useEffect(() => {
    (async () => {
              // init は main.tsx 済み。Mini-App では getContext() が推奨
              const ctxId = liff.getContext()?.userId;
              const lineId =
                ctxId ||
                (await liff.getProfile()).userId;   // 外部ブラウザ移行時フォールバック
              setForm(f => ({ ...f, line_id: lineId }));
    })();
    // マスタ取得
    fetchStyles().then(setStyles);
    // fetchTones().then(setTones);
    fetchOptions().then(setOpts);
  }, []);

  const update = (k: keyof Form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    await createUserProfile(form);
    setDone(true);
  };

  if (done) return (
    <div className="p-6 text-center">
      <p className="mb-4">設定を保存しました ✅</p>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => liff.closeWindow()}>
        LINE に戻る
      </button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">初期設定</h1>

      {/* ── MBTI & 基本属性 ────────────────── */}
      <div className="grid gap-4">
        <label className="block">
          MBTI
          <select className="border p-2 w-full"
                  value={form.mbti}
                  onChange={e => update("mbti", e.target.value)}>
            {["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP",
              "ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"]
              .map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <input className="border p-2" placeholder="出身地"
               value={form.birthplace} onChange={e=>update("birthplace",e.target.value)} />
        <input className="border p-2" placeholder="現住所"
               value={form.residence} onChange={e=>update("residence",e.target.value)} />
                <input className="border p-2" placeholder="職業"
               value={form.job} onChange={e=>update("job",e.target.value)} />

        {/* ── 性別 ── */}
        <label className="block">
          性別
          <select className="border p-2 w-full"
                  value={form.gender}
                  onChange={e=>update("gender", e.target.value)}>
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </label>

        {/* ── 年齢 ── */}
        <label className="block">
          年齢
          <input className="border p-2 w-full" type="number"
                 value={form.age} onChange={e=>update("age",e.target.value)} />
        </label>
      </div>

      {/* ── 文体／トーン／オプション ────────────────── */}
      <div className="grid gap-4">
        <label className="block">
          文体
          <select className="border p-2 w-full"
                  value={form.style}
                  onChange={e=>update("style",e.target.value)}>
            <option value="">（未選択）</option>
            {styles.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        {/* <label className="block">
          トーン
          <select className="border p-2 w-full"
                  value={form.tone}
                  onChange={e=>update("tone",e.target.value)}>
            <option value="">（未選択）</option>
            {tones.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label> */}
        <fieldset className="border p-2 rounded">
          <legend>オプション</legend>
          {opts.map(o=>(
            <label key={o.key} className="block">
              <input type="checkbox"
                     checked={form.options.includes(o.key)}
                     onChange={e=>{
                       update("options",
                         e.target.checked
                           ? [...form.options, o.key]
                           : form.options.filter(x=>x!==o.key));
                     }} />
              {o.label}
            </label>
          ))}
        </fieldset>
      </div>

      <button className="bg-green-600 text-white px-6 py-2 rounded w-full" onClick={submit}>
        保存
      </button>
    </div>
  );
}
