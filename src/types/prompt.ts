export interface StyleItem   { key: string; label: string }
export interface OptionItem  { key: string; label: string }
export interface ToneItem    { key: string; label: string }
export interface ProfileItem {
  id: string;
  name: string;        // UI 表示用
  tone: string;
  style: string;
  options: string[];
}
