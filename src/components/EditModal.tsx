
// === apps/frontend/src/components/EditModal.tsx ===
import React, { useState, useEffect } from 'react';
import { Phrase } from '../api';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updatePhrase } from '../api';

interface Props {
  open: boolean;
  phrase: Phrase | null;
  onClose: () => void;
}

export const EditModal: React.FC<Props> = ({ open, phrase, onClose }) => {
  const [text, setText] = useState(phrase?.text ?? '');
  useEffect(() => setText(phrase?.text ?? ''), [phrase]);
  const handleSave = async () => {
    if (phrase) {
      await updatePhrase(phrase.phrase_id, text);
      onClose();
      window.location.reload();
    }
  };
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-xl font-bold">編集</DialogHeader>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded border p-2"
        />
        <Button onClick={handleSave} className="mt-4 w-full">
          保存
        </Button>
      </DialogContent>
    </Dialog>
  );
};
