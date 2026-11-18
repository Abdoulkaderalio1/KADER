import React, { useState } from 'react';
import { Lock, ShieldCheck, X, CreditCard, CheckCircle2 } from 'lucide-react';
import { PaymentMethod, PublicProfile, UnlockPlan } from '../types';

interface PaidContactModalProps {
  profile: PublicProfile | null;
  onClose: () => void;
  onConfirmPayment: (params: {
    targetUid: string;
    plan: UnlockPlan;
    amountFcfa: number;
    paymentMethod: PaymentMethod;
    reference: string;
  }) => Promise<void>;
}

const PLANS: {
  id: UnlockPlan;
  title: string;
  price: number;
  priceLabel: string;
  detail: string;
}[] = [
  {
    id: 'contact_unique',
    title: 'Mise en contact unique',
    price: 2500,
    priceLabel: '2 500 FCFA',
    detail: 'Débloque la messagerie chiffrée avec ce membre à vie.',
  },
  {
    id: 'pass_mensuel',
    title: 'Pass Nikah Mensuel',
    price: 9500,
    priceLabel: '9 500 FCFA / mois',
    detail: 'Mises en contact illimitées + priorité locale pendant 30 jours.',
  },
  {
    id: 'pass_serenite',
    title: 'Pass Sérénité 3 Mois',
    price: 22000,
    priceLabel: '22 000 FCFA / 3 mois',
    detail: 'Accès illimité 90 jours + vérification prioritaire du dossier.',
  },
];

const METHODS: PaymentMethod[] = ['Wave', 'Orange Money', 'Moov Money', 'Carte Bancaire'];

export const PaidContactModal: React.FC<PaidContactModalProps> = ({
  profile,
  onClose,
  onConfirmPayment,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<UnlockPlan>('contact_unique');
  const [method, setMethod] = useState<PaymentMethod>('Wave');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  const activePlan = PLANS.find((p) => p.id === selectedPlan) ?? PLANS[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    const trimmed = reference.trim();
    if (trimmed.length < 4) {
      setError(
        method === 'Carte Bancaire'
          ? 'Veuillez saisir les 4 derniers chiffres ou référence de carte.'
          : 'Veuillez saisir votre numéro Mobile Money valide (min. 8 chiffres).'
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onConfirmPayment({
        targetUid: profile.uid,
        plan: activePlan.id,
        amountFcfa: activePlan.price,
        paymentMethod: method,
        reference: trimmed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du règlement.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl max-w-xl w-full p-6 sm:p-8 space-y-6 my-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-[var(--accent)]">
              <Lock className="w-3.5 h-3.5" />
              <span>Protection anti-spam et sérieux garanti</span>
            </div>
            <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)]">
              Contacter {profile.displayName}
            </h3>
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

        <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
          La mise en contact payante filtre les comptes opportunistes, bloque les messages en masse et
          garantit que chaque discussion s’ouvre dans une intention sincère de Nikah.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[var(--ink-muted)]">
              Formule de mise en contact
            </label>
            <div className="space-y-2.5">
              {PLANS.map((plan) => {
                const active = selectedPlan === plan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                        : 'border-[var(--border-hairline)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-sm font-semibold text-[var(--ink)]">{plan.title}</span>
                      <span className="font-mono text-sm tabular-nums font-semibold text-[var(--accent)]">
                        {plan.priceLabel}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] mt-1">{plan.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[var(--ink-muted)]">
              Moyen de règlement sécurisé
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                    method === m
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--border-hairline)] text-[var(--ink)] hover:bg-[var(--surface-muted)]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pay-ref" className="block text-xs font-medium text-[var(--ink-muted)]">
              {method === 'Carte Bancaire'
                ? 'Titulaire ou référence carte'
                : `Numéro ${method} (+227 / Afrique de l’Ouest / International)`}
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-[var(--ink-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="pay-ref"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={method === 'Carte Bancaire' ? 'Ex. VISA •••• 4242' : 'Ex. +227 99 00 00 00'}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--border-hairline)]">
            <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
              <span>Messagerie E2EE activée immédiatement après validation</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submitting ? 'Validation…' : `Débloquer · ${activePlan.priceLabel}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
