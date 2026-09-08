import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SXCRED | Дизайн для игровой культуры',
  description: 'Визуальный дизайн для Dota 2, стримеров и игровых проектов. Превью, оформление трансляций, соцсети и айдентика.',
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
