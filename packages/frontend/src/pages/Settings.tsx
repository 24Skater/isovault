import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchSettings, updateSetting, type AppSetting } from '../api/settings';

type SectionName = 'General' | 'Storage' | 'Authentication' | 'Advanced';

const SECTIONS: SectionName[] = ['General', 'Storage', 'Authentication', 'Advanced'];

const SETTING_LABELS: Record<
  string,
  { label: string; description: string; type: 'number' | 'select'; options?: string[]; section: SectionName }
> = {
  max_concurrent_downloads: {
    label: 'Max Concurrent Downloads',
    description: 'Maximum number of ISO files downloading simultaneously.',
    type: 'number',
    section: 'General',
  },
  default_retention_count: {
    label: 'Default Retention Count',
    description: 'Default number of active versions to keep per definition.',
    type: 'number',
    section: 'General',
  },
  default_retention_behavior: {
    label: 'Default Retention Behavior',
    description: 'What to do with excess versions: archive or permanently delete.',
    type: 'select',
    options: ['archive', 'delete'],
    section: 'General',
  },
  storage_alert_threshold_percent: {
    label: 'Storage Alert Threshold (%)',
    description: 'Alert when used storage exceeds this percentage of total.',
    type: 'number',
    section: 'Storage',
  },
  log_retention_days: {
    label: 'Log Retention Days',
    description: 'Number of days to keep audit log entries.',
    type: 'number',
    section: 'Advanced',
  },
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 34,
  padding: '0 10px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 5,
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--accent)',
  color: 'var(--accent-fg)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '7px 16px',
  background: 'transparent',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

function SettingRow({
  setting,
  isLast,
  onSave,
}: {
  setting: AppSetting;
  isLast: boolean;
  onSave: (key: string, value: string) => Promise<void>;
}) {
  const meta = SETTING_LABELS[setting.key];
  const [draft, setDraft] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(setting.value);
  }, [setting.value]);

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const dirty = draft !== setting.value;

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await onSave(setting.key, draft);
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(setting.value);
    setErr(null);
  };

  return (
    <div
      style={{
        padding: '18px 0',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
      }}
    >
      <label htmlFor={`setting-${setting.key}`} style={labelStyle}>
        {meta?.label ?? setting.key}
      </label>
      {meta?.description && (
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 10,
          }}
        >
          {meta.description}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ maxWidth: 280, flex: 1 }}>
          {meta?.type === 'select' ? (
            <select
              id={`setting-${setting.key}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={inputStyle}
            >
              {(meta.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`setting-${setting.key}`}
              type="number"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              style={inputStyle}
            />
          )}
        </div>

        <button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          style={{
            ...primaryButtonStyle,
            background: saved
              ? 'var(--color-success)'
              : dirty
                ? 'var(--accent)'
                : 'var(--bg-elevated)',
            color: saved || dirty ? 'var(--accent-fg)' : 'var(--text-muted)',
            cursor: dirty && !saving ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>

        {dirty && !saving && (
          <button onClick={handleReset} style={secondaryButtonStyle}>
            Cancel
          </button>
        )}
      </div>

      {err && (
        <div
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
            color: 'var(--color-danger)',
            marginTop: 8,
          }}
        >
          {err}
        </div>
      )}
    </div>
  );
}

function EmptySection({ section }: { section: SectionName }) {
  return (
    <div
      style={{
        padding: '40px 0',
        textAlign: 'center',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        color: 'var(--text-muted)',
      }}
    >
      No {section.toLowerCase()} settings are configurable yet.
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionName>('General');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSettings();
      setSettings(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async (key: string, value: string) => {
    const updated = await updateSetting(key, value);
    setSettings((prev) => prev.map((s) => (s.key === key ? updated : s)));
  }, []);

  const sectionSettings = settings.filter(
    (s) => (SETTING_LABELS[s.key]?.section ?? 'Advanced') === activeSection,
  );

  return (
    <div style={{ padding: '28px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Settings
        </h1>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--accent-subtle)',
            border: '1px solid var(--color-danger)',
            color: 'var(--color-danger)',
            padding: '8px 12px',
            marginBottom: 16,
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
        {/* Settings nav */}
        <div style={{ width: 160, flexShrink: 0 }}>
          {SECTIONS.map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '7px 10px',
                background:
                  activeSection === section ? 'var(--accent-subtle)' : 'transparent',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color:
                  activeSection === section ? 'var(--accent)' : 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: activeSection === section ? 500 : 400,
                cursor: 'pointer',
                marginBottom: 2,
              }}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
            }}
          >
            {loading ? (
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--text-muted)',
                  fontSize: 13,
                  margin: 0,
                }}
              >
                Loading…
              </p>
            ) : sectionSettings.length === 0 ? (
              <EmptySection section={activeSection} />
            ) : (
              sectionSettings.map((s, i) => (
                <SettingRow
                  key={s.key}
                  setting={s}
                  isLast={i === sectionSettings.length - 1}
                  onSave={handleSave}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
