// === apps/frontend/src/api.ts ===
import axios from 'axios';

/**
 * Axios インスタンス
 * BASE_URL は .env で指定（NEXT_PUBLIC_API_URL など）
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:9000',
  timeout: 7000,
});

export interface Phrase {
  phrase_id: string;
  text: string;
  image_url: string | null;
  created_at: string;
}

/** 投稿 */
export const createPhrase = (text: string) =>
  api.post<Phrase>('/phrases', { text }).then((r) => r.data);

/** 一覧取得 */
export const listPhrases = () =>
  api.get<Phrase[]>('/phrases').then((r) => r.data);

export default api;

export const updatePhrase = (id: string, text: string) =>
  api.patch<Phrase>(`/phrases/${id}`, { text }).then((r) => r.data);
