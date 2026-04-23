import WebsiteNav from '@/components/Website/WebsiteNav';
import WebsiteFooter from '@/components/Website/WebsiteFooter';

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WebsiteNav />
      <main>{children}</main>
      <WebsiteFooter />
    </>
  );
}
