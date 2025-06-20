import liff from "@line/liff";

/** LINE MINI App / LIFF 共通初期化 */
export async function initLiff() {
  // 1. 必ず先に liff.init()
  await liff.init({
    liffId: import.meta.env.VITE_LIFF_ID,
  });

  // 2. その後でログイン判定
  if (!liff.isLoggedIn()) {
    await liff.login();
  }
}