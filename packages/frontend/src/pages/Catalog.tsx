import { useState, useEffect, useCallback } from 'react';
import type {
  IsoDefinition,
  CreateDefinitionDto,
  UpdateDefinitionDto,
  ChecksumAlgorithm,
  RetentionBehavior,
} from '../api/definitions';
import {
  fetchDefinitions,
  createDefinition,
  updateDefinition,
  deleteDefinition,
} from '../api/definitions';
import VersionTimeline from '../components/VersionTimeline';

// ─── Watch badge ──────────────────────────────────────────────────────────────

function WatchBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={
        enabled
          ? { background: 'var(--color-success-subtle)', color: 'var(--color-success)' }
          : { background: 'var(--bg-hover)', color: 'var(--text-muted)' }
      }
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: enabled ? 'var(--color-success)' : 'var(--text-muted)' }}
      />
      {enabled ? 'Watching' : 'Manual'}
    </span>
  );
}

// ─── Confirm delete dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  name,
  onConfirm,
  onCancel,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
          Delete definition
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Delete{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            className="px-3 py-1.5 rounded-lg text-sm"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: 'var(--color-error)', color: '#fff' }}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
        {label}
        {hint && <span className="ml-1 font-normal opacity-60">{hint}</span>}
      </label>
      <div
        className="[&>input]:w-full [&>textarea]:w-full [&>select]:w-full
                   [&>input]:px-3 [&>input]:py-2 [&>input]:rounded-lg [&>input]:text-sm
                   [&>textarea]:px-3 [&>textarea]:py-2 [&>textarea]:rounded-lg [&>textarea]:text-sm [&>textarea]:resize-none
                   [&>select]:px-3 [&>select]:py-2 [&>select]:rounded-lg [&>select]:text-sm"
      >
        {children}
      </div>
    </div>
  );
}

// ─── Definition form state ────────────────────────────────────────────────────

interface FormState {
  name: string;
  family: string;
  architecture: string;
  description: string;
  tags: string;
  sourceUrl: string;
  checksumUrl: string;
  checksumAlgo: ChecksumAlgorithm;
  retentionCount: number;
  retentionBehavior: RetentionBehavior;
  watchEnabled: boolean;
}

const emptyForm: FormState = {
  name: '',
  family: '',
  architecture: 'x86_64',
  description: '',
  tags: '',
  sourceUrl: '',
  checksumUrl: '',
  checksumAlgo: 'sha256',
  retentionCount: 5,
  retentionBehavior: 'archive',
  watchEnabled: false,
};

function definitionToForm(def: IsoDefinition): FormState {
  return {
    name: def.name,
    family: def.family,
    architecture: def.architecture,
    description: def.description ?? '',
    tags: def.tags.join(', '),
    sourceUrl: def.sourceUrl ?? '',
    checksumUrl: def.checksumUrl ?? '',
    checksumAlgo: def.checksumAlgo,
    retentionCount: def.retentionCount,
    retentionBehavior: def.retentionBehavior,
    watchEnabled: def.watchEnabled,
  };
}

function formToDto(form: FormState): CreateDefinitionDto {
  return {
    name: form.name.trim(),
    family: form.family.trim().toLowerCase(),
    architecture: form.architecture.trim(),
    description: form.description.trim() || null,
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    sourceUrl: form.sourceUrl.trim() || null,
    checksumUrl: form.checksumUrl.trim() || null,
    checksumAlgo: form.checksumAlgo,
    retentionCount: form.retentionCount,
    retentionBehavior: form.retentionBehavior,
    watchEnabled: form.watchEnabled,
  };
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function DefinitionModal({
  editing,
  onSave,
  onClose,
}: {
  editing: IsoDefinition | null;
  onSave: (dto: CreateDefinitionDto | UpdateDefinitionDto) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(editing ? definitionToForm(editing) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.family.trim()) {
      setError('Name and family are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(formToDto(form));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-16 px-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={handleBackdropClick}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-lg rounded-xl shadow-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {editing ? 'Edit definition' : 'Add definition'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-lg leading-none"
            style={{ color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            className="mb-4 px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
          >
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Field label="Name *">
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Ubuntu 24.04 LTS"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Family *">
              <input
                value={form.family}
                onChange={(e) => set('family', e.target.value)}
                placeholder="ubuntu"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
                required
              />
            </Field>
            <Field label="Architecture">
              <select
                value={form.architecture}
                onChange={(e) => set('architecture', e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <option>x86_64</option>
                <option>aarch64</option>
                <option>arm</option>
                <option>riscv64</option>
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional notes"
              rows={2}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </Field>

          <Field label="Tags" hint="comma-separated">
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="server, minimal, lts"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </Field>

          <Field label="Source URL">
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              placeholder="https://releases.ubuntu.com/…"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
              }}
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <Field label="Checksum URL">
                <input
                  type="url"
                  value={form.checksumUrl}
                  onChange={(e) => set('checksumUrl', e.target.value)}
                  placeholder="https://…"
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
              </Field>
            </div>
            <Field label="Algorithm">
              <select
                value={form.checksumAlgo}
                onChange={(e) => set('checksumAlgo', e.target.value as ChecksumAlgorithm)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="sha256">SHA-256</option>
                <option value="sha512">SHA-512</option>
                <option value="md5">MD5</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Retain (versions)">
              <input
                type="number"
                min={1}
                max={99}
                value={form.retentionCount}
                onChange={(e) => set('retentionCount', parseInt(e.target.value, 10) || 1)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </Field>
            <Field label="On excess">
              <select
                value={form.retentionBehavior}
                onChange={(e) => set('retentionBehavior', e.target.value as RetentionBehavior)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="archive">Archive</option>
                <option value="delete">Delete</option>
              </select>
            </Field>
          </div>

          {/* Watch toggle */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => set('watchEnabled', !form.watchEnabled)}
          >
            <div
              className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.watchEnabled ? 'var(--accent)' : 'var(--bg-hover)' }}
            >
              <span
                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform"
                style={{
                  background: '#fff',
                  transform: form.watchEnabled ? 'translateX(16px)' : 'translateX(0)',
                }}
              />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Enable auto-watch
            </span>
          </div>
        </div>

        <div
          className="flex gap-3 justify-end mt-6 pt-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--bg-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add definition'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalMode =
  | { type: 'add' }
  | { type: 'edit'; def: IsoDefinition }
  | { type: 'versions'; def: IsoDefinition }
  | null;

const LIMIT = 20;

export default function Catalog() {
  const [definitions, setDefinitions] = useState<IsoDefinition[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalMode>(null);
  const [confirmDelete, setConfirmDelete] = useState<IsoDefinition | null>(null);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDefinitions({
        search: debouncedSearch || undefined,
        page,
        limit: LIMIT,
      });
      setDefinitions(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load definitions.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(dto: CreateDefinitionDto | UpdateDefinitionDto) {
    if (modal?.type === 'edit') {
      await updateDefinition(modal.def.id, dto as UpdateDefinitionDto);
    } else {
      await createDefinition(dto as CreateDefinitionDto);
    }
    await load();
  }

  async function handleDelete(def: IsoDefinition) {
    await deleteDefinition(def.id);
    setConfirmDelete(null);
    await load();
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            ISO Catalog
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {total} definition{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent)', color: '#fff' }}
          onClick={() => setModal({ type: 'add' })}
        >
          + Add definition
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or family…"
          className="w-full max-w-sm px-3 py-2 rounded-lg text-sm"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-lg text-sm"
          style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-default)' }}
      >
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr
              style={{
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              {['Name', 'Family', 'Architecture', 'Watch', 'Retention', ''].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Loading…
                </td>
              </tr>
            ) : definitions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {debouncedSearch
                    ? 'No definitions match that search.'
                    : 'No definitions yet. Add one to get started.'}
                </td>
              </tr>
            ) : (
              definitions.map((def, i) => (
                <tr
                  key={def.id}
                  style={{
                    borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                    background: 'var(--bg-base)',
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {def.name}
                    </div>
                    {def.description && (
                      <div
                        className="text-xs mt-0.5 truncate max-w-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {def.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {def.family}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {def.architecture}
                  </td>
                  <td className="px-4 py-3">
                    <WatchBadge enabled={def.watchEnabled} />
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    keep {def.retentionCount} · {def.retentionBehavior}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        className="px-2.5 py-1 rounded-md text-xs"
                        style={{
                          background: 'var(--bg-hover)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        onClick={() => setModal({ type: 'versions', def })}
                      >
                        Versions
                      </button>
                      <button
                        className="px-2.5 py-1 rounded-md text-xs"
                        style={{
                          background: 'var(--bg-hover)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        onClick={() => setModal({ type: 'edit', def })}
                      >
                        Edit
                      </button>
                      <button
                        className="px-2.5 py-1 rounded-md text-xs"
                        style={{
                          background: 'var(--color-error-subtle)',
                          color: 'var(--color-error)',
                          border: '1px solid transparent',
                        }}
                        onClick={() => setConfirmDelete(def)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-40"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <DefinitionModal
          editing={modal.type === 'edit' ? modal.def : null}
          onSave={(dto) => handleSave(dto)}
          onClose={() => setModal(null)}
        />
      )}

      {/* Versions panel */}
      {modal?.type === 'versions' && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-16 px-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className="w-full max-w-2xl rounded-xl shadow-2xl p-6"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {modal.def.name} — Versions
              </h2>
              <button
                onClick={() => setModal(null)}
                className="text-lg leading-none"
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            <VersionTimeline definitionId={modal.def.id} />
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <ConfirmDialog
          name={confirmDelete.name}
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
