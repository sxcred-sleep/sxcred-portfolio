'use client';
/* oxlint-disable next/no-img-element -- Authenticated upload previews use original media URLs. */
/* oxlint-disable next/no-html-link-for-pages -- Full navigation refreshes published data and invokes the unsaved-changes guard. */
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileImage,
  ImagePlus,
  LogOut,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ManagedProject, ProjectImage } from '@/data/projects';
import { ClientManager } from './ClientManager';

type Draft = Pick<
  ManagedProject,
  | 'id'
  | 'title'
  | 'category'
  | 'year'
  | 'client'
  | 'description'
  | 'layout'
  | 'images'
  | 'status'
>;
const emptyDraft = (): Draft => ({
  id: '',
  title: '',
  category: 'DOTA 2 / ПРЕВЬЮ',
  year: String(new Date().getFullYear()),
  client: '',
  description: '',
  layout: 'featured',
  images: [],
  status: 'draft',
});
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    credentials: 'same-origin',
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new ApiError(
      data.error || 'Не удалось выполнить запрос.',
      response.status,
    );
  return data as T;
}
function Preview({ file }: { file: ProjectImage }) {
  return file.type === 'video' ? (
    <video
      src={`${file.src}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      aria-label={file.alt || file.name}
    />
  ) : (
    <img
      src={file.src}
      alt={file.alt || file.name || 'Загруженная работа'}
      loading="lazy"
    />
  );
}
export function AdminPanel({ view = 'works' }: { view?: 'works' | 'clients' }) {
  const [clientsDirty, setClientsDirty] = useState(false);
  const [auth, setAuth] = useState<
    'loading' | 'login' | 'ready' | 'unconfigured' | 'error'
  >('loading');
  const [password, setPassword] = useState('');
  const [works, setWorks] = useState<ManagedProject[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [upload, setUpload] = useState<{
    name: string;
    progress: number;
    index: number;
    total: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const filesInput = useRef<HTMLInputElement>(null);
  const xhr = useRef<XMLHttpRequest | null>(null);
  const locked = busy || upload !== null;
  const published = works.filter((work) => work.status === 'published').length;
  const handleError = (reason: unknown) => {
    setError(
      reason instanceof Error ? reason.message : 'Не удалось выполнить запрос.',
    );
    if (reason instanceof ApiError && reason.status === 401) setAuth('login');
  };
  const refresh = async () => {
    const result = await api<{ projects: ManagedProject[] }>('projects');
    setWorks(result.projects);
  };
  useEffect(() => {
    let active = true;
    void api<{ authenticated: boolean; configured: boolean }>('session')
      .then(async (result) => {
        if (!active) return;
        if (!result.configured) {
          setAuth('unconfigured');
          return;
        }
        if (!result.authenticated) {
          setAuth('login');
          return;
        }
        const data = await api<{ projects: ManagedProject[] }>('projects');
        if (active) {
          setWorks(data.projects);
          setAuth('ready');
        }
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Не удалось подключиться.',
          );
          setAuth('error');
        }
      });
    return () => {
      active = false;
      xhr.current?.abort();
    };
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (dirty || upload) {
        event.preventDefault();
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty, upload]);
  function edit(patch: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setNotice('');
  }
  function select(work?: ManagedProject) {
    if (
      locked ||
      (dirty &&
        !window.confirm(
          'Перейти к другой работе? Несохранённые изменения будут потеряны.',
        ))
    )
      return;
    setDraft(work ? { ...work } : emptyDraft());
    setDirty(false);
    setError('');
    setNotice('');
  }
  async function signIn(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      setPassword('');
      await refresh();
      setAuth('ready');
    } catch (reason) {
      handleError(reason);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (
      (dirty || clientsDirty) &&
      !window.confirm('Выйти без сохранения изменений?')
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api('session', { method: 'DELETE' });
      setAuth('login');
      setWorks([]);
      setDraft(emptyDraft());
      setDirty(false);
    } catch (reason) {
      handleError(reason);
    } finally {
      setBusy(false);
    }
  }
  async function save(status: Draft['status']) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const { project } = await api<{ project: ManagedProject }>('projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, status }),
      });
      setDraft(project);
      setDirty(false);
      await refresh();
      setNotice(
        status === 'published'
          ? 'Работа опубликована и появилась в портфолио.'
          : 'Черновик сохранён. Он виден только вам.',
      );
    } catch (reason) {
      handleError(reason);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      !draft.id ||
      !window.confirm(`Удалить работу «${draft.title}» из портфолио?`)
    )
      return;
    setBusy(true);
    setError('');
    try {
      await api('projects', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id }),
      });
      setDraft(emptyDraft());
      setDirty(false);
      await refresh();
      setNotice('Работа удалена.');
    } catch (reason) {
      handleError(reason);
    } finally {
      setBusy(false);
    }
  }
  function uploadFile(file: File, index: number, total: number) {
    return new Promise<ProjectImage>((resolve, reject) => {
      const request = new XMLHttpRequest();
      xhr.current = request;
      request.open(
        'POST',
        `/api/admin/uploads?name=${encodeURIComponent(file.name)}`,
      );
      request.upload.onprogress = (event) =>
        setUpload({
          name: file.name,
          index,
          total,
          progress: event.lengthComputable
            ? Math.round((event.loaded / event.total) * 100)
            : 0,
        });
      request.onload = () => {
        try {
          const data = JSON.parse(request.responseText);
          if (request.status >= 200 && request.status < 300)
            resolve(data.media);
          else
            reject(
              new ApiError(
                data.error || 'Загрузка не удалась.',
                request.status,
              ),
            );
        } catch {
          reject(new Error('Сервер не смог принять файл. Попробуйте ещё раз.'));
        }
      };
      request.onerror = () =>
        reject(
          new Error(
            'Соединение прервалось. Проверьте интернет и повторите загрузку.',
          ),
        );
      request.onabort = () => reject(new Error('Загрузка отменена.'));
      request.timeout = 180000;
      request.ontimeout = () =>
        reject(
          new Error(
            'Загрузка заняла слишком много времени. Повторите попытку.',
          ),
        );
      setUpload({ name: file.name, progress: 0, index, total });
      request.send(file);
    });
  }
  async function addFiles(files: File[]) {
    if (locked || !files.length) return;
    setError('');
    setNotice('');
    if (draft.images.length + files.length > 20) {
      setError('В одной работе может быть до 20 файлов.');
      return;
    }
    if (files.some((file) => file.size > 25 * 1024 * 1024 || !file.size)) {
      setError('Файл должен быть непустым и не больше 25 МБ.');
      return;
    }
    if (
      files.some((file) => !/\.(jpe?g|png|webp|gif|mp4|webm)$/i.test(file.name))
    ) {
      setError('Поддерживаются JPG, PNG, WebP, GIF, MP4 и WebM.');
      return;
    }
    try {
      for (let i = 0; i < files.length; i++) {
        const media = await uploadFile(files[i], i + 1, files.length);
        setDraft((current) => ({
          ...current,
          images: [...current.images, media],
        }));
        setDirty(true);
      }
    } catch (reason) {
      handleError(reason);
    } finally {
      setUpload(null);
      xhr.current = null;
      if (filesInput.current) filesInput.current.value = '';
    }
  }
  function move(index: number, target: number) {
    const images = [...draft.images];
    const [file] = images.splice(index, 1);
    images.splice(target, 0, file);
    edit({ images });
  }
  const alerts = (
    <>
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
    </>
  );
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <a href="/" className="admin-brand">
          SXCRED<span>®</span>
        </a>
        <span className="admin-header-label">УПРАВЛЕНИЕ АРХИВОМ</span>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="admin-site-link"
        >
          На сайт <ArrowUpRight size={18} />
        </a>
        {auth === 'ready' && (
          <button
            className="admin-icon-button"
            onClick={signOut}
            disabled={locked}
            aria-label="Выйти"
          >
            <LogOut size={19} />
          </button>
        )}
      </header>
      {auth === 'ready' && (
        <nav className="admin-section-tabs" aria-label="Разделы панели">
          <a href="/admin" aria-current={view === 'works' ? 'page' : undefined}>
            01 / Работы
          </a>
          <a
            href="/admin/clients"
            aria-current={view === 'clients' ? 'page' : undefined}
          >
            02 / Стримеры
          </a>
        </nav>
      )}
      {auth !== 'ready' ? (
        <main className="admin-login">
          <span className="admin-eyebrow">SXCRED / ВХОД</span>
          <h1>ЗА КУЛИСАМИ.</h1>
          {auth === 'loading' ? (
            <output>Проверяем вход…</output>
          ) : auth === 'unconfigured' ? (
            <p>Пароль администратора ещё не настроен.</p>
          ) : auth === 'error' ? (
            <>
              {alerts}
              <button
                className="admin-button primary"
                onClick={() => location.reload()}
              >
                Повторить
              </button>
            </>
          ) : (
            <form onSubmit={signIn}>
              <label htmlFor="admin-password">Пароль</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={256}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
              {alerts}
              <button className="admin-button primary" disabled={busy}>
                {busy ? 'Входим…' : 'Войти в панель'}
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </main>
      ) : view === 'clients' ? (
        <ClientManager onDirty={setClientsDirty} />
      ) : (
        <main className="admin-workspace">
          <aside className="admin-library">
            <div className="admin-library-heading">
              <span className="admin-eyebrow">
                АРХИВ / {String(works.length).padStart(2, '0')}
              </span>
              <h1>МОИ РАБОТЫ</h1>
              <p>
                {published} опубликовано · {works.length - published} в
                черновиках
              </p>
              <button
                className="admin-button primary"
                onClick={() => select()}
                disabled={locked}
              >
                <Plus size={18} />
                Добавить работу
              </button>
            </div>
            <nav className="admin-work-list" aria-label="Работы">
              {works.length === 0 ? (
                <div className="admin-empty">
                  <FileImage size={32} strokeWidth={1} />
                  <p>Здесь появятся ваши работы.</p>
                </div>
              ) : (
                works.map((work) => (
                  <button
                    key={work.id}
                    className={`admin-work-item ${draft.id === work.id ? 'selected' : ''}`}
                    aria-current={draft.id === work.id ? 'true' : undefined}
                    onClick={() => select(work)}
                    disabled={locked}
                  >
                    <span className="admin-work-thumb">
                      {work.images[0] ? (
                        <Preview file={work.images[0]} />
                      ) : (
                        <FileImage size={24} />
                      )}
                    </span>
                    <span>
                      <strong>{work.title}</strong>
                      <small
                        className={
                          work.status === 'published' ? 'is-published' : ''
                        }
                      >
                        {work.status === 'published' ? 'На сайте' : 'Черновик'}
                      </small>
                    </span>
                  </button>
                ))
              )}
            </nav>
          </aside>
          <section className="admin-editor" aria-label="Редактор работы">
            <div className="admin-editor-heading">
              <div>
                <span className="admin-eyebrow">
                  {draft.id ? 'РЕДАКТИРОВАНИЕ' : 'НОВАЯ РАБОТА'}
                </span>
                <h2>{draft.id ? draft.title : 'НОВАЯ ГЛАВА.'}</h2>
              </div>
              <span className={`admin-status ${dirty ? 'unsaved' : ''}`}>
                {dirty ? 'Есть изменения' : draft.id ? 'Сохранено' : 'Черновик'}
              </span>
            </div>
            {alerts}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save('published');
              }}
            >
              <fieldset disabled={locked} className="admin-fields">
                <label>
                  Название работы
                  <input
                    value={draft.title}
                    maxLength={120}
                    required
                    placeholder="Например, оформление стрима"
                    onChange={(event) => edit({ title: event.target.value })}
                  />
                </label>
                <div className="admin-field-row">
                  <label>
                    Категория
                    <input
                      list="work-categories"
                      value={draft.category}
                      maxLength={80}
                      required
                      onChange={(event) =>
                        edit({ category: event.target.value })
                      }
                    />
                    <datalist id="work-categories">
                      {[
                        'DOTA 2 / ПРЕВЬЮ',
                        'ОФОРМЛЕНИЕ ТРАНСЛЯЦИЙ',
                        'СОЦСЕТИ / ПРОМО',
                        'АЙДЕНТИКА / КИБЕРСПОРТ',
                      ].map((value) => (
                        <option value={value} key={value}>
                          {value}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Год
                    <input
                      value={draft.year || ''}
                      inputMode="numeric"
                      maxLength={4}
                      pattern="(19|20)[0-9]{2}"
                      placeholder="2026"
                      onChange={(event) => edit({ year: event.target.value })}
                    />
                  </label>
                </div>
                <label>
                  Клиент <span className="admin-optional">необязательно</span>
                  <input
                    value={draft.client || ''}
                    maxLength={120}
                    placeholder="Никнейм или название проекта"
                    onChange={(event) => edit({ client: event.target.value })}
                  />
                </label>
                <label>
                  Описание
                  <textarea
                    value={draft.description}
                    maxLength={5000}
                    rows={4}
                    placeholder="Задача, идея и что получилось"
                    onChange={(event) =>
                      edit({ description: event.target.value })
                    }
                  />
                </label>
                <div className="admin-files-heading">
                  <h3>
                    ФАЙЛЫ <span>{draft.images.length} / 20</span>
                  </h3>
                  <span>Первый файл — обложка</span>
                </div>
                <div
                  className={`admin-dropzone ${dragging ? 'dragging' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void addFiles(Array.from(event.dataTransfer.files));
                  }}
                >
                  <input
                    ref={filesInput}
                    id="work-files"
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.webm"
                    onChange={(event) =>
                      void addFiles(Array.from(event.target.files || []))
                    }
                    className="admin-file-input"
                  />
                  <label htmlFor="work-files">
                    <ImagePlus size={30} strokeWidth={1.5} />
                    <strong>Перетащите файлы или выберите их</strong>
                    <span>
                      JPG, PNG, WebP, GIF, MP4, WebM · до 25 МБ каждый
                    </span>
                  </label>
                </div>
                <div className="admin-media-list">
                  {draft.images.map((file, index) => (
                    <div className="admin-media-item" key={file.id || file.src}>
                      <div className="admin-media-preview">
                        <Preview file={file} />
                        <span>
                          {index === 0
                            ? 'ОБЛОЖКА'
                            : String(index + 1).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="admin-media-info">
                        <strong title={file.name}>{file.name || 'Файл'}</strong>
                        <label>
                          Описание для доступности
                          <input
                            value={file.alt}
                            placeholder={
                              draft.title || 'Что изображено на работе'
                            }
                            maxLength={300}
                            onChange={(event) =>
                              edit({
                                images: draft.images.map((item, i) =>
                                  i === index
                                    ? { ...item, alt: event.target.value }
                                    : item,
                                ),
                              })
                            }
                          />
                        </label>
                        <div className="admin-media-actions">
                          <button
                            type="button"
                            onClick={() => move(index, 0)}
                            disabled={index === 0}
                          >
                            На обложку
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            disabled={index === 0}
                            onClick={() => move(index, index - 1)}
                            aria-label={`Передвинуть файл ${index + 1} назад`}
                          >
                            <ArrowLeft size={17} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            disabled={index === draft.images.length - 1}
                            onClick={() => move(index, index + 1)}
                            aria-label={`Передвинуть файл ${index + 1} вперёд`}
                          >
                            <ArrowRight size={17} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() =>
                              edit({
                                images: draft.images.filter(
                                  (_, i) => i !== index,
                                ),
                              })
                            }
                            aria-label={`Убрать файл ${file.name || index + 1}`}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <label>
                  Формат обложки
                  <select
                    value={draft.layout}
                    onChange={(event) =>
                      edit({ layout: event.target.value as Draft['layout'] })
                    }
                  >
                    <option value="featured">Крупная — главный акцент</option>
                    <option value="portrait">Вертикальная</option>
                    <option value="wide">Широкая</option>
                    <option value="compact">Компактная</option>
                  </select>
                </label>
              </fieldset>
              {upload && (
                <div className="admin-upload-status" aria-live="polite">
                  <span>
                    <Upload size={17} />
                    Загрузка {upload.index} из {upload.total}: {upload.name}
                  </span>
                  <progress max={100} value={upload.progress} />
                  <span>{upload.progress}%</span>
                  <button
                    type="button"
                    onClick={() => xhr.current?.abort()}
                    aria-label="Отменить загрузку"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
              <div className="admin-save-bar">
                <div>
                  {draft.id && (
                    <button
                      type="button"
                      className="admin-delete"
                      onClick={remove}
                      disabled={locked}
                    >
                      <Trash2 size={17} />
                      <span>Удалить</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => save('draft')}
                  disabled={locked}
                >
                  {draft.status === 'published'
                    ? 'Снять с публикации'
                    : 'Сохранить черновик'}
                </button>
                <button
                  type="submit"
                  className="admin-button primary"
                  disabled={locked}
                >
                  {busy
                    ? 'Сохраняем…'
                    : draft.status === 'published'
                      ? 'Обновить на сайте'
                      : 'Опубликовать'}
                  <ArrowUpRight size={18} />
                </button>
              </div>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}
