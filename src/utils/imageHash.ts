// apps/frontend/src/utils/imageHash.ts
// ------------------------------------------------------------
// 画像の高速・軽量な重複判定ユーティリティ（モバイル最適化）
// * 既存の画像取得／下書き保存ロジックから独立させ、どこからでも呼び出せるよう util 化
// * React / Vite 環境を想定しているため、Promise ベース + tree‑shakable ESM export のみ
// * **絶対に副作用を起こさない純関数** だけで構成
// ------------------------------------------------------------

/**
 * 画像 URL 1 枚に対し、4×4 = 16 ピクセルの縮小データから
 *   4bit × 16 = 64 bit ≒ 8 byte 程度のハッシュ文字列を生成します。
 * - CORS: crossorigin="anonymous" で取得できる URL 前提
 * - 失敗時は reject ではなく resolve(null) で呼び出し側に任せます
 */
export async function calculateLightweightImageHash(
    imageUrl: string,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
  
      img.onload = () => {
        try {
          const size = 4; // 4×4 ピクセル = 16
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(null);
  
          ctx.drawImage(img, 0, 0, size, size);
          const { data } = ctx.getImageData(0, 0, size, size);
  
          let hash = "";
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            // RGB の総和を 0‑15 に丸めて 16 進 1 桁へ
            const sum = Math.floor((r + g + b) / 48);
            hash += sum.toString(16);
          }
          resolve(hash);
        } catch {
          resolve(null);
        }
      };
  
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
  }
  
  /**
   * URL 配列を複数バッチ（size=3 デフォルト）で処理し、UI ブロックを最小化
   * - エラーや CORS 失敗は {success:false} で返す
   * - hash が null の場合は重複判定に使わずにそのまま採用する判断もしやすい
   */
  export interface HashResult {
    url: string;
    hash: string | null;
    success: boolean;
  }
  
  export async function calculateHashesBatch(
    imageUrls: string[],
    batchSize = 3,
  ): Promise<HashResult[]> {
    const results: HashResult[] = [];
    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (url): Promise<HashResult> => {
          const hash = await calculateLightweightImageHash(url);
          return { url, hash, success: !!hash };
        }),
      );
      results.push(...batchResults);
  
      if (i + batchSize < imageUrls.length) {
        // 10ms だけイベントループを解放して描画スレッドをブロックしない
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    return results;
  }
  
  /**
   * 既存の『URL 正規化ベースの簡易重複判定』を util 化
   * - 特定のサービス（Pixabay 等）の URL から一意となる ID を抽出
   * - fallback では pathname の末尾 2 セグメントで判定
   */
  export function extractImageIdentifier(url: string): string {
    try {
      const pixabay = url.match(/pixabay.com\/photo\/(\d+)/);
      if (pixabay) return pixabay[1];
  
      const match = url.match(/get\/([a-f0-9]+)/);
      if (match) return match[1];
  
      const u = new URL(url);
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length === 0) return url;
      const filename = parts.at(-1)!;
      const hashMatch = filename.match(/([a-f0-9]{8,})/);
      if (hashMatch) return hashMatch[1];
  
      // fallback: 末尾 2 セグメント連結
      return parts.slice(-2).join("/");
    } catch {
      return url;
    }
  }
  