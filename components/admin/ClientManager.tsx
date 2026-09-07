'use client';
/* oxlint-disable next/no-img-element -- Original uploaded avatars are served by the authenticated media endpoint. */
import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { ManagedClient } from '@/data/clients';

type Roster = { clients: ManagedClient[]; revision: number };
async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || 'Не удалось сохранить изменения.');
  return data;
}
export function ClientManager({
  onDirty,
}: {
  onDirty: (dirty: boolean) => void;
}) {
  const [clients, setClients] = useState<ManagedClient[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = loading || busy || uploading !== null;
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/admin/clients', { signal: controller.signal })
      .then(readResponse<Roster>)
      .then((data) => {
        setClients(data.clients);
        setRevision(data.revision);
        setLoaded(true);
        setLoading(false);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Не удалось загрузить стримеров.',
          );
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    onDirty(dirty || uploading !== null);
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || uploading) event.preventDefault();
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, uploading, onDirty]);
  function update(next: ManagedClient[]) {
    setClients(next);
    setDirty(true);
    setNotice('');
  }
  function edit(id: string, patch: Partial<ManagedClient>) {
    update(
      clients.map((client) =>
        client.id === id ? { ...client, ...patch } : client,
      ),
    );
  }
  function move(index: number, direction: number) {
    const next = [...clients];
    const [item] = next.splice(index, 1);
    next.splice(index + direction, 0, item);
    update(next);
  }
  async function upload(id: string, file?: File) {
    if (!file || locked) return;
    setError('');
    setNotice('');
    if (
      !/\.(jpe?g|png|webp|gif)$/i.test(file.name) ||
      !file.size ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Для аватара выберите JPG, PNG, WebP или GIF до 5 МБ.');
      return;
    }
    setUploading(id);
    try {
      const response = await fetch(
        `/api/admin/uploads?purpose=avatar&name=${encodeURIComponent(file.name)}`,
        { method: 'POST', body: file },
      );
      const { media } = await readResponse<{
        media: { id: string; src: string };
      }>(response);
      setClients((current) =>
        current.map((client) =>
          client.id === id
            ? { ...client, avatarId: media.id, avatar: media.src }
            : client,
        ),
      );
      setDirty(true);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Аватар не загрузился.',
      );
    } finally {
      setUploading(null);
    }
  }
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients, revision }),
      });
      const data = await readResponse<Roster>(response);
      setClients(data.clients);
      setRevision(data.revision);
      setDirty(false);
      setNotice('Глава 02 обновлена. Изменения уже на сайте.');
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
          <span className="admin-eyebrow">ГЛАВА 02 / В ОДНОЙ КОМАНДЕ</span>
          <h1>СТРИМЕРЫ И КРЕАТОРЫ</h1>
          <p>Карточки появятся на сайте в том же порядке.</p>
        </div>
        <a
          href="/#clients"
          target="_blank"
          rel="noreferrer"
          className="admin-site-link"
        >
          Открыть главу <ArrowUpRight size={18} />
        </a>
      </div>
      {error && (
        <p className="admin-alert admin-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <output className="admin-alert admin-success">
          <Check size={18} />
          {notice}
        </output>
      )}
      {loading ? (
        <output>Загружаем список…</output>
      ) : !loaded ? (
        <button className="admin-button" onClick={() => location.reload()}>
          Повторить загрузку
        </button>
      ) : (
        <form onSubmit={save}>
          <fieldset disabled={locked} className="admin-roster-fields">
            {clients.length === 0 && (
              <div className="admin-roster-empty">
                <ImagePlus size={32} />
                <p>Стримеров пока нет. Добавьте первую карточку.</p>
              </div>
            )}
            {clients.map((client, index) => (
              <article className="admin-client-editor" key={client.id}>
                <div className="admin-client-top">
                  <span className="admin-eyebrow">
                    КАРТОЧКА {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="admin-icon-button"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Поднять ${client.name || 'карточку'}`}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-button"
                      disabled={index === clients.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Опустить ${client.name || 'карточку'}`}
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Убрать ${client.name || 'эту карточку'} из главы 02? Изменение применится после сохранения.`,
                          )
                        )
                          update(
                            clients.filter((item) => item.id !== client.id),
                          );
                      }}
                      aria-label={`Удалить ${client.name || 'карточку'}`}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <div className="admin-client-body">
                  <div className="admin-avatar-editor">
                    <div className="admin-avatar-preview">
                      {client.avatar ? (
                        <img
                          src={client.avatar}
                          alt={`Аватар ${client.name || 'стримера'}`}
                        />
                      ) : (
                        <span>
                          {client.name.slice(0, 1).toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <label className="admin-button admin-avatar-upload">
                      <ImagePlus size={17} />
                      {uploading === client.id
                        ? 'Загружаем…'
                        : client.avatar
                          ? 'Заменить аватар'
                          : 'Загрузить аватар'}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.gif"
                        aria-label={`Загрузить аватар ${client.name || 'стримера'}`}
                        onChange={(event) => {
                          void upload(client.id, event.target.files?.[0]);
                          event.target.value = '';
                        }}
                      />
                    </label>
                    <small>JPG, PNG, WebP, GIF · до 5 МБ</small>
                    {client.avatar && (
                      <button
                        className="admin-avatar-remove"
                        type="button"
                        onClick={() =>
                          edit(client.id, { avatar: null, avatarId: null })
                        }
                      >
                        <X size={14} />
                        Убрать аватар
                      </button>
                    )}
                  </div>
                  <div className="admin-fields">
                    <label>
                      Никнейм
                      <input
                        value={client.name}
                        required
                        maxLength={80}
                        placeholder="Никнейм стримера"
                        onChange={(event) =>
                          edit(client.id, { name: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Категория
                      <input
                        value={client.category}
                        maxLength={120}
                        placeholder="Стример / Креатор"
                        onChange={(event) =>
                          edit(client.id, { category: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      Подпись под никнеймом
                      <input
                        value={client.workType || ''}
                        maxLength={160}
                        placeholder="Например, оформление трансляций"
                        onChange={(event) =>
                          edit(client.id, { workType: event.target.value })
                        }
                      />
                      <small>
                        Если оставить пустой, будет показана категория.
                      </small>
                    </label>
                    <label>
                      Ссылка на канал или профиль
                      <input
                        type="url"
                        value={client.link || ''}
                        maxLength={2000}
                        placeholder="https://twitch.tv/…"
                        onChange={(event) =>
                          edit(client.id, { link: event.target.value })
                        }
                      />
                      <small>
                        Никнейм станет ссылкой. Поле можно оставить пустым.
                      </small>
                    </label>
                  </div>
                </div>
              </article>
            ))}
            <button
              type="button"
              className="admin-button admin-add-client"
              disabled={clients.length >= 30}
              onClick={() =>
                update([
                  ...clients,
                  {
                    id: crypto.randomUUID(),
                    name: '',
                    avatar: null,
                    avatarId: null,
                    category: 'Стример / Креатор',
                    workType: null,
                    link: null,
                  },
                ])
              }
            >
              <Plus size={18} />
              Добавить стримера
            </button>
          </fieldset>
          <div className="admin-save-bar">
            <span className={`admin-status ${dirty ? 'unsaved' : ''}`}>
              {dirty
                ? 'Есть несохранённые изменения'
                : 'Все изменения сохранены'}
            </span>
            <button
              type="submit"
              className="admin-button primary"
              disabled={locked || !dirty}
            >
              {busy ? 'Сохраняем…' : 'Сохранить главу 02'}
              <Check size={18} />
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
