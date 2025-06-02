import { useEffect, useState } from "react";
import axios from "axios";
import PhraseCard from "./components/PhraseCard";

type Phrase = {
  phrase_id: string;
  text: string;
  image_url?: string;
  created_at: string;
};

function App() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [text, setText] = useState("");

  const fetchPhrases = async () => {
    const res = await axios.get<Phrase[]>(`/api/phrases?limit=20`);
    setPhrases(res.data);
  };

  const submit = async () => {
    if (!text) return;
    await axios.post<Phrase>(`/api/phrases`, { text });
    setText("");
    fetchPhrases();
  };

  useEffect(() => {
    fetchPhrases();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">今日のひとこと</h1>
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 border p-2 rounded"
          placeholder="ひとこと入力"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={submit}>
          投稿
        </button>
      </div>
      <div className="grid gap-4">
        {phrases.map((p) => (
          <PhraseCard key={p.phrase_id} phrase={p} />
        ))}
      </div>
    </div>
  );
}

export default App;