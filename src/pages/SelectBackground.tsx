// src/pages/SelectBackground.jsx
import React, { useState, useEffect } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import axios from 'axios';

export default function SelectBackground({ phraseId }) {
  const [images, setImages] = useState([]);
  const [contentId, setContentId] = useState(null);

  useEffect(() => {
    async function fetchImages() {
      const res = await axios.get(`/api/select?phrase_id=${phraseId}`);
      setImages(res.data.images);
      setContentId(res.data.content_id);
    }
    fetchImages();
  }, [phraseId]);

  const chooseImage = async (url) => {
    const editorJson = JSON.stringify({ background: url, animations: [] });
    await axios.put(`/api/contents/${contentId}`, { image_url: url, editor_json });
    // TODO: navigate to /edit or show next UI
  };

  return (
    <div>
      <h2>背景画像を選んでください</h2>
      <Swiper spaceBetween={10} slidesPerView={2}>
        {images.map((url) => (
          <SwiperSlide key={url}>
            <img
              src={url}
              alt=""
              onClick={() => chooseImage(url)}
              style={{ cursor: 'pointer', width: '100%' }}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
