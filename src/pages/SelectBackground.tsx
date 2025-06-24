/* --------------------------------------------------------------
   apps/frontend/src/pages/SelectBackground.tsx
   背景選択カルーセル – “どの画像も 1 画面に収まる” 改訂版
   -------------------------------------------------------------- */
   import { useState, useEffect, useRef } from "react";
   import { useNavigate } from "react-router-dom";
   import { Swiper, SwiperSlide } from "swiper/react";
   import { Navigation, Pagination } from "swiper/modules";
   import "swiper/css";
   import "swiper/css/navigation";
   import "swiper/css/pagination";
   import api from "@/api";
   import { Loader, Loader2 } from "lucide-react";
   
   /* -------- 型 -------- */
   interface Props { phraseId: string }
   
   /* ============================================================ */
   export default function SelectBackground({ phraseId }: Props) {
     /* ----- state ----- */
     const [images,    setImages]    = useState<string[]>([]);
     const [contentId, setContent]   = useState<string>();
     const [saving,    setSaving]    = useState(false);
     const [page,      setPage]      = useState(1);
     const [hasMore,   setHasMore]   = useState(true);
     const loadingRef               = useRef(false);
     const navigate                 = useNavigate();
   
     /* ----- 画像取得 ----- */
     const fetchImages = async (p: number) => {
       if (loadingRef.current || !phraseId || !hasMore) return;
       loadingRef.current = true;
       try {
         const r = await api.get("/api/select", {
           params: { phrase_id: phraseId, page: p, per: 10 },
         });
         setImages(prev => p === 1 ? r.data.images : [...prev, ...r.data.images]);
         setContent(r.data.content_id);
         if (r.data.images.length < 10) setHasMore(false);
       } finally {
         loadingRef.current = false;
       }
     };
   
     /* 初期ロード & phrase 変更時リロード */
     useEffect(() => {
       setImages([]); setPage(1); setHasMore(true);
       fetchImages(1);
       // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [phraseId]);
   
     /* ----- 末尾に到達したら次ページ取得 ----- */
     const handleReachEnd = () => {
       if (hasMore && !loadingRef.current) {
         const next = page + 1;
         setPage(next);
         fetchImages(next);
       }
     };
   
     /* ----- 画像選択 ----- */
     const handleSelect = async (url: string) => {
       if (!contentId) return;
       setSaving(true);
       try {
         const editorJson = JSON.stringify({ background: url, animations: [] });
         await api.put(`/api/contents/${contentId}`, {
           image_url: url,
           editor_json: editorJson,
         });
         navigate(`/edit/${contentId}`, { state: { imageUrl: url } });
       } catch {
         alert("保存に失敗しました");
       } finally {
         setSaving(false);
       }
     };
   
     /* =========================== JSX =========================== */
     return (
       <div className="p-4 space-y-4">
         <h2 className="text-xl font-bold text-center">背景画像を選んでください</h2>
   
         {/* ── 読み込みインジケータ（先頭ロード時のみ） */}
         {loadingRef.current && images.length === 0 && (
           <div className="flex justify-center py-10">
             <Loader className="h-6 w-6 motion-safe:animate-spin text-gray-400" />
           </div>
         )}
   
         <Swiper
           modules={[Navigation, Pagination]}
           navigation
           pagination={{ clickable: true }}
           slidesPerView={1}                /* ★ 1 枚＝全画面 */
           resistanceRatio={0}
           className="w-screen h-dvh"       /* ★ 100vw×100dvh で強制フィット */
           onReachEnd={handleReachEnd}
         >
           {images.map(url => (
             <SwiperSlide
               key={url}
               className="!w-screen !h-dvh flex justify-center items-center"
             >
               <img
                 src={url}                        /* Unsplash なら &w=1080&h=1920&fit=crop を付与しても OK */
                 alt="背景候補"
                 className="w-full h-full object-cover object-center"
                 onClick={() => !saving && handleSelect(url)}
               />
             </SwiperSlide>
           ))}
   
           {/* 無限スクロール中のスピナー用スライド */}
           {loadingRef.current && images.length > 0 && (
             <SwiperSlide className="flex items-center justify-center">
               <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
             </SwiperSlide>
           )}
         </Swiper>
       </div>
     );
   }
   