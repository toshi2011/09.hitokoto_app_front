import api from "../api";
import { StyleItem, OptionItem, ToneItem, ProfileItem } from "./prompt";

export const fetchStyles   = () => api.get<StyleItem[]>("/prompt/styles").then(r => r.data);
export const fetchOptions  = () => api.get<OptionItem[]>("/prompt/options").then(r => r.data);
export const fetchTones    = () => api.get<ToneItem[]>("/prompt/tones").then(r => r.data);
export const fetchProfiles = () => api.get<ProfileItem[]>("/prompt/profiles").then(r => r.data);
export const generateText = (body: {
       persona_id: string;      // 例: "user_001"
       style: string;           // 例: "poet"
       tone: string;            // 例: "bright_naive"
       options: string[];       // 例: ["osaka","boke_tsukkomi"]
       text: string;            // ユーザ入力文
     }) =>
       api
         .post<{ reply: string }>("/prompt/generate", body)
         .then((r) => r.data.reply);
