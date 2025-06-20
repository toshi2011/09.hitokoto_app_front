import liff from "@line/liff";

/** LINE MINI App / LIFF 共通初期化 */
export async function initLiff() {
  if (liff.isLoggedIn()) return;              // 二重初期化防止
  await liff.init({
    liffId: import.meta.env.VITE_LIFF_ID,
  });
}
