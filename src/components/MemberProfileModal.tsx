import React, { useState } from 'react';
import { X, ShieldCheck, Star, Lock, MessageSquare, Share2, MessageCircle } from 'lucide-react';
import { User } from 'firebase/auth';
import { MemberReview, PublicProfile } from '../types';
import {
  buildFacebookShareUrl,
  buildWhatsAppDirectUrl,
  PRACTICE_LABELS,
  TIMELINE_LABELS,
  WHATSAPP_DISPLAY_NUMBER,
} from '../data/communityProfiles';
import { formatDistanceLabel } from '../lib/geo';

interface MemberProfileModalProps {
  profile: PublicProfile | null;
  distanceKm: number | null;
  reviews: MemberReview[];
  avgRating: number;
  reviewCount: number;
  isUnlocked: boolean;
  user: User | null;
  onClose: () => void;
  onContactOrUnlock: (profile: PublicProfile) => void;
  onSubmitReview: (params: {
    targetUid: string;
    rating: number;
    sincerityScore: number;
    respectScore: number;
    comment: string;
  }) => Promise<void>;
  onRequireLogin: () => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  profile,
  distanceKm,
  reviews,
  avgRating,
  reviewCount,
  isUnlocked,
  user,
  onClose,
  onContactOrUnlock,
  onSubmitReview,
  onRequireLogin,
}) => {
  const [rating, setRating] = useState(5);
  const [sincerityScore, setSincerityScore] = useState(5);
  const [respectScore, setRespectScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSent, setReviewSent] = useState(false);

  if (!profile) return null;

  const isOwnProfile = user?.uid === profile.uid;
  const shareQuote = `Profil vérifié sur Le Chemin pour le Nikah : ${profile.displayName}, ${profile.age} ans à ${profile.city} (${profile.profession}). Démarche sérieuse et sécurisée.`;

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!profile) return;
    if (comment.trim().length < 5) {
      setReviewError('Veuillez rédiger un avis constructif d’au moins 5 caractères.');
      return;
    }

    setSubmitting(true);
    setReviewError(null);
    try {
      await onSubmitReview({
        targetUid: profile.uid,
        rating,
        sincerityScore,
        respectScore,
        comment: comment.trim(),
      });
      setComment('');
      setReviewSent(true);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Impossible d’enregistrer votre avis.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl max-w-3xl w-full overflow-hidden my-8">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Portrait Column */}
          <div className="md:col-span-5 bg-[var(--surface-muted)] relative min-h-[280px]">
            {profile.photoUrl ? (
              <img
                src={profile.photoUrl}
                alt={profile.displayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-8 text-center text-sm text-[var(--ink-muted)]">
                Portrait non publié
              </div>
            )}
          </div>

          {/* Info & Reviews Column */}
          <div className="md:col-span-7 p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-medium">
                  {profile.faceVerified && <ShieldCheck className="w-4 h-4" />}
                  <span>
                    {profile.faceVerified
                      ? 'Vérification faciale et photo validée'
                      : 'Vérification en cours'}
                  </span>
                </div>
                <h3 className="font-display text-3xl font-semibold text-[var(--ink)] mt-1">
                  {profile.displayName}, {profile.age} ans
                </h3>
                <p className="text-xs text-[var(--ink-muted)] mt-1">
                  {profile.city}, {profile.country}
                  {distanceKm !== null ? ` · à ${formatDistanceLabel(distanceKm)}` : ''}
                  {' · '}
                  <span className="font-mono tabular-nums">
                    {reviewCount > 0 ? `Note ${avgRating.toFixed(1)}/5 (${reviewCount} avis)` : 'Aucun avis pour le moment'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fermer"
                className="p-2 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-sm text-[var(--ink)] leading-relaxed">
              <p>{profile.bio}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border-hairline)] text-xs">
              <div>
                <span className="text-[var(--ink-muted)]">Profession</span>
                <p className="font-medium text-[var(--ink)] mt-0.5">{profile.profession}</p>
              </div>
              <div>
                <span className="text-[var(--ink-muted)]">Pratique religieuse</span>
                <p className="font-medium text-[var(--ink)] mt-0.5">
                  {PRACTICE_LABELS[profile.practiceLevel]}
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[var(--ink-muted)]">Horizon du Nikah</span>
                <p className="font-medium text-[var(--ink)] mt-0.5">
                  {TIMELINE_LABELS[profile.nikahTimeline]}
                </p>
              </div>
            </div>

            {/* Primary Contact & Direct Social Sharing */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={() => onContactOrUnlock(profile)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
                >
                  {isUnlocked ? <MessageSquare className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {isUnlocked ? 'Ouvrir la messagerie cryptée' : 'Débloquer le contact'}
                </button>
              )}

              <a
                href={buildFacebookShareUrl(shareQuote)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:border-[var(--accent)] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                Publier sur Facebook
              </a>

              <a
                href={buildWhatsAppDirectUrl(
                  `Assalamou alaykoum, je souhaite échanger via Le Chemin pour le Nikah concernant le profil de ${profile.displayName} (${profile.city}).`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:border-[var(--accent)] transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
                WhatsApp {WHATSAPP_DISPLAY_NUMBER}
              </a>
            </div>

            {/* Community Trust Rating & Reviews */}
            <div className="pt-5 border-t border-[var(--border-hairline)] space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--ink)]">
                  Évaluations &amp; confiance des membres
                </h4>
                <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-[var(--ink)]">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{reviewCount > 0 ? avgRating.toFixed(1) : '—'}</span>
                </div>
              </div>

              {reviews.length > 0 && (
                <div className="space-y-3">
                  {reviews.slice(0, 3).map((rev, idx) => (
                    <div
                      key={rev.id ?? idx}
                      className="p-3.5 rounded-lg bg-[var(--surface-muted)]/60 border border-[var(--border-hairline)] space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--ink)]">{rev.authorName}</span>
                        <span className="font-mono tabular-nums text-[var(--ink-muted)]">
                          Note {rev.rating}/5 · Sincérité {rev.sincerityScore}/5
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!isOwnProfile && (
                <form onSubmit={handleReview} className="space-y-3 pt-2">
                  <p className="text-xs font-medium text-[var(--ink-muted)]">
                    Laisser une évaluation de confiance
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <label className="space-y-1">
                      <span className="text-[var(--ink-muted)]">Note globale</span>
                      <select
                        value={rating}
                        onChange={(e) => setRating(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[var(--ink-muted)]">Sincérité</span>
                      <select
                        value={sincerityScore}
                        onChange={(e) => setSincerityScore(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-[var(--ink-muted)]">Respect</span>
                      <select
                        value={respectScore}
                        onChange={(e) => setRespectScore(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-md bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                      >
                        {[5, 4, 3, 2, 1].map((n) => (
                          <option key={n} value={n}>
                            {n} / 5
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <textarea
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Partagez votre expérience d’échange (courtoisie, sérieux, clarté)…"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                  />

                  {reviewError && <p className="text-xs text-red-600 dark:text-red-400">{reviewError}</p>}
                  {reviewSent && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Votre évaluation a été enregistrée pour renforcer la confiance communautaire.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {submitting ? 'Publication…' : 'Publier mon avis'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
