import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initLiff } from "./initLiff";          // ★ 追加
import { Toaster } from "@/components/ui/sonner"; 

(async () => {
  try {
    await initLiff();                           // Mini-App 用初期化を待つ
    /* ---------- 100vh バグ対策: 実高さを CSS 変数 --vh へ ---------- */
    function setRealVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }
    setRealVH();
    window.addEventListener("resize", setRealVH);
    window.addEventListener("orientationchange", setRealVH);
    /* --------------------------------------------------------------- */    

  } catch (err) {
    console.error("LIFF init failed", err);     // 開発デバッグ用
  }
  ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <BrowserRouter basename="/">        {/* ★ 追加 */}
          <App />
        </BrowserRouter>
        <Toaster richColors />
      </React.StrictMode>,
  );

})();
