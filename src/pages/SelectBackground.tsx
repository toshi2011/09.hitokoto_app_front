// === SelectBackground.tsx (100vh 対応リファクタ版) ===============
import { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

interface Props { phraseId: string; }

export default function SelectBackground({ phraseId }: Props) {
  /* ① 100vh バグ対策: 初回マウントで実高さを再計算 ----------- */
  useEffect(() => {
    const ev = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };
    ev();                   // mount 時
    window.addEventListener("resize", ev);
    window.addEventListener("orientationchange", ev);
    return () => {
      window.removeEventListener("resize", ev);
      window.removeEventListener("orientationchange", ev);
    };
  }, []);
  /* ----------------------------------------------------------- */

  /* ② fetch('/api/select?...') は割愛。ここではダミー画像配列 */
  const imgs = [
    `https://source.unsplash.com/random/1080x1920?sig=${phraseId}-1`,
    `https://source.unsplash.com/random/1080x1920?sig=${phraseId}-2`,
    `https://source.unsplash.com/random/1080x1920?sig=${phraseId}-3`,
  ];

  return (
    <div className="w-screen h-svh overflow-hidden pb-safe bg-black">
      <Swiper
        modules={[Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        slidesPerView={1}
        className="h-full w-full"
      >
        {imgs.map((url) => (
          <SwiperSlide key={url}>
            <div className="aspect-[9/16] max-h-svh mx-auto">
              <img
                src={url}
                alt="背景候補"
                className="w-full h-full object-cover object-center"
                decoding="async" loading="lazy"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
