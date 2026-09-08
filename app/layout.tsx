import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'sxcred / design',
  description: 'делаю дизайн с душой. оформление трансляций, веб-сайтов, соцсетей и т.д.',
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: '/favicon-claymore.png', type: 'image/png' }],
    shortcut: '/favicon-claymore.png',
    apple: '/favicon-claymore.png',
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
