import React, { useState } from 'react';
import { ChevronDown, MessageCircle, ShieldCheck } from 'lucide-react';
import { buildWhatsAppDirectUrl, WHATSAPP_DISPLAY_NUMBER } from '../data/communityProfiles';

type FaqCategory = 'toutes' | 'nikah' | 'securite';

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, 'toutes'>;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'nikah-serieux',
    category: 'nikah',
    question: 'Comment la plateforme garantit-elle une démarche sérieuse orientée vers le Nikah ?',
    answer:
      'Chaque membre précise dès son inscription son horizon de mariage (sous 6 mois, 6 à 12 mois ou connaissance sérieuse) ainsi que sa pratique. Les échanges sont conçus pour favoriser la transparence et permettre d’impliquer rapidement les familles dès que la compatibilité est confirmée.',
  },
  {
    id: 'reconnaissance-faciale',
    category: 'securite',
    question: 'Comment fonctionne la vérification par reconnaissance faciale et photo ?',
    answer:
      'Avant de recevoir le statut vérifié, le membre capture un selfie en direct comparé à sa photo de profil par notre contrôle biométrique. Ce processus vérifie qu’il s’agit d’une personne réelle et vivante, éliminant les usurpations d’identité. Aucune donnée biométrique brute n’est rendue publique.',
  },
  {
    id: 'contact-payant',
    category: 'nikah',
    question: 'Pourquoi la mise en contact est-elle payante ?',
    answer:
      'La mise en contact payante (à l’unité dès 2 500 FCFA ou via le Pass Nikah) constitue un filtre efficace contre les comptes opportunistes, le harcèlement et le démarchage en masse. Elle assure à chaque membre que toute personne qui engage la conversation le fait avec un réel engagement.',
  },
  {
    id: 'confidentialite-e2ee-gps',
    category: 'securite',
    question: 'Mes messages privés et ma position géographique sont-ils vraiment confidentiels ?',
    answer:
      'Oui. La messagerie utilise un chiffrement de bout en bout réel (ECDH P-256 et AES-GCM 256 bits) exécuté directement sur votre appareil : personne d’autre que vous et votre interlocuteur ne peut lire les messages. Pour la géolocalisation, un floutage automatique décale votre position publique d’environ 1,3 km afin de ne jamais révéler votre adresse exacte.',
  },
  {
    id: 'notation-confiance',
    category: 'nikah',
    question: 'À quoi sert le système de notation entre membres ?',
    answer:
      'Après un échange, les membres peuvent évaluer le respect, la courtoisie et la sincérité de leur interlocuteur sur 5. Cette notation transparente valorise les profils irréprochables et renforce la sérénité de toute la communauté.',
  },
  {
    id: 'partage-facebook-whatsapp',
    category: 'securite',
    question: 'Comment fonctionnent les affiches Facebook et l’assistance WhatsApp directe ?',
    answer:
      `Depuis l’onglet « Affiches » ou depuis chaque fiche membre, vous pouvez publier directement une affiche de présentation sur Facebook ou contacter le service de mise en relation directe via WhatsApp au ${WHATSAPP_DISPLAY_NUMBER} pour accompagner vos échanges.`,
  },
];

interface FaqSectionProps {
  onGoToVerification: () => void;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ onGoToVerification }) => {
  const [category, setCategory] = useState<FaqCategory>('toutes');
  const [openId, setOpenId] = useState<string | null>('nikah-serieux');

  const visibleItems =
    category === 'toutes'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === category);

  return (
    <section
      aria-labelledby="faq-heading"
      className="pt-10 border-t border-[var(--border-hairline)] space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Transparence, pudeur et protection des membres
          </p>
          <h2 id="faq-heading" className="font-display text-3xl font-semibold text-[var(--ink)]">
            Questions Fréquentes
          </h2>
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            Tout comprendre sur notre cadre dédié au mariage musulman, la vérification biométrique
            et la protection de vos échanges privés.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filtrer les questions fréquentes"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-muted)] self-start md:self-auto"
        >
          {(
            [
              { id: 'toutes', label: 'Toutes' },
              { id: 'nikah', label: 'Démarche Nikah' },
              { id: 'securite', label: 'Sécurité & Données' },
            ] as { id: FaqCategory; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                category === tab.id
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm font-semibold'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl divide-y divide-[var(--border-hairline)]">
        {visibleItems.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${item.id}`}
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-[var(--surface-muted)]/50 transition-colors cursor-pointer"
              >
                <span className="text-sm sm:text-base font-medium text-[var(--ink)]">
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[var(--ink-muted)] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[var(--accent)]' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div
                  id={`faq-panel-${item.id}`}
                  className="px-6 pb-5 pt-1 text-sm text-[var(--ink-muted)] leading-relaxed max-w-4xl"
                >
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <p className="text-xs text-[var(--ink-muted)]">
          Vous démarrez votre inscription ? Commencez par certifier votre profil ou contactez notre
          ligne directe.
        </p>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onGoToVerification}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Vérifier mon visage
          </button>
          <a
            href={buildWhatsAppDirectUrl(
              'Assalamou alaykoum, j’ai une question concernant la démarche sur Le Chemin pour le Nikah.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] bg-[var(--surface)] hover:border-[var(--accent)] transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
            WhatsApp {WHATSAPP_DISPLAY_NUMBER}
          </a>
        </div>
      </div>
    </section>
  );
};
