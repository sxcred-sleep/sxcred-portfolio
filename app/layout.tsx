import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SXCRED | Дизайн для игровой культуры',
  description: 'Визуальный дизайн для Dota 2, стримеров и игровых проектов. Превью, оформление трансляций, соцсети и айдентика.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ru"><body>{children}</body></html>;
}
