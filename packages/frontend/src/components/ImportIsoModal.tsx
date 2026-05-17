import { useState, useRef } from 'react';
import { createDefinition, importVersion, queueVersionDownload } from '../api/definitions';

// ─── Filename parser ──────────────────────────────────────────────────────────

interface Parsed {
  name: string;
  family: string;
  version: string;
  architecture: string;
}

const KNOWN_FAMILIES: [string, string][] = [
  ['ubuntu', 'Ubuntu'],
  ['debian', 'Debian'],
  ['fedora', 'Fedora'],
  ['alpine', 'Alpine Linux'],
  ['freebsd', 'FreeBSD'],
  ['rocky', 'Rocky Linux'],
  ['almalinux', 'AlmaLinux'],
  ['alma', 'AlmaLinux'],
  ['centos', 'CentOS'],
  ['arch', 'Arch Linux'],
  ['opensuse', 'openSUSE'],
  ['suse', 'openSUSE'],
  ['mint', 'Linux Mint'],
  ['kali', 'Kali Linux'],
  ['manjaro', 'Manjaro'],
  ['void', 'Void Linux'],
  ['nixos', 'NixOS'],
  ['endeavour', 'EndeavourOS'],
  ['pop', 'Pop!_OS'],
  ['garuda', 'Garuda Linux'],
];

function parseIsoFilename(filename: string): Parsed {
  const base = filename.replace(/\.(iso|img|bin)$/i, '').toLowerCase();

  let architecture = 'x86_64';
  if (/aarch64|arm64/.test(base)) architecture = 'aarch64';
  else if (/\barm\b/.test(base)) architecture = 'arm';
  else if (/riscv64/.test(base)) architecture = 'riscv64';

  let family = '';
  let displayFamily = '';
  for (const [slug, label] of KNOWN_FAMILIES) {
    if (base.includes(slug)) { family = slug; displayFamily = label; break; }
  }

  const versionMatch = base.match(/(\d+\.\d+(?:\.\d+)*)/);
  const version = versionMatch?.[1] ?? '';

  const name = displayFamily && version
    ? `${displayFamily} ${version}`
    : displayFamily || '';

  return { name, family, version, architecture };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export function ImportIsoModal({ onClose, onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [family, setFamily] = useState('');
  const [architecture, setArchitecture] = useState('x86_64');
  const [versionString, setVersionString] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [alsoQueue, setAlsoQueue] = useState(false);
  const [sourceVersion, setSourceVersion] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(f: File) {
    setFile(f);
    const parsed = parseIsoFilename(f.name);
    if (parsed.name && !name) setName(parsed.name);
    if (parsed.family && !family) setFamily(parsed.family);
    if (parsed.version && !versionString) setVersionString(parsed.version);
    if (parsed.architecture) setArchitecture(parsed.architecture);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError('Choose an ISO file.'); return; }
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!family.trim()) { setError('Family is required.'); return; }
    if (!versionString.trim()) { setError('Version string is required.'); return; }
    if (alsoQueue && sourceUrl && !sourceVersion.trim()) {
      setError('Enter the source version string to queue.'); return;
    }

    setSaving(true);
    setError(null);
    try {
      const def = await createDefinition({
        name: name.trim(),
        family: family.trim().toLowerCase(),
        architecture: architecture.trim(),
        sourceUrl: sourceUrl.trim() || null,
      });
      await importVersion(def.id, file, versionString.trim());
      if (alsoQueue && sourceUrl.trim() && sourceVersion.trim()) {
        await queueVersionDownload(def.id, {
          versionString: sourceVersion.trim(),
          sourceUrl: sourceUrl.trim(),
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', height: 34, padding: '0 10px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: 13, outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'var(--font-sans)', fontSize: 11,
    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--text-muted)', marginBottom: 5,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '64px 16px',
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
          animation: 'slideInUp 180ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Import ISO
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--color-danger-subtle)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontFamily: 'var(--font-sans)', fontSize: 12 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* File picker */}
          <div>
            <span style={labelStyle}>ISO File *</span>
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                padding: '12px 14px', border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-input)',
              }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500, color: 'var(--accent)', flexShrink: 0 }}>
                Choose file
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: file ? 'var(--text-primary)' : 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file ? file.name : 'No file selected'}
              </span>
              {file && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {(file.size / 1024 / 1024).toFixed(0)} MB
                </span>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".iso,.img,.bin"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
            />
            {file && (
              <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--color-success)' }}>
                ✓ Filename parsed — review fields below
              </div>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="import-name" style={labelStyle}>Name *</label>
            <input id="import-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ubuntu 24.04 LTS" style={inputStyle} required />
          </div>

          {/* Family + Architecture */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label htmlFor="import-family" style={labelStyle}>Family *</label>
              <input id="import-family" value={family} onChange={e => setFamily(e.target.value)} placeholder="ubuntu" style={inputStyle} required />
            </div>
            <div>
              <label htmlFor="import-arch" style={labelStyle}>Architecture</label>
              <select id="import-arch" value={architecture} onChange={e => setArchitecture(e.target.value)} style={inputStyle}>
                <option>x86_64</option>
                <option>aarch64</option>
                <option>arm</option>
                <option>riscv64</option>
              </select>
            </div>
          </div>

          {/* Version string */}
          <div>
            <label htmlFor="import-version" style={labelStyle}>Version String *</label>
            <input id="import-version" value={versionString} onChange={e => setVersionString(e.target.value)} placeholder="e.g. 24.04.2" style={inputStyle} required />
          </div>

          {/* Source URL */}
          <div>
            <label htmlFor="import-source-url" style={labelStyle}>Source URL <span style={{ fontWeight: 400, opacity: 0.7 }}>optional</span></label>
            <input id="import-source-url" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://releases.ubuntu.com/…" style={inputStyle} />
          </div>

          {/* Also queue newer from source */}
          {sourceUrl && (
            <div>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={alsoQueue}
                  onChange={e => setAlsoQueue(e.target.checked)}
                  style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
                />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Also queue download of newer version from source URL
                </span>
              </label>
              {alsoQueue && (
                <div style={{ marginTop: 8, paddingLeft: 20 }}>
                  <label htmlFor="import-source-version" style={labelStyle}>Newer version string *</label>
                  <input id="import-source-version" value={sourceVersion} onChange={e => setSourceVersion(e.target.value)} placeholder="e.g. 24.10" style={inputStyle} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={onClose} style={{
            padding: '7px 16px', background: 'transparent', color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{
            padding: '7px 16px', background: 'var(--accent)', color: 'var(--accent-fg)',
            border: 'none', borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Importing…' : 'Import ISO'}
          </button>
        </div>
      </form>
    </div>
  );
}
