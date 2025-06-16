import api from './api';

const BASE = import.meta.env.VITE_API_URL || window.location.origin;

export interface StyleItem {
  key: string;
  label: string;
}

export interface ToneItem {
  key: string;
  label: string;
}

export interface OptionItem {
  key: string;
  label: string;
}

export const fetchStyles  = () => api.get<StyleItem[]>('/prompt/styles').then(r=>r.data);
export const fetchTones   = () => api.get<ToneItem[]>('/prompt/tones').then(r=>r.data);
export const fetchOptions = () => api.get<OptionItem[]>('/prompt/options').then(r=>r.data);
