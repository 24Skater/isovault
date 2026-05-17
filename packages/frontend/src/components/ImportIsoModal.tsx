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
    width: '100%', boxSizing: 'border-box', padding: '7px 10px',
    background: 'var(--bg-input)', border: '1px solid var(--border-default)',
    color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 12, outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10,
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--text-muted)', marginBottom: 5,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        overflowY: 'auto', padding: '64px 16px',
        background: 'rgba(0,0,0,0.7)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent)' }}>
            ↑ Import ISO
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
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
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-input)',
              }}
            >
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                Choose file
              </span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: file ? 'var(--text-primary)' : 'var(--text-disabled)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {file ? file.name : 'No file selected'}
              </span>
              {file && (
                <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
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
              <div style={{ marginTop: 6, fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--color-success)' }}>
                ✓ Filename parsed — review fields below
              </div>
            )}
          </div>

          {/* Name */}
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Name *</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ubuntu 24.04 LTS" style={inputStyle} required />
          </label>

          {/* Family + Architecture */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'block' }}>
              <span style={labelStyle}>Family *</span>
              <input value={family} onChange={e => setFamily(e.target.value)} placeholder="ubuntu" style={inputStyle} required />
            </label>
            <label style={{ display: 'block' }}>
              <span style={labelStyle}>Architecture</span>
              <select value={architecture} onChange={e => setArchitecture(e.target.value)} style={inputStyle}>
                <option>x86_64</option>
                <option>aarch64</option>
                <option>arm</option>
                <option>riscv64</option>
              </select>
            </label>
          </div>

          {/* Version string */}
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Version String *</span>
            <input value={versionString} onChange={e => setVersionString(e.target.value)} placeholder="e.g. 24.04.2" style={inputStyle} required />
          </label>

          {/* Source URL */}
          <label style={{ display: 'block' }}>
            <span style={labelStyle}>Source URL <span style={{ fontWeight: 400, opacity: 0.7 }}>optional</span></span>
            <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://releases.ubuntu.com/…" style={inputStyle} />
          </label>

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
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Also queue download of newer version from source URL
                </span>
              </label>
              {alsoQueue && (
                <div style={{ marginTop: 8, paddingLeft: 20 }}>
                  <span style={labelStyle}>Newer version string *</span>
                  <input value={sourceVersion} onChange={e => setSourceVersion(e.target.value)} placeholder="e.g. 24.10" style={inputStyle} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 16px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', fontSize: 12, cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={saving} style={{ padding: '7px 16px', background: 'var(--accent)', color: '#080808', border: 'none', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Importing…' : 'Import ISO'}
          </button>
        </div>
      </form>
    </div>
  );
}
