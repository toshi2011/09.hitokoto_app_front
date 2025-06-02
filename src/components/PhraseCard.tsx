// === apps/frontend/src/components/PhraseCard.tsx ===
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Phrase } from '../api';
import { Image } from 'lucide-react';

interface Props {
  phrase: Phrase;
  onEdit?: (p: Phrase) => void;
}

const fallback = (
  <div className="flex h-48 items-center justify-center bg-gray-100 text-gray-400">
    <Image className="w-10 h-10" />
  </div>
);

export const PhraseCard: React.FC<Props> = ({ phrase, onEdit }) => (
  <Card className="w-full max-w-md cursor-pointer" onClick={() => onEdit?.(phrase)}>
    {phrase.image_url ? (
      <img
        src={phrase.image_url}
        alt={phrase.text}
        className="h-48 w-full object-cover rounded-t-2xl"
      />
    ) : (
      fallback
    )}
    <CardContent className="p-4 text-center text-lg font-semibold">
      {phrase.text}
    </CardContent>
  </Card>
);