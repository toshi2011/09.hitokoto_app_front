// === apps/frontend/src/components/EditModal.tsx ===
import React, { useState } from 'react';
import { Phrase } from '../api';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  phrase: Phrase | null;
  onClose: () => void;
}

export const EditModal: React.FC<Props> = ({ open, phrase, onClose }) => {
  const [text, setText] = useState(phrase?.text ?? '');

  // TODO: 保存ロジック

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-xl font-bold">編集</DialogHeader>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded border p-2"
        />
        <Button onClick={onClose} className="mt-4 w-full">
          保存 (未実装)
        </Button>
      </DialogContent>
    </Dialog>
  );
};
