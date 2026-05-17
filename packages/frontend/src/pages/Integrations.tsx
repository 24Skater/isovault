import { useState, useEffect, useCallback } from 'react';
import type { IntegrationToken, CreatedToken } from '../api/integrations';
import {
  listIntegrationTokens,
  createIntegrationToken,
  revokeIntegrationToken,
  deleteIntegrationToken,
} from '../api/integrations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function baseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '7px 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  fontSize: 12,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--text-muted)',
  marginBottom: 5,
};

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: 'var(--text-secondary)',
  marginBottom: 14,
};

const codeBlockStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  padding: '10px 14px',
  fontFamily: 'ui-monospace, monospace',
  fontSize: 11,
  color: 'var(--text-primary)',
  lineHeight: 1.7,
  overflowX: 'auto',
  whiteSpace: 'pre',
};

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      style={{
        padding: '3px 10px',
        background: 'transparent',
        border: '1px solid var(--border-default)',
        color: copied ? 'var(--color-success)' : 'var(--text-muted)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ─── Token row ────────────────────────────────────────────────────────────────

function TokenRow({ token, onRevoke, onDelete }: {
  token: IntegrationToken;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <tr style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-base)' }}>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ fontWeight: 500, color: token.revoked ? 'var(--text-disabled)' : 'var(--text-primary)' }}>
          {token.name}
        </div>
        {token.description && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {token.description}
          </div>
        )}
      </td>
      <td style={{ padding: '10px 16px' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 7px',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          border: token.revoked
            ? '1px solid var(--border-strong)'
            : '1px solid var(--color-success)',
          color: token.revoked ? 'var(--text-muted)' : 'var(--color-success)',
        }}>
          {token.revoked ? 'Revoked' : 'Active'}
        </span>
      </td>
      <td style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
        {timeAgo(token.createdAt)}
      </td>
      <td style={{ padding: '10px 16px', fontFamily: 'ui-monospace, monospace', fontSize: 10, color: 'var(--text-muted)' }}>
        {token.lastUsedAt ? timeAgo(token.lastUsedAt) : '—'}
      </td>
      <td style={{ padding: '10px 16px' }}>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          {!token.revoked && (
            <button
              onClick={() => onRevoke(token.id)}
              style={{
                padding: '3px 10px',
                background: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              Revoke
            </button>
          )}
          <button
            onClick={() => onDelete(token.id)}
            style={{
              padding: '3px 10px',
              background: 'transparent',
              border: '1px solid var(--color-error)',
              color: 'var(--color-error)',
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── New-token reveal ─────────────────────────────────────────────────────────

function NewTokenReveal({ token, onDismiss }: { token: CreatedToken; onDismiss: () => void }) {
  return (
    <div style={{
      marginBottom: 20,
      padding: '14px 16px',
      background: 'var(--color-success-subtle, rgba(52,199,89,0.08))',
      border: '1px solid var(--color-success)',
    }}>
      <div style={{ marginBottom: 8, fontFamily: 'ui-monospace, monospace', fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>
        Token created — copy it now. It will not be shown again.
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={{
          flex: 1,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 12,
          color: 'var(--text-primary)',
          wordBreak: 'break-all',
        }}>
          {token.token}
        </code>
        <CopyButton text={token.token} />
      </div>
      <button
        onClick={onDismiss}
        style={{
          marginTop: 10,
          padding: '4px 12px',
          background: 'transparent',
          border: '1px solid var(--border-default)',
          color: 'var(--text-muted)',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          cursor: 'pointer',
        }}
      >
        I've saved it — dismiss
      </button>
    </div>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateTokenForm({ onCreate }: { onCreate: (t: CreatedToken) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const token = await createIntegrationToken(name.trim(), description.trim() || undefined);
      onCreate(token);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
      <div style={{ flex: '1 1 180px', minWidth: 140 }}>
        <span style={labelStyle}>Token name *</span>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Proxmox Node 1" style={inputStyle} />
      </div>
      <div style={{ flex: '2 1 240px', minWidth: 160 }}>
        <span style={labelStyle}>Description <span style={{ fontWeight: 400, opacity: 0.7 }}>optional</span></span>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Homelab PVE node" style={inputStyle} />
      </div>
      <button
        type="submit"
        disabled={saving}
        style={{
          padding: '7px 16px',
          background: 'var(--accent)',
          color: '#080808',
          border: 'none',
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
          flexShrink: 0,
          alignSelf: 'flex-end',
          marginBottom: 0,
          height: 32,
        }}
      >
        {saving ? 'Creating…' : '+ Create Token'}
      </button>
      {error && (
        <div style={{ width: '100%', fontSize: 11, color: 'var(--color-error)', fontFamily: 'ui-monospace, monospace' }}>
          {error}
        </div>
      )}
    </form>
  );
}

// ─── Guide card ───────────────────────────────────────────────────────────────

function GuideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border-default)',
      background: 'var(--bg-surface)',
      marginBottom: 16,
    }}>
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--accent)',
      }}>
        {title}
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function CodeSnippet({ code }: { code: string }) {
  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      <div style={codeBlockStyle}>{code}</div>
      <div style={{ position: 'absolute', top: 6, right: 8 }}>
        <CopyButton text={code} />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Integrations() {
  const [tokens, setTokens] = useState<IntegrationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newToken, setNewToken] = useState<CreatedToken | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTokens(await listIntegrationTokens());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleRevoke(id: string) {
    try { await revokeIntegrationToken(id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to revoke.'); }
  }

  async function handleDelete(id: string) {
    try { await deleteIntegrationToken(id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete.'); }
  }

  const exampleToken = newToken?.token ?? '<integration-token>';
  const base = baseUrl();
  const downloadUrl = `${base}/api/versions/<version-id>/download?token=${exampleToken}`;
  const listUrl = `${base}/api/definitions?token=${exampleToken}`;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
        }}>
          Integrations
        </h1>
      </div>
      <div className="page-rule" />

      {/* ── Integration Tokens ───────────────────────────────────────────────── */}
      <div style={{ marginBottom: 32 }}>
        <div style={sectionHeadStyle}>Integration Tokens</div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Integration tokens grant <strong style={{ color: 'var(--text-secondary)' }}>read-only</strong> access
          to catalog listings and ISO downloads. Use them instead of your main API key when connecting
          external tools — a compromised token can be revoked without rotating your primary key.
        </p>

        <CreateTokenForm onCreate={(t) => { setNewToken(t); void load(); }} />

        {newToken && (
          <NewTokenReveal token={newToken} onDismiss={() => setNewToken(null)} />
        )}

        {error && (
          <div style={{ marginBottom: 16, padding: '8px 12px', background: 'var(--color-error-subtle)', border: '1px solid var(--color-error)', color: 'var(--color-error)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>
            {error}
          </div>
        )}

        <div style={{ border: '1px solid var(--border-default)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)' }}>
                {['Name', 'Status', 'Created', 'Last Used', ''].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '8px 16px',
                    fontFamily: 'ui-monospace, monospace', fontSize: 10,
                    fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--text-muted)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>Loading…</td></tr>
              ) : tokens.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>No tokens yet. Create one above.</td></tr>
              ) : tokens.map(t => (
                <TokenRow
                  key={t.id}
                  token={t}
                  onRevoke={(id) => void handleRevoke(id)}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Integration Guides ───────────────────────────────────────────────── */}
      <div style={sectionHeadStyle}>Setup Guides</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
        Create a token above first — the examples below will update with your token automatically.
      </p>

      {/* Proxmox */}
      <GuideCard title="Proxmox VE">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          In Proxmox, go to <strong style={{ color: 'var(--text-secondary)' }}>Datacenter → Storage → your ISO storage → Download from URL</strong>.
          Paste the direct download URL for any active ISO version. Find version IDs on the Catalog page.
        </p>
        <div>
          <span style={labelStyle}>Direct ISO download URL</span>
          <CodeSnippet code={downloadUrl} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={labelStyle}>List available ISOs (JSON)</span>
          <CodeSnippet code={listUrl} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={labelStyle}>Download via pveam CLI</span>
          <CodeSnippet code={`pveam download local "${downloadUrl}"`} />
        </div>
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-input)', border: '1px solid var(--border-default)', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6 }}>
          Tip: Replace &lt;version-id&gt; with the ID shown in the Versions panel for each ISO in your catalog.
        </div>
      </GuideCard>

      {/* Generic HTTP */}
      <GuideCard title="Generic HTTP / curl">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Any tool that can make HTTP GET requests can download ISOs directly.
          Use <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>?token=</code> in the URL
          or the <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>Authorization: Bearer</code> header.
        </p>
        <div>
          <span style={labelStyle}>Download via curl (token in URL)</span>
          <CodeSnippet code={`curl -L -o ubuntu.iso "${downloadUrl}"`} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={labelStyle}>Download via curl (Authorization header)</span>
          <CodeSnippet code={`curl -L -o ubuntu.iso \\\n  -H "Authorization: Bearer ${exampleToken}" \\\n  "${base}/api/versions/<version-id>/download"`} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={labelStyle}>List catalog via API</span>
          <CodeSnippet code={`curl -s "${listUrl}" | jq '.data[] | {id, name, family}'`} />
        </div>
      </GuideCard>

      {/* Terraform / Packer */}
      <GuideCard title="Terraform / Packer / Ansible">
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
          Use the download URL as an ISO source in any provisioning tool. The URL is a stable direct download
          that respects the token scope.
        </p>
        <div>
          <span style={labelStyle}>Packer HCL source</span>
          <CodeSnippet code={`source "qemu" "ubuntu" {\n  iso_url      = "${downloadUrl}"\n  iso_checksum = "none"\n}`} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span style={labelStyle}>Ansible get_url task</span>
          <CodeSnippet code={`- name: Download ISO\n  ansible.builtin.get_url:\n    url: "${downloadUrl}"\n    dest: /tmp/ubuntu.iso`} />
        </div>
      </GuideCard>
    </div>
  );
}
