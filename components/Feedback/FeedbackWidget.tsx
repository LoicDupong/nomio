'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import FeedbackButton from './FeedbackButton';
import FeedbackModal from './FeedbackModal';

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const footer = document.getElementById('site-footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <>
      {!open && !footerVisible && <FeedbackButton onClick={() => setOpen(true)} />}
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  );
}
