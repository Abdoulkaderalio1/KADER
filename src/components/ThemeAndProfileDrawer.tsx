import React, { useState } from 'react';
import { X, Sun, Moon, BellRing, LogOut, UserCheck, Palette } from 'lucide-react';
import { User } from 'firebase/auth';
import {
  AccentTone,
  DarkPalette,
  Gender,
  NikahTimeline,
  PracticeLevel,
  PublicProfile,
} from '../types';

interface ThemeAndProfileDrawerProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  myProfile: PublicProfile | null;
  darkMode: boolean;
  darkPalette: DarkPalette;
  accentTone: AccentTone;
  onChangeTheme: (opts: {
    darkMode?: boolean;
    darkPalette?: DarkPalette;
    accentTone?: AccentTone;
  }) => void;
  pushPermission: NotificationPermission | 'unsupported';
  onEnablePush: () => void;
  onLoginGoogle: () => void;
  onLogout: () => void;
  onSaveProfile: (data: {
    displayName: string;
    age: number;
    gender: Gender;
    city: string;
    country: string;
    profession: string;
    practiceLevel: PracticeLevel;
    nikahTimeline: NikahTimeline;
    bio: string;
    sharePrivacy: 'membres' | 'verifies_uniquement';
  }) => Promise<void>;
}

export const ThemeAndProfileDrawer: React.FC<ThemeAndProfileDrawerProps> = ({
  open,
  onClose,
  user,
  myProfile,
  darkMode,
  darkPalette,
  accentTone,
  onChangeTheme,
  pushPermission,
  onEnablePush,
  onLoginGoogle,
  onLogout,
  onSaveProfile,
}) => {
  const [displayName, setDisplayName] = useState(
    myProfile?.displayName ?? user?.displayName ?? ''
  );
  const [age, setAge] = useState<number>(myProfile?.age ?? 27);
  const [gender, setGender] = useState<Gender>(myProfile?.gender ?? 'homme');
  const [city, setCity] = useState(myProfile?.city ?? 'Niamey');
  const [country, setCountry] = useState(myProfile?.country ?? 'Niger');
  const [profession, setProfession] = useState(myProfile?.profession ?? 'Ingénieur');
  const [practiceLevel, setPracticeLevel] = useState<PracticeLevel>(
    myProfile?.practiceLevel ?? 'pratiquant'
  );
  const [nikahTimeline, setNikahTimeline] = useState<NikahTimeline>(
    myProfile?.nikahTimeline ?? '6_12_mois'
  );
  const [bio, setBio] = useState(
    myProfile?.bio ??
      'Démarche sincère et respectueuse en vue du Nikah, attaché(e) aux valeurs familiales.'
  );
  const [sharePrivacy, setSharePrivacy] = useState<'membres' | 'verifies_uniquement'>(
    myProfile?.sharePrivacy ?? 'membres'
  );
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      await onSaveProfile({
        displayName: displayName.trim() || user?.displayName || 'Membre',
        age,
        gender,
        city: city.trim() || 'Niamey',
        country: country.trim() || 'Niger',
        profession: profession.trim() || 'Membre',
        practiceLevel,
        nikahTimeline,
        bio: bio.trim(),
        sharePrivacy,
      });
      setSavedMsg('Profil enregistré dans votre espace sécurisé.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[var(--surface)] border-l border-[var(--border-hairline)] h-full overflow-y-auto p-6 sm:p-8 space-y-8">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
          <h3 className="font-display text-2xl font-semibold text-[var(--ink)]">
            Espace membre &amp; apparence
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="p-2 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customizable Dark Mode & Accent */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
            <Palette className="w-4 h-4 text-[var(--accent)]" />
            <span>Mode sombre personnalisable</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChangeTheme({ darkMode: false })}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                !darkMode
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-hairline)] text-[var(--ink-muted)]'
              }`}
            >
              <Sun className="w-4 h-4" />
              Mode clair
            </button>
            <button
              type="button"
              onClick={() => onChangeTheme({ darkMode: true })}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                darkMode
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border-hairline)] text-[var(--ink-muted)]'
              }`}
            >
              <Moon className="w-4 h-4" />
              Mode sombre
            </button>
          </div>

          {darkMode && (
            <div className="space-y-1.5">
              <span className="text-xs text-[var(--ink-muted)]">Ambiance du mode sombre</span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'emerald_night', label: 'Nuit Émeraude' },
                    { id: 'obsidian_gold', label: 'Obsidienne' },
                    { id: 'midnight_slate', label: 'Ardoise' },
                  ] as { id: DarkPalette; label: string }[]
                ).map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => onChangeTheme({ darkPalette: pal.id })}
                    className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      darkPalette === pal.id
                        ? 'border-[var(--accent)] text-[var(--ink)] bg-[var(--surface-muted)]'
                        : 'border-[var(--border-hairline)] text-[var(--ink-muted)]'
                    }`}
                  >
                    {pal.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-xs text-[var(--ink-muted)]">Couleur d’accentuation</span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'emerald', label: 'Émeraude' },
                  { id: 'gold', label: 'Or Impérial' },
                  { id: 'sapphire', label: 'Saphir' },
                ] as { id: AccentTone; label: string }[]
              ).map((tone) => (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => onChangeTheme({ accentTone: tone.id })}
                  className={`py-2 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    accentTone === tone.id
                      ? 'border-[var(--accent)] text-[var(--ink)] bg-[var(--surface-muted)]'
                      : 'border-[var(--border-hairline)] text-[var(--ink-muted)]'
                  }`}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--ink)]">
              <BellRing className="w-4 h-4 text-[var(--accent)]" />
              <span>Notifications push</span>
            </div>
            <p className="text-xs text-[var(--ink-muted)]">
              {pushPermission === 'granted'
                ? 'Alertes instantanées activées'
                : 'Soyez prévenu(e) de chaque nouveau message'}
            </p>
          </div>
          {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={onEnablePush}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] cursor-pointer shrink-0"
            >
              Activer
            </button>
          )}
        </div>

        {/* Account & Profile Form */}
        <div className="pt-4 border-t border-[var(--border-hairline)] space-y-4">
          {!user ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--ink-muted)]">
                Connectez-vous avec votre compte Google vérifié pour créer votre profil, effectuer
                la reconnaissance faciale et accéder à la messagerie cryptée.
              </p>
              <button
                type="button"
                onClick={onLoginGoogle}
                className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                Continuer avec Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink)]">
                  <UserCheck className="w-4 h-4 text-[var(--accent)]" />
                  <span className="truncate">{user.email}</span>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-red-600 cursor-pointer shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="col-span-2 space-y-1">
                  <span className="text-[var(--ink-muted)]">Nom / Prénom affiché</span>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[var(--ink-muted)]">Âge</span>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[var(--ink-muted)]">Profil</span>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  >
                    <option value="homme">Frère (Homme)</option>
                    <option value="femme">Sœur (Femme)</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[var(--ink-muted)]">Ville</span>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[var(--ink-muted)]">Pays</span>
                  <input
                    type="text"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  />
                </label>

                <label className="col-span-2 space-y-1">
                  <span className="text-[var(--ink-muted)]">Profession</span>
                  <input
                    type="text"
                    required
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[var(--ink-muted)]">Pratique</span>
                  <select
                    value={practiceLevel}
                    onChange={(e) => setPracticeLevel(e.target.value as PracticeLevel)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  >
                    <option value="pratiquant">Pratiquant(e) assidu(e)</option>
                    <option value="regulier">Pratique régulière</option>
                    <option value="en_apprentissage">En progression</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-[var(--ink-muted)]">Horizon Nikah</span>
                  <select
                    value={nikahTimeline}
                    onChange={(e) => setNikahTimeline(e.target.value as NikahTimeline)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  >
                    <option value="immediat">Sous 6 mois</option>
                    <option value="6_12_mois">6 à 12 mois</option>
                    <option value="connaissance_serieuse">Connaissance sérieuse</option>
                  </select>
                </label>

                <label className="col-span-2 space-y-1">
                  <span className="text-[var(--ink-muted)]">Confidentialité d’affichage</span>
                  <select
                    value={sharePrivacy}
                    onChange={(e) =>
                      setSharePrivacy(e.target.value as 'membres' | 'verifies_uniquement')
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  >
                    <option value="membres">Visible par les membres connectés</option>
                    <option value="verifies_uniquement">
                      Visible uniquement par les profils vérifiés
                    </option>
                  </select>
                </label>

                <label className="col-span-2 space-y-1">
                  <span className="text-[var(--ink-muted)]">Présentation &amp; intentions</span>
                  <textarea
                    rows={3}
                    maxLength={600}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                  />
                </label>
              </div>

              {savedMsg && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{savedMsg}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? 'Enregistrement…' : 'Enregistrer mon profil'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
