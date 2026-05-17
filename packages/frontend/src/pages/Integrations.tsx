import { useState, useEffect, useCallback } from 'react';
import type { IntegrationToken, CreatedToken } from '../api/integrations';
import {
  listIntegrationTokens,
  createIntegrationToken,
  revokeIntegrationToken,
  deleteIntegrationToken,
} from '../api/integrations';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 11px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
};

const sectionHeadStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '-0.01em',
  color: 'var(--text-primary)',
  marginBottom: 12,
};

const codeBlockStyle: React.CSSProperties = {
  background: 'var(--bg-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 14px',
  fontFamily: 'var(--font-mono)',
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
      onClick={() => {
        if (!navigator.clipboard) return;
        void navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
      }}
      style={{
        padding: '4px 10px',
        background: 'transparent',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        color: copied ? 'var(--color-success)' : 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ─── Token card ───────────────────────────────────────────────────────────────

function TokenCard({ token, onRevoke, onDelete }: {
  token: IntegrationToken;
  onRevoke: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      opacity: token.revoked ? 0.5 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            {token.name}
          </span>
          {token.revoked ? (
            <span style={{
              padding: '2px 8px',
              borderRadius: 9999,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              background: 'var(--color-danger-subtle)',
              color: 'var(--color-danger)',
            }}>
              Revoked
            </span>
          ) : (
            <span style={{
              padding: '2px 8px',
              borderRadius: 9999,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 500,
              background: 'var(--color-success-subtle)',
              color: 'var(--color-success)',
            }}>
              Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-disabled)',
          }}>
            Created {new Date(token.createdAt).toLocaleDateString()}
          </span>
          {token.lastUsedAt && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-disabled)',
            }}>
              Last used {new Date(token.lastUsedAt).toLocaleDateString()}
            </span>
          )}
          {token.description && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>
              {token.description}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {!token.revoked && (
          <button
            onClick={() => onRevoke(token.id)}
            style={{
              padding: '5px 12px',
              background: 'transparent',
              color: 'var(--color-warning)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Revoke
          </button>
        )}
        <button
          onClick={() => onDelete(token.id)}
          style={{
            padding: '5px 12px',
            background: 'transparent',
            color: 'var(--color-danger)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Create token modal ───────────────────────────────────────────────────────

function CreateTokenModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      const created: CreatedToken = await createIntegrationToken(
        name.trim(),
        description.trim() || undefined,
      );
      setCreatedToken(created.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create token.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 460,
          padding: '24px 26px',
          animation: 'slideInUp 180ms ease-out',
        }}
      >
        <h2 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
          marginBottom: 4,
        }}>
          Create Integration Token
        </h2>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Read-only access to catalog listings and ISO downloads.
        </p>

        {createdToken ? (
          <>
            <div style={{ marginTop: 4 }}>
              <div style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--color-success)',
                marginBottom: 8,
              }}>
                ✓ Token created. Copy it now — it won't be shown again.
              </div>
              <div style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--radius-md)',
              }}>
                <code style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  color: 'var(--accent)',
                  flex: 1,
                  wordBreak: 'break-all',
                }}>
                  {createdToken}
                </code>
                <button
                  onClick={() => {
                    if (!navigator.clipboard) return;
                    void navigator.clipboard.writeText(createdToken);
                  }}
                  style={{
                    padding: '4px 10px',
                    background: 'var(--accent)',
                    color: 'var(--accent-fg)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Copy
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => { onCreated(); onClose(); }}
                style={{
                  padding: '7px 14px',
                  background: 'var(--accent)',
                  color: 'var(--accent-fg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="token-name" style={labelStyle}>Token name *</label>
              <input
                id="token-name"
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Proxmox Node 1"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="token-description" style={labelStyle}>
                Description <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>optional</span>
              </label>
              <input
                id="token-description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Homelab PVE node"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 14,
                padding: '8px 12px',
                background: 'var(--color-danger-subtle)',
                border: '1px solid var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '7px 14px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '7px 14px',
                  background: 'var(--accent)',
                  color: 'var(--accent-fg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Creating…' : 'Create Token'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Guide card ───────────────────────────────────────────────────────────────

function GuideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--accent)',
      }}>
        {title}
      </div>
      <div style={{ padding: '18px' }}>
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
  const [showCreate, setShowCreate] = useState(false);

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
    setError(null);
    try { await revokeIntegrationToken(id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to revoke.'); }
  }

  async function handleDelete(id: string) {
    setError(null);
    try { await deleteIntegrationToken(id); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to delete.'); }
  }

  const exampleToken = '<integration-token>';
  const base = baseUrl();
  const downloadUrl = `${base}/api/versions/<version-id>/download?token=${exampleToken}`;
  const listUrl = `${base}/api/definitions?token=${exampleToken}`;

  return (
    <div style={{ padding: '28px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}>
            Integrations
          </h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>
            API tokens for read-only external access
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '7px 14px',
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Create Token
        </button>
      </div>

      <div style={{ maxWidth: 1000 }}>
        {/* ── Integration Tokens ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Integration tokens grant <strong style={{ color: 'var(--text-secondary)' }}>read-only</strong> access
            to catalog listings and ISO downloads. Use them instead of your main API key when connecting
            external tools — a compromised token can be revoked without rotating your primary key.
          </p>

          {error && (
            <div style={{
              marginBottom: 16,
              padding: '10px 14px',
              background: 'var(--color-danger-subtle)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
            }}>
              Loading tokens…
            </div>
          ) : tokens.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-lg)',
            }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                No integration tokens yet
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                Create a token to connect Proxmox, Packer, or any HTTP client.
              </div>
              <button
                onClick={() => setShowCreate(true)}
                style={{
                  padding: '7px 14px',
                  background: 'var(--accent)',
                  color: 'var(--accent-fg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Create Token
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tokens.map((token) => (
                <TokenCard
                  key={token.id}
                  token={token}
                  onRevoke={(id) => void handleRevoke(id)}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Integration Guides ──────────────────────────────────────────────── */}
        <div style={sectionHeadStyle}>Setup Guides</div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
          Replace <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>&lt;integration-token&gt;</code> with
          a token created above, and <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>&lt;version-id&gt;</code> with
          an ISO version ID from the Catalog page.
        </p>

        {/* Proxmox */}
        <GuideCard title="Proxmox VE">
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
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
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Tip: Replace &lt;version-id&gt; with the ID shown in the Versions panel for each ISO in your catalog.
          </div>
        </GuideCard>

        {/* Generic HTTP */}
        <GuideCard title="Generic HTTP / curl">
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
            Any tool that can make HTTP GET requests can download ISOs directly.
            Use <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>?token=</code> in the URL
            or the <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>Authorization: Bearer</code> header.
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
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.6 }}>
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

      {showCreate && (
        <CreateTokenModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { void load(); }}
        />
      )}
    </div>
  );
}
