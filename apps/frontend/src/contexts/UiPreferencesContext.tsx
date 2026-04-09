import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, type UiPreferences } from '@/api/users';
import { useAuth } from '@/contexts/AuthContext';

// ─── Color presets ────────────────────────────────────────────────────────────

export const COLOR_PRESETS: Record<string, { main: string; label: string }> = {
  indigo:  { main: 'oklch(66.34% 0.1806 277.2)',  label: 'Indigo' },
  red:     { main: 'oklch(62.78% 0.2048 25.33)',   label: 'Red' },
  orange:  { main: 'oklch(70.48% 0.1775 46.92)',   label: 'Orange' },
  amber:   { main: 'oklch(76.92% 0.1649 70.08)',   label: 'Amber' },
  yellow:  { main: 'oklch(83.52% 0.1643 89.2)',    label: 'Yellow' },
  lime:    { main: 'oklch(76.85% 0.1945 131.68)',  label: 'Lime' },
  green:   { main: 'oklch(72.32% 0.1699 149.58)',  label: 'Green' },
  emerald: { main: 'oklch(72.32% 0.1699 160.44)',  label: 'Emerald' },
  teal:    { main: 'oklch(70.41% 0.1267 182.5)',   label: 'Teal' },
  cyan:    { main: 'oklch(71.65% 0.1309 207.47)',  label: 'Cyan' },
  sky:     { main: 'oklch(68.47% 0.1553 237.25)',  label: 'Sky' },
};

const DEFAULTS: UiPreferences = {
  theme: null,
  color_preset: 'indigo',
  radius_base: '0px',
  box_shadow_x: '4px',
  box_shadow_y: '4px',
  font_weight_heading: '700',
  font_weight_base: '500',
};

// ─── Apply to DOM ─────────────────────────────────────────────────────────────

function applyPreferences(prefs: UiPreferences) {
  const root = document.documentElement;
  const preset = COLOR_PRESETS[prefs.color_preset] ?? COLOR_PRESETS['indigo'];
  root.style.setProperty('--main', preset.main);

  root.style.setProperty('--radius-base', prefs.radius_base);

  const bx = prefs.box_shadow_x;
  const by = prefs.box_shadow_y;
  const rbx = bx.startsWith('-') ? bx.slice(1) : `-${bx}`;
  const rby = by.startsWith('-') ? by.slice(1) : `-${by}`;
  root.style.setProperty('--spacing-boxShadowX', bx);
  root.style.setProperty('--spacing-boxShadowY', by);
  root.style.setProperty('--spacing-reverseBoxShadowX', rbx);
  root.style.setProperty('--spacing-reverseBoxShadowY', rby);
  root.style.setProperty('--shadow', `${bx} ${by} 0px 0px var(--border)`);

  root.style.setProperty('--font-weight-heading', prefs.font_weight_heading);
  root.style.setProperty('--font-weight-base', prefs.font_weight_base);
}

function clearPreferences() {
  const root = document.documentElement;
  const props = [
    '--main', '--radius-base',
    '--spacing-boxShadowX', '--spacing-boxShadowY',
    '--spacing-reverseBoxShadowX', '--spacing-reverseBoxShadowY',
    '--shadow', '--font-weight-heading', '--font-weight-base',
  ];
  for (const p of props) root.style.removeProperty(p);
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface UiPreferencesContextValue {
  preferences: UiPreferences;
  draft: UiPreferences;
  setDraft: (patch: Partial<UiPreferences>) => void;
  previewDraft: () => void;
  savePreferences: () => void;
  resetPreferences: () => void;
  isSaving: boolean;
}

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: fetched } = useQuery({
    queryKey: ['ui-preferences'],
    queryFn: usersApi.getPreferences,
    enabled: !!user,
    staleTime: Infinity,
  });

  const preferences: UiPreferences = fetched ?? DEFAULTS;
  const [draft, setDraftState] = useState<UiPreferences>(preferences);

  // Sync draft when server data arrives
  useEffect(() => {
    if (fetched) setDraftState(fetched);
  }, [fetched]);

  // Apply saved preferences to DOM on load
  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  const setDraft = useCallback((patch: Partial<UiPreferences>) => {
    setDraftState((prev) => ({ ...prev, ...patch }));
  }, []);

  const previewDraft = useCallback(() => {
    applyPreferences(draft);
  }, [draft]);

  const saveMutation = useMutation({
    mutationFn: (data: Partial<UiPreferences>) => usersApi.updatePreferences(data),
    onSuccess: (saved) => {
      queryClient.setQueryData(['ui-preferences'], saved);
      applyPreferences(saved);
    },
  });

  const savePreferences = useCallback(() => {
    saveMutation.mutate(draft);
  }, [draft, saveMutation]);

  const resetPreferences = useCallback(() => {
    setDraftState(DEFAULTS);
    clearPreferences();
    saveMutation.mutate(DEFAULTS);
  }, [saveMutation]);

  return (
    <UiPreferencesContext.Provider
      value={{
        preferences,
        draft,
        setDraft,
        previewDraft,
        savePreferences,
        resetPreferences,
        isSaving: saveMutation.isPending,
      }}
    >
      {children}
    </UiPreferencesContext.Provider>
  );
}

export function useUiPreferences() {
  const ctx = useContext(UiPreferencesContext);
  if (!ctx) throw new Error('useUiPreferences must be used within UiPreferencesProvider');
  return ctx;
}
