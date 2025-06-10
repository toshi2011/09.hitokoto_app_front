import React, { useEffect, useState } from "react";
import { fetchProfiles, generateText } from "../types/api_prompt";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StyleItem, ToneItem, OptionItem } from "../types/prompt";
import { fetchStyles, fetchTones, fetchOptions } from "../types/api_prompt";

export default function PromptSelector() {
  const [profiles, setProfiles] = useState<{id: string; name: string}[]>([]);
  const [sel, setSel] = useState<string>("");
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");
  const [styles, setStyles] = useState<StyleItem[]>([]);
  const [tones, setTones] = useState<ToneItem[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [style,   setStyle]   = useState("");    // Select で選択
  const [tone,    setTone]    = useState("");
  const [selOpt,  setSelOpt]  = useState<string[]>([]); // ← 複数可
  const [personaId] = useState("user_001");      // 仮: ログイン時に置換

  useEffect(() => {
    fetchStyles().then(setStyles);
    fetchTones().then(setTones);
    fetchOptions().then(setOptions);
  }, []);

  // (4) オプション切替関数
  const toggle = (k:string)=> setSelOpt(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k]);

// (5) 送信
const run = async () => {
    if (!input) return;
    const reply = await generateText({
        persona_id: personaId,
        style, tone,
        options: selOpt,
        text: input,
    });
    setReply(reply);
    };

  return (
    <div className="space-y-4">
      <Select value={sel} onValueChange={setSel}>
        {profiles.map(p => (
          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
        ))}
      </Select>

      <input
        className="w-full rounded border p-2"
        placeholder="LINE で入力するつぶやき..."
        value={input}
        onChange={e => setInput(e.target.value)}
      />

      <Button className="w-full" onClick={run}>生成</Button>

      {reply && (
        <div className="rounded-xl bg-gray-50 p-4 whitespace-pre-wrap">{reply}</div>
      )}
    </div>
  );
}
