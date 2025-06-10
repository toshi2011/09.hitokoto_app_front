import React, { useEffect, useState } from "react";
import { fetchProfiles, generateText } from "../api_prompt";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function PromptSelector() {
  const [profiles, setProfiles] = useState<{id: string; name: string}[]>([]);
  const [sel, setSel] = useState<string>("");
  const [input, setInput] = useState("");
  const [reply, setReply] = useState("");

  useEffect(() => {
    fetchProfiles().then(p => setProfiles(p.map(i => ({ id: i.id, name: i.id }))));
  }, []);

  const run = async () => {
    if (!sel || !input) return;
    const { reply } = await generateText(sel, input);
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
