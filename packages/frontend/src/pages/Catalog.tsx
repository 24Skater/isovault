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
import ConfirmDialog from '../components/ConfirmDialog';

// ─── Shared input style ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: 12,
  outline: 'none',
};

// ─── Watch badge ──────────────────────────────────────────────────────────────

function WatchBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className="badge" style={
      enabled
        ? { border: '1px solid var(--color-success)', color: 'var(--color-success)' }
        : { border: '1px solid var(--border-strong)', color: 'var(--text-muted)' }
    }>
      {enabled ? 'Watching' : 'Manual'}
    </span>
  );
}

// ─── Form field wrapper ───────────────────────────────────────────────────────

function Field({ label, hint, children }: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        display: 'block',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        marginBottom: 5,
      }}>
        {label}
        {hint && <span style={{ marginLeft: 6, fontWeight: 400, opacity: 0.7 }}>{hint}</span>}
      </span>
      {children}
    </label>
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
    tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    sourceUrl: form.sourceUrl.trim() || null,
    checksumUrl: form.checksumUrl.trim() || null,
    checksumAlgo: form.checksumAlgo,
    retentionCount: form.retentionCount,
    retentionBehavior: form.retentionBehavior,
    watchEnabled: form.watchEnabled,
  };
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function DefinitionModal({ editing, onSave, onClose }: {
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
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto',
        padding: '64px 16px',
        background: 'rgba(0,0,0,0.7)',
      }}
      onClick={handleBackdropClick}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          padding: '24px',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--accent)',
          }}>
            {editing ? 'Edit Definition' : 'Add Definition'}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 16,
              cursor: 'pointer',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div style={{
            marginBottom: 16,
            padding: '8px 12px',
            background: 'var(--color-error-subtle)',
            border: '1px solid var(--color-error)',
            color: 'var(--color-error)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Name *">
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Ubuntu 24.04 LTS"
              style={inputStyle}
              required
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Family *">
              <input
                value={form.family}
                onChange={(e) => set('family', e.target.value)}
                placeholder="ubuntu"
                style={inputStyle}
                required
              />
            </Field>
            <Field label="Architecture">
              <select
                value={form.architecture}
                onChange={(e) => set('architecture', e.target.value)}
                style={inputStyle}
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
              style={{ ...inputStyle, resize: 'none' }}
            />
          </Field>

          <Field label="Tags" hint="comma-separated">
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="server, minimal, lts"
              style={inputStyle}
            />
          </Field>

          <Field label="Source URL">
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => set('sourceUrl', e.target.value)}
              placeholder="https://releases.ubuntu.com/…"
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12 }}>
            <Field label="Checksum URL">
              <input
                type="url"
                value={form.checksumUrl}
                onChange={(e) => set('checksumUrl', e.target.value)}
                placeholder="https://…"
                style={inputStyle}
              />
            </Field>
            <Field label="Algorithm">
              <select
                value={form.checksumAlgo}
                onChange={(e) => set('checksumAlgo', e.target.value as ChecksumAlgorithm)}
                style={{ ...inputStyle, width: 'auto', minWidth: 90 }}
              >
                <option value="sha256">SHA-256</option>
                <option value="sha512">SHA-512</option>
                <option value="md5">MD5</option>
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Retain (versions)">
              <input
                type="number"
                min={1}
                max={99}
                value={form.retentionCount}
                onChange={(e) => set('retentionCount', parseInt(e.target.value, 10) || 1)}
                style={inputStyle}
              />
            </Field>
            <Field label="On excess">
              <select
                value={form.retentionBehavior}
                onChange={(e) => set('retentionBehavior', e.target.value as RetentionBehavior)}
                style={inputStyle}
              >
                <option value="archive">Archive</option>
                <option value="delete">Delete</option>
              </select>
            </Field>
          </div>

          {/* Watch toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={form.watchEnabled}
            onClick={() => set('watchEnabled', !form.watchEnabled)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none', background: 'none', border: 'none', padding: 0, font: 'inherit', textAlign: 'left', width: '100%' }}
          >
            <div style={{
              width: 28,
              height: 16,
              background: form.watchEnabled ? 'var(--accent)' : 'var(--border-strong)',
              position: 'relative',
              flexShrink: 0,
              transition: 'background 120ms',
            }}>
              <span style={{
                position: 'absolute',
                top: 2,
                left: form.watchEnabled ? 14 : 2,
                width: 12,
                height: 12,
                background: form.watchEnabled ? '#080808' : 'var(--text-muted)',
                transition: 'left 120ms',
              }} />
            </div>
            <span style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
            }}>
              Enable auto-watch
            </span>
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              background: 'transparent',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '7px 16px',
              background: 'var(--accent)',
              color: '#080808',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Definition'}
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

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  cursor: 'pointer',
};

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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDefinitions({ search: debouncedSearch || undefined, page, limit: LIMIT });
      setDefinitions(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load definitions.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => { void load(); }, [load]);

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
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <h1 style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
        }}>
          ISO Catalog
          <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontWeight: 400 }}>
            {total}
          </span>
        </h1>
        <button
          onClick={() => setModal({ type: 'add' })}
          style={{
            padding: '6px 14px',
            background: 'var(--accent)',
            color: '#080808',
            border: 'none',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            cursor: 'pointer',
          }}
        >
          + Add Definition
        </button>
      </div>
      <div className="page-rule" />

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or family…"
          style={{ ...inputStyle, maxWidth: 320 }}
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 16,
          padding: '8px 12px',
          background: 'var(--color-error-subtle)',
          border: '1px solid var(--color-error)',
          color: 'var(--color-error)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
        }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ border: '1px solid var(--border-default)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
              {['Name', 'Family', 'Architecture', 'Watch', 'Retention', ''].map((h) => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '8px 16px',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                  Loading…
                </td>
              </tr>
            ) : definitions.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
                  {debouncedSearch ? 'No definitions match that search.' : 'No definitions yet. Add one to get started.'}
                </td>
              </tr>
            ) : (
              definitions.map((def, i) => (
                <tr key={def.id} style={{
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined,
                  background: 'var(--bg-base)',
                }}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{def.name}</div>
                    {def.description && (
                      <div style={{ fontSize: 11, marginTop: 2, color: 'var(--text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {def.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {def.family}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-secondary)' }}>
                    {def.architecture}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <WatchBadge enabled={def.watchEnabled} />
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
                    keep {def.retentionCount} · {def.retentionBehavior}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button style={btnStyle} onClick={() => setModal({ type: 'versions', def })}>Versions</button>
                      <button style={btnStyle} onClick={() => setModal({ type: 'edit', def })}>Edit</button>
                      <button
                        style={{ ...btnStyle, color: 'var(--color-error)', borderColor: 'var(--color-error)' }}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...btnStyle, opacity: page <= 1 ? 0.4 : 1 }}>
              Previous
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ ...btnStyle, opacity: page >= totalPages ? 0.4 : 1 }}>
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
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            overflowY: 'auto', padding: '64px 16px',
            background: 'rgba(0,0,0,0.7)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}
        >
          <div style={{
            width: '100%',
            maxWidth: 680,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--accent)',
              }}>
                {modal.def.name} — Versions
              </div>
              <button
                onClick={() => setModal(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}
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
          title="Delete Definition"
          message={<>Delete <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete.name}</strong>? This cannot be undone.</>}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
