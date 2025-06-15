import { Routes, Route } from "react-router-dom";
import SettingsPage from "@/pages/SettingsPage";
import DebugPhrases from "@/pages/DebugPhrases";          // 旧 App.tsx を 1:1 移動

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SettingsPage />} />
      <Route path="/debug" element={<DebugPhrases />} />   {/* 開発／E2E 用 */}
      <Route path="*" element={<p className="p-6">404 Not Found</p>} />
    </Routes>
  );
}
