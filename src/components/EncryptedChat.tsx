import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lock, Send, Shield, Eye, BellRing, MessageCircle, KeyRound } from 'lucide-react';
import { User } from 'firebase/auth';
import { EncryptedMessage, PublicProfile } from '../types';
import { buildWhatsAppDirectUrl, WHATSAPP_DISPLAY_NUMBER } from '../data/communityProfiles';

interface EncryptedChatProps {
  user: User | null;
  profiles: PublicProfile[];
  unlockedTargetIds: Set<string>;
  hasGlobalPass: boolean;
  activePartnerUid: string | null;
  onSelectPartner: (uid: string) => void;
  messagesByConv: Record<string, EncryptedMessage[]>;
  onSendMessage: (partner: PublicProfile, plaintext: string) => Promise<void>;
  onUnlockRequest: (partner: PublicProfile) => void;
  onTyping: (partnerUid: string, isTyping: boolean) => void;
  typingFromUid: string | null;
  myFingerprint: string;
  pushPermission: NotificationPermission | 'unsupported';
  onEnablePush: () => void;
  onRequireLogin: () => void;
}

export function makeConvId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('__');
}

export const EncryptedChat: React.FC<EncryptedChatProps> = ({
  user,
  profiles,
  unlockedTargetIds,
  hasGlobalPass,
  activePartnerUid,
  onSelectPartner,
  messagesByConv,
  onSendMessage,
  onUnlockRequest,
  onTyping,
  typingFromUid,
  myFingerprint,
  pushPermission,
  onEnablePush,
  onRequireLogin,
}) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [showCiphertext, setShowCiphertext] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const otherProfiles = useMemo(
    () => profiles.filter((p) => !user || p.uid !== user.uid),
    [profiles, user]
  );

  const activePartner = useMemo(
    () => otherProfiles.find((p) => p.uid === activePartnerUid) ?? otherProfiles[0] ?? null,
    [otherProfiles, activePartnerUid]
  );

  const isUnlocked = useMemo(() => {
    if (!activePartner || !user) return false;
    return hasGlobalPass || unlockedTargetIds.has(activePartner.uid);
  }, [activePartner, user, hasGlobalPass, unlockedTargetIds]);

  const activeConvId =
    user && activePartner ? makeConvId(user.uid, activePartner.uid) : '';
  const messages = activeConvId ? messagesByConv[activeConvId] ?? [] : [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, activeConvId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!activePartner) return;
    if (!isUnlocked) {
      onUnlockRequest(activePartner);
      return;
    }
    const text = draft.trim();
    if (!text) return;

    setSending(true);
    setSendError(null);
    try {
      await onSendMessage(activePartner, text);
      setDraft('');
      onTyping(activePartner.uid, false);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Erreur d’envoi chiffré.');
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--border-hairline)]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Chiffrement ECDH P-256 · AES-GCM 256 bits
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Messagerie instantanée cryptée
          </h2>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            Vos échanges sont chiffrés directement sur votre appareil avant enregistrement. Personne,
            pas même nos serveurs, ne peut lire vos conversations privées.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {pushPermission !== 'granted' && pushPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={onEnablePush}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] bg-[var(--surface)] hover:border-[var(--accent)] transition-colors cursor-pointer"
            >
              <BellRing className="w-4 h-4 text-[var(--accent)]" />
              Activer les notifications push
            </button>
          )}
          {myFingerprint && (
            <div className="inline-flex items-center gap-2 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              <KeyRound className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Clé : {myFingerprint}</span>
            </div>
          )}
        </div>
      </div>

      {!user ? (
        <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-10 text-center space-y-4">
          <Lock className="w-8 h-8 mx-auto text-[var(--accent)]" />
          <h3 className="font-display text-2xl font-semibold text-[var(--ink)]">
            Connectez-vous pour générer vos clés de chiffrement
          </h3>
          <p className="text-sm text-[var(--ink-muted)] max-w-md mx-auto">
            Votre paire de clés cryptographiques ECDH P-256 est créée localement dès votre
            connexion afin de garantir le secret intégral de vos échanges.
          </p>
          <button
            type="button"
            onClick={onRequireLogin}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            Se connecter avec Google
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl overflow-hidden min-h-[560px]">
          {/* Contacts Sidebar */}
          <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
            <div className="px-5 py-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--ink)]">
                Contacts &amp; discussions
              </span>
              <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                {otherProfiles.length} membres
              </span>
            </div>

            {otherProfiles.map((partner) => {
              const selected = activePartner?.uid === partner.uid;
              const unlocked = hasGlobalPass || unlockedTargetIds.has(partner.uid);
              const convMsgs = messagesByConv[makeConvId(user.uid, partner.uid)] ?? [];
              return (
                <button
                  key={partner.uid}
                  type="button"
                  onClick={() => onSelectPartner(partner.uid)}
                  className={`w-full text-left px-5 py-4 flex items-center gap-3.5 transition-colors cursor-pointer ${
                    selected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--surface-muted)]/60'
                  }`}
                >
                  <img
                    src={partner.photoUrl}
                    alt={partner.displayName}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-lg object-cover shrink-0 bg-[var(--surface-muted)]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)] truncate">
                        {partner.displayName}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[var(--ink-muted)]">
                        {convMsgs.length > 0 ? `${convMsgs.length} msg` : unlocked ? 'Ouvert' : 'Verrouillé'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ink-muted)] truncate mt-0.5">
                      {partner.city} · {unlocked ? 'Canal E2EE actif' : 'Contact payant requis'}
                    </p>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Active Conversation */}
          <div className="lg:col-span-8 flex flex-col justify-between min-h-[480px]">
            {activePartner ? (
              <>
                <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={activePartner.photoUrl}
                      alt={activePartner.displayName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ink)]">
                        {activePartner.displayName}
                      </h3>
                      <p className="text-xs text-[var(--ink-muted)]">
                        {typingFromUid === activePartner.uid
                          ? 'En train d’écrire un message chiffré…'
                          : `${activePartner.city} · Chiffrement AES-256-GCM`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCiphertext((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {showCiphertext ? 'Masquer crypto' : 'Inspecter crypto'}
                    </button>
                    <a
                      href={buildWhatsAppDirectUrl(
                        `Assalamou alaykoum, je souhaite entrer en contact direct avec ${activePartner.displayName} via Le Chemin pour le Nikah.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:border-[var(--accent)] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
                      WhatsApp {WHATSAPP_DISPLAY_NUMBER}
                    </a>
                  </div>
                </div>

                {/* Messages stream */}
                <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[380px]">
                  {!isUnlocked && (
                    <div className="p-5 rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-muted)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                          <Shield className="w-4 h-4 text-[var(--accent)]" />
                          <span>Mise en contact sécurisée requise</span>
                        </div>
                        <p className="text-xs text-[var(--ink-muted)]">
                          Débloquez la prise de contact avec {activePartner.displayName} pour initier
                          votre discussion chiffrée et éviter tout spam.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onUnlockRequest(activePartner)}
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Débloquer le contact
                      </button>
                    </div>
                  )}

                  {messages.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[var(--ink-muted)]">
                      Aucun message dans ce canal chiffré pour le moment.
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderUid === user.uid;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                              isMine
                                ? 'bg-[var(--accent)] text-white'
                                : 'bg-[var(--surface-muted)] text-[var(--ink)]'
                            }`}
                          >
                            <p>{msg.plaintext ?? 'Déchiffrement en cours…'}</p>
                            {showCiphertext && (
                              <p className="mt-2 pt-2 border-t border-white/20 font-mono text-[10px] opacity-85 break-all">
                                AES-GCM IV={msg.iv.slice(0, 12)}… · CIPHER={msg.ciphertext.slice(0, 36)}…
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={endRef} />
                </div>

                {/* Input bar */}
                <form
                  onSubmit={handleSubmit}
                  className="p-4 border-t border-[var(--border-hairline)] flex flex-col gap-2"
                >
                  {sendError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{sendError}</p>
                  )}
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value);
                        if (isUnlocked && activePartner) {
                          onTyping(activePartner.uid, e.target.value.length > 0);
                        }
                      }}
                      placeholder={
                        isUnlocked
                          ? `Écrire un message chiffré à ${activePartner.displayName}…`
                          : `Débloquez le contact pour écrire à ${activePartner.displayName}`
                      }
                      className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      {isUnlocked ? 'Envoyer' : 'Débloquer'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-sm text-[var(--ink-muted)]">
                Sélectionnez un membre pour ouvrir la messagerie chiffrée.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
