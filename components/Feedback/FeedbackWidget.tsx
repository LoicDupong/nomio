'use client';
import { useState } from 'react';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {!open && <FeedbackButton onClick={() => setOpen(true)} />}
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
