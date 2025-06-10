import api from "./api";
import { StyleItem, OptionItem, ToneItem, ProfileItem } from "./types/prompt";

export const fetchStyles   = () => api.get<StyleItem[]>("/prompt/styles").then(r => r.data);
export const fetchOptions  = () => api.get<OptionItem[]>("/prompt/options").then(r => r.data);
export const fetchTones    = () => api.get<ToneItem[]>("/prompt/tones").then(r => r.data);
export const fetchProfiles = () => api.get<ProfileItem[]>("/prompt/profiles").then(r => r.data);
export const generateText  = (profileId: string, text: string) =>
  api.post<{reply: string}>("/prompt/generate", { profile_id: profileId, text })
     .then(r => r.data.reply);
