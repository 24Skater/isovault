import { useState, useCallback, useEffect } from 'react';
import { fetchSettings, updateSetting, type AppSetting } from '../api/settings';

const SETTING_LABELS: Record<string, { label: string; description: string; type: 'number' | 'select'; options?: string[] }> = {
  max_concurrent_downloads: {
    label: 'Max Concurrent Downloads',
    description: 'Maximum number of ISO files downloading simultaneously.',
    type: 'number',
  },
  default_retention_count: {
    label: 'Default Retention Count',
    description: 'Default number of active versions to keep per definition.',
    type: 'number',
  },
  default_retention_behavior: {
    label: 'Default Retention Behavior',
    description: 'What to do with excess versions: archive or permanently delete.',
    type: 'select',
    options: ['archive', 'delete'],
  },
  storage_alert_threshold_percent: {
    label: 'Storage Alert Threshold (%)',
    description: 'Alert when used storage exceeds this percentage of total.',
    type: 'number',
  },
  log_retention_days: {
    label: 'Log Retention Days',
    description: 'Number of days to keep audit log entries.',
    type: 'number',
  },
};

function SettingRow({
  setting,
  onSave,
}: {
  setting: AppSetting;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const meta = SETTING_LABELS[setting.key];
  const [draft, setDraft] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { setDraft(setting.value); }, [setting.value]);

  const dirty = draft !== setting.value;

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave(setting.key, draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
            {meta?.label ?? setting.key}
          </div>
          {meta?.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.description}</div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {meta?.type === 'select' ? (
            <select
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ fontSize: 13, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            >
              {(meta.options ?? []).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={{ fontSize: 13, padding: '5px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', width: 100 }}
            />
          )}

          <button
            onClick={() => void handleSave()}
            disabled={!dirty || saving}
            style={{
              padding: '5px 14px',
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: saved ? 'var(--color-success)' : dirty ? 'var(--accent)' : 'var(--bg-elevated)',
              color: saved || dirty ? '#fff' : 'var(--text-muted)',
              cursor: dirty && !saving ? 'pointer' : 'default',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {err && (
        <div style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 6 }}>{err}</div>
      )}
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSettings();
      setSettings(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = useCallback(async (key: string, value: string) => {
    const updated = await updateSetting(key, value);
    setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
  }, []);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 700 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 24 }}>
        Settings
      </h1>

      {error && (
        <div style={{ background: 'var(--color-error-subtle)', color: 'var(--color-error)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</p>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0 20px' }}>
          {settings.map((s) => (
            <SettingRow key={s.key} setting={s} onSave={handleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
