import React, { useEffect, useState } from 'react';
import { listPhrases, Phrase } from '../api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { PhraseCard } from '../components/PhraseCard';
import { EditModal } from '../components/EditModal';

export default function Home() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [selected, setSelected] = useState<Phrase | null>(null);

  useEffect(() => {
    listPhrases().then(setPhrases);
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <Swiper
        modules={[Navigation, Pagination]}
        navigation
        pagination={{ clickable: true }}
        spaceBetween={20}
        slidesPerView={1}
        className="w-full max-w-md"
      >
        {phrases.map((p) => (
          <SwiperSlide key={p.phrase_id}>
            <PhraseCard phrase={p} onEdit={setSelected} />
          </SwiperSlide>
        ))}
      </Swiper>
      <EditModal open={!!selected} phrase={selected} onClose={() => setSelected(null)} />
    </div>
  );
}