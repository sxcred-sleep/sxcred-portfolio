'use client';
import { useEffect, useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

export function DiscordContact({ value }: { value: string }) {
  const [notice, setNotice] = useState<{ success: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!notice?.success) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  async function copy() {
    setBusy(true);
    setNotice(null);
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ success: true });
    } catch {
      setNotice({ success: false });
    } finally {
      setBusy(false);
    }
  }
  return <>
    <button type="button" className="contact-copy" aria-label="Скопировать Discord" disabled={busy} onClick={copy}>Discord<Copy size={16} aria-hidden="true" /></button>
    <output className="contact-toast-region" aria-live="polite" aria-atomic="true">
      {notice && <div className="contact-toast">
        {notice.success ? <><Check size={18} aria-hidden="true" /><span>Discord скопирован</span></> : <div><p>Не удалось скопировать. Скопируй вручную:</p><span className="contact-copy-value">{value}</span></div>}
        <button type="button" onClick={() => setNotice(null)} aria-label="Закрыть уведомление"><X size={18} /></button>
      </div>}
    </output>
  </>;
}
