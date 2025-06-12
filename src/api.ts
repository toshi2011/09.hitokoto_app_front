// ===  apps/frontend/src/api.ts (Authorization ヘッダー自動付与) ===
import axios from 'axios';

/**
 * Axios インスタンス
 * BASE_URL は .env で指定（NEXT_PUBLIC_API_URL など）
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:9000',
  timeout: 7000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("line_id_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface Phrase {
  phrase_id: string;
  text: string;
  image_url: string | null;
  created_at: string;
}

/** 投稿 */
export const createPhrase = (text: string) =>
  api.post<Phrase>('/api/phrases', { text }).then((r) => r.data);

/** 一覧取得 */
export const listPhrases = () =>
  api.get<Phrase[]>('/api/phrases').then((r) => r.data);

export default api;

export const updatePhrase = (id: string, text: string) =>
  api.patch<Phrase>(`/phrases/${id}`, { text }).then((r) => r.data);
