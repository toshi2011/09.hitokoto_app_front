import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initLiff } from "./initLiff";          // ★ 追加
import { Toaster } from "@/components/ui/sonner"; 

(async () => {
  try {
    await initLiff();                           // Mini-App 用初期化を待つ
  } catch (err) {
    console.error("LIFF init failed", err);     // 開発デバッグ用
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
    <App />
    <Toaster richColors />   {/* これで全ページがトースト可 */}
  </React.StrictMode>,
  );
})();
