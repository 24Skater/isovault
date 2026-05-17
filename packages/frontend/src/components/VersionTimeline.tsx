import { useState, useEffect, useRef } from 'react';
import type { IsoDefinition, IsoVersion, IsoStatus } from '../api/definitions';
import { fetchVersions, queueVersionDownload, importVersion } from '../api/definitions';
import { formatBytes } from '../utils/format';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BORDER: Record<IsoStatus, string> = {
  pending:     'var(--color-warning)',
  downloading: 'var(--accent)',
  active:      'var(--color-success)',
  archived:    'var(--border-strong)',
  corrupt:     'var(--color-error)',
  deleted:     'var(--border-strong)',
};

const STATUS_COLOR: Record<IsoStatus, string> = {
  pending:     'var(--color-warning)',
  downloading: 'var(--accent)',
  active:      'var(--color-success)',
  archived:    'var(--text-muted)',
  corrupt:     'var(--color-error)',
  deleted:     'var(--text-muted)',
};

const STATUS_LABEL: Record<IsoStatus, string> = {
  pending:     'Pending',
  downloading: 'Downloading',
  active:      'Active',
  archived:    'Archived',
  corrupt:     'Corrupt',
  deleted:     'Deleted',
};

function StatusBadge({ status }: { status: IsoStatus }) {
  return (
    <span className="badge" style={{
      border: `1px solid ${STATUS_BORDER[status] ?? 'var(--border-strong)'}`,
      color: STATUS_COLOR[status] ?? 'var(--text-muted)',
    }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Version row ──────────────────────────────────────────────────────────────

function VersionRow({ version, isLast }: { version: IsoVersion; isLast: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {/* Timeline stem */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
        <div style={{
          width: 8,
          height: 8,
          marginTop: 4,
          flexShrink: 0,
          background: version.status === 'active' ? 'var(--color-success)' : 'var(--border-default)',
        }} />
        {!isLast && (
          <div style={{ flex: 1, width: 1, marginTop: 4, background: 'var(--border-subtle)' }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {version.versionString}
              </span>
              <StatusBadge status={version.status} />
              {version.checksumVerified && (
                <span className="badge" style={{
                  border: '1px solid var(--color-success)',
                  color: 'var(--color-success)',
                }}>
                  ✓ verified
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              marginTop: 3,
              color: 'var(--text-muted)',
            }}>
              {version.filename}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
              {formatBytes(version.fileSizeBytes)}
            </div>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, marginTop: 2, color: 'var(--text-muted)' }}>
              {formatDate(version.downloadCompletedAt ?? version.createdAt)}
            </div>
          </div>
        </div>
        {version.notes && (
          <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)' }}>
            {version.notes}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────

const LIMIT = 10;

const btnStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  cursor: 'pointer',
};

interface Props {
  definition: IsoDefinition;
}

function QueueDownloadForm({ definition, onQueued }: { definition: IsoDefinition; onQueued: () => void }) {
  const [url, setUrl] = useState(definition.sourceUrl ?? '');
  const [version, setVersion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !version.trim()) { setError('Both fields are required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await queueVersionDownload(definition.id, { versionString: version.trim(), sourceUrl: url.trim() });
      onQueued();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue download.');
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '6px 8px',
    background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace', fontSize: 11, outline: 'none',
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
      <div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
          Version string
        </div>
        <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 24.04.2" style={fieldStyle} />
      </div>
      <div>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>
          Download URL
        </div>
        <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" style={fieldStyle} />
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--color-error)' }}>{error}</div>}
      <button type="submit" disabled={saving} style={{
        alignSelf: 'flex-start', padding: '6px 16px',
        background: 'var(--accent)', color: '#080808', border: 'none',
        fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em', cursor: saving ? 'not-allowed' : 'pointer',
        opacity: saving ? 0.7 : 1,
      }}>
        {saving ? 'Queuing…' : 'Queue Download'}
      </button>
    </form>
  );
}

// ─── Upload ISO form ──────────────────────────────────────────────────────────

function UploadIsoForm({ definition, onUploaded }: { definition: IsoDefinition; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState('');
  const [alsoQueue, setAlsoQueue] = useState(false);
  const [sourceVersion, setSourceVersion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Choose a file to upload.'); return; }
    if (!version.trim()) { setError('Version string is required.'); return; }
    if (alsoQueue && definition.sourceUrl && !sourceVersion.trim()) {
      setError('Enter a version string for the source download.'); return;
    }
    setUploading(true);
    setError(null);
    try {
      await importVersion(definition.id, file, version.trim());
      if (alsoQueue && definition.sourceUrl && sourceVersion.trim()) {
        await queueVersionDownload(definition.id, {
          versionString: sourceVersion.trim(),
          sourceUrl: definition.sourceUrl,
        });
      }
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '6px 8px',
    background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    color: 'var(--text-primary)', fontFamily: 'ui-monospace, monospace', fontSize: 11, outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'ui-monospace, monospace', fontSize: 10, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4, display: 'block',
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      {/* File picker */}
      <div>
        <span style={labelStyle}>ISO File</span>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            padding: '10px 12px', border: '1px dashed var(--border-default)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Choose file
          </span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: file ? 'var(--text-primary)' : 'var(--text-disabled)' }}>
            {file ? file.name : 'No file selected'}
          </span>
          {file && (
            <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
              {(file.size / 1024 / 1024).toFixed(0)} MB
            </span>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".iso,.img,.bin"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Version string */}
      <div>
        <span style={labelStyle}>Version String</span>
        <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 14.1" style={fieldStyle} />
      </div>

      {/* Also queue from source */}
      {definition.sourceUrl && (
        <div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={alsoQueue}
              onChange={e => setAlsoQueue(e.target.checked)}
              style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
            />
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Also queue download from source URL
              <span style={{ display: 'block', color: 'var(--text-muted)', marginTop: 1, fontSize: 9, wordBreak: 'break-all' }}>
                {definition.sourceUrl}
              </span>
            </span>
          </label>
          {alsoQueue && (
            <div style={{ marginTop: 8, paddingLeft: 20 }}>
              <span style={labelStyle}>Source version string</span>
              <input
                value={sourceVersion}
                onChange={e => setSourceVersion(e.target.value)}
                placeholder="e.g. 14.2"
                style={fieldStyle}
              />
            </div>
          )}
        </div>
      )}

      {error && <div style={{ fontSize: 11, color: 'var(--color-error)' }}>{error}</div>}

      <button type="submit" disabled={uploading} style={{
        alignSelf: 'flex-start', padding: '6px 16px',
        background: 'var(--accent)', color: '#080808', border: 'none',
        fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1,
      }}>
        {uploading ? 'Uploading…' : 'Upload ISO'}
      </button>
    </form>
  );
}

// ─── Timeline component ───────────────────────────────────────────────────────

type ActiveForm = 'download' | 'upload' | null;

export default function VersionTimeline({ definition }: Props) {
  const definitionId = definition.id;
  const [versions, setVersions] = useState<IsoVersion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchVersions(definitionId, { page, limit: LIMIT })
      .then((res) => {
        setVersions(res.data);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load versions.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [definitionId, page]);

  if (loading) {
    return (
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, padding: '16px 0', color: 'var(--text-muted)' }}>
        Loading versions…
      </p>
    );
  }

  if (error) {
    return (
      <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, padding: '16px 0', color: 'var(--color-error)' }}>
        {error}
      </p>
    );
  }

  if (versions.length === 0) {
    return (
      <div>
        <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
          No versions yet. Upload an ISO you already have or queue a download.
        </p>
        {activeForm === null && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setActiveForm('upload')} style={{
              padding: '6px 14px', background: 'var(--accent)', color: '#080808', border: 'none',
              fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
            }}>
              ↑ Upload ISO
            </button>
            <button onClick={() => setActiveForm('download')} style={{
              padding: '6px 14px', background: 'transparent', color: 'var(--accent)',
              border: '1px solid var(--accent)', fontFamily: 'ui-monospace, monospace',
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
            }}>
              ↓ Queue Download
            </button>
          </div>
        )}
        {activeForm === 'download' && (
          <div style={{ padding: '12px', border: '1px solid var(--border-default)' }}>
            <QueueDownloadForm definition={definition} onQueued={() => { setActiveForm(null); load(); }} />
          </div>
        )}
        {activeForm === 'upload' && (
          <div style={{ padding: '12px', border: '1px solid var(--border-default)' }}>
            <UploadIsoForm definition={definition} onUploaded={() => { setActiveForm(null); load(); }} />
          </div>
        )}
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{
          fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
        }}>
          {total} version{total !== 1 ? 's' : ''}
        </p>
        {activeForm === null && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setActiveForm('upload')} style={{
              padding: '4px 10px', background: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)', fontFamily: 'ui-monospace, monospace',
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
            }}>
              ↑ Upload
            </button>
            <button onClick={() => setActiveForm('download')} style={{
              padding: '4px 10px', background: 'transparent', color: 'var(--accent)',
              border: '1px solid var(--accent)', fontFamily: 'ui-monospace, monospace',
              fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', cursor: 'pointer',
            }}>
              ↓ Download
            </button>
          </div>
        )}
      </div>
      {activeForm !== null && (
        <div style={{ marginBottom: 20, padding: '12px', border: '1px solid var(--border-default)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)' }}>
              {activeForm === 'upload' ? '↑ Upload ISO' : '↓ Queue Download'}
            </span>
            <button onClick={() => setActiveForm(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
          {activeForm === 'download'
            ? <QueueDownloadForm definition={definition} onQueued={() => { setActiveForm(null); load(); }} />
            : <UploadIsoForm definition={definition} onUploaded={() => { setActiveForm(null); load(); }} />
          }
        </div>
      )}

      <div>
        {versions.map((v, i) => (
          <VersionRow key={v.id} version={v} isLast={i === versions.length - 1} />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{ ...btnStyle, opacity: page <= 1 ? 0.4 : 1 }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{ ...btnStyle, opacity: page >= totalPages ? 0.4 : 1 }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
