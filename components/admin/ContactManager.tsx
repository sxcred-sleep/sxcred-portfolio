'use client';
import { useEffect, useState } from 'react';
import type { ContactSettings } from '@/data/contacts';

async function readResponse(response: Response): Promise<ContactSettings> {
  const data = (await response.json()) as ContactSettings & { error?: string };
  if (!response.ok)
    throw new Error(data.error || 'Не удалось сохранить контакты.');
  return data;
}
export function ContactManager({
  onDirty,
}: {
  onDirty: (dirty: boolean) => void;
}) {
  const [settings, setSettings] = useState<ContactSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/contacts', { signal: controller.signal })
      .then(readResponse)
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Не удалось загрузить контакты.',
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    onDirty(dirty || busy);
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || busy) event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, busy, onDirty]);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setSettings(await readResponse(response));
      setDirty(false);
      setNotice(
        'Глава 05 обновлена. Ссылки появятся после обновления страницы сайта.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось сохранить.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-roster-editor">
      <div className="admin-editor-heading">
        <div>
          <span className="admin-eyebrow">ГЛАВА 05 / КОНТАКТЫ</span>
          <h1>КУДА ТЕБЕ НАПИСАТЬ</h1>
          <p>Укажите никнейм Discord для копирования и ссылки остальных кнопок. Пустое поле оставляет пометку «Скоро».</p>
        </div>
        <a
          href="/#contact"
          target="_blank"
          rel="noreferrer"
          className="admin-site-link"
        >
          Открыть главу ↗
        </a>
      </div>
      {error && (
        <p className="admin-alert admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <output className="admin-alert admin-success">{notice}</output>
      )}
      {loading ? (
        <output>Загружаем контакты…</output>
      ) : !settings ? (
        <button className="admin-button" onClick={() => location.reload()}>
          Повторить загрузку
        </button>
      ) : (
        <form onSubmit={save}>
          <fieldset
            disabled={busy}
            className="admin-roster-fields admin-contact-fields"
          >
            <legend className="sr-only">Ссылки кнопок главы 05</legend>
            {settings.contacts.map((contact, index) => (
              <label key={contact.label} htmlFor={`contact-${index}`}>
                <span>{contact.label === 'Discord' ? 'Discord — никнейм или ссылка для копирования' : contact.label}</span>
                <input
                  id={`contact-${index}`}
                  type="text"
                  inputMode={contact.label === 'Discord' ? 'text' : 'url'}
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={2000}
                  value={contact.url || ''}
                  placeholder={
                    contact.label === 'Discord' ? 'your_username' : contact.label === 'Twitch' ? 'https://www.twitch.tv/your_channel' : contact.label === 'Email'
                      ? 'mailto:name@example.com'
                      : 'https://…'
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setSettings(
                      (current) =>
                        current && {
                          ...current,
                          contacts: current.contacts.map((item, i) =>
                            i === index ? { ...item, url: value } : item,
                          ),
                        },
                    );
                    setDirty(true);
                    setNotice('');
                  }}
                />
              </label>
            ))}
          </fieldset>
          <div className="admin-save-bar">
            <span className="admin-status">
              {dirty
                ? 'Есть несохранённые изменения'
                : 'Все изменения сохранены'}
            </span>
            <button className="admin-button primary" disabled={busy || !dirty}>
              {busy ? 'Сохраняем…' : 'Сохранить главу 05'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
