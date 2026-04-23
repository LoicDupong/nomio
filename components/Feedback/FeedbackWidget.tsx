'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      {!open && <FeedbackButton onClick={() => setOpen(true)} />}
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
