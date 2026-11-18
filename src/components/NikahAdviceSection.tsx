import React, { useState } from 'react';
import { ArrowRight, BookOpen, X } from 'lucide-react';

type AdviceCategory = 'tous' | 'communication' | 'valeurs' | 'spiritualite';

interface AdviceArticle {
  id: string;
  index: string;
  category: Exclude<AdviceCategory, 'tous'>;
  categoryLabel: string;
  readTime: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
  questionsToAsk: string[];
}

const ARTICLES: AdviceArticle[] = [
  {
    id: 'communication-claire',
    index: '01.',
    category: 'communication',
    categoryLabel: 'Communication',
    readTime: '3 min de lecture',
    title: 'Dialogue sincère et cadre respectueux dès les premiers échanges',
    excerpt:
      'Poser des questions essentielles avec douceur, écoute active et pudeur pour éviter les malentendus et avancer sereinement.',
    paragraphs: [
      'La réussite d’un engagement en vue du Nikah repose avant tout sur la clarté des intentions. Dès les premiers messages chiffrés, privilégiez des échanges posés qui abordent les attentes concrètes de la vie quotidienne : rythme de vie, place des familles, gestion du foyer et projets professionnels.',
      'Une communication saine consiste à écouter sans interrompre ni juger. Exprimer ses limites et ses priorités avec bienveillance permet à chacun de mesurer la compatibilité réelle avant d’impliquer les familles ou d’organiser une rencontre encadrée.',
    ],
    questionsToAsk: [
      'Comment envisagez-vous la résolution d’un désaccord au sein du foyer ?',
      'Quel équilibre souhaitez-vous entre vie professionnelle, vie familiale et temps personnel ?',
      'À quel moment souhaitez-vous impliquer nos familles respectives dans la démarche ?',
    ],
  },
  {
    id: 'valeurs-communes',
    index: '02.',
    category: 'valeurs',
    categoryLabel: 'Valeurs communes',
    readTime: '4 min de lecture',
    title: 'Bâtir sur des valeurs partagées et une vision familiale unie',
    excerpt:
      'Harmoniser la vision de l’éducation, de la solidarité familiale et des responsabilités mutuelles pour fonder un foyer stable.',
    paragraphs: [
      'Au-delà des affinités initiales, la pérennité du mariage s’appuie sur un socle moral partagé : l’honnêteté, la patience, la pudeur et le respect des engagements. Vérifier l’alignement sur ces principes fondamentaux protège le couple des tensions durables.',
      'Prenez le temps d’aborder la vision éducative, l’accueil des proches, la gestion transparente des finances et l’entraide dans les épreuves. Un accord clair sur ces piliers transforme l’enthousiasme du début en confiance durable.',
    ],
    questionsToAsk: [
      'Quelles valeurs souhaitez-vous transmettre en priorité à vos enfants ?',
      'Comment concevez-vous la solidarité et la gestion financière du foyer ?',
      'Quelle place occupent les parents et la famille élargie dans votre quotidien ?',
    ],
  },
  {
    id: 'preparation-spirituelle',
    index: '03.',
    category: 'spiritualite',
    categoryLabel: 'Préparation spirituelle',
    readTime: '3 min de lecture',
    title: 'Purifier l’intention et cultiver la sérénité intérieure avant le Nikah',
    excerpt:
      'Faire du mariage un acte de foi, de responsabilité et de miséricorde en s’appuyant sur la prière de consultation et l’humilité.',
    paragraphs: [
      'Le Nikah est un pacte solennel qui appelle à la sincérité du cœur (Niyyah) et au sens des responsabilités. Avant de s’engager, il est précieux de réfléchir à sa propre maturité émotionnelle, à sa patience et à sa capacité à être un refuge de paix pour l’autre.',
      'Multipliez les invocations, pratiquez la prière de consultation (Istikhara) à chaque étape importante et recherchez des conseils avisés auprès de personnes de confiance. La sérénité intérieure attire des échanges authentiques et apaisés.',
    ],
    questionsToAsk: [
      'Quelle place occupe la pratique spirituelle quotidienne dans l’ambiance de votre foyer ?',
      'Comment souhaitez-vous vous soutenir mutuellement dans votre progression religieuse ?',
      'Qu’est-ce qui, selon vous, nourrit la miséricorde et la paix (Sakina) dans un couple ?',
    ],
  },
];

export const NikahAdviceSection: React.FC = () => {
  const [filter, setFilter] = useState<AdviceCategory>('tous');
  const [activeArticle, setActiveArticle] = useState<AdviceArticle | null>(null);

  const visibleArticles =
    filter === 'tous' ? ARTICLES : ARTICLES.filter((a) => a.category === filter);

  return (
    <section
      aria-labelledby="advice-heading"
      className="pt-10 border-t border-[var(--border-hairline)] space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Repères pratiques et accompagnement
          </p>
          <h2 id="advice-heading" className="font-display text-3xl font-semibold text-[var(--ink)]">
            Conseils pour réussir son Nikah
          </h2>
          <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
            Des guides courts pour préparer votre démarche avec discernement, aligner vos valeurs
            et aborder chaque rencontre avec sérénité.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filtrer les articles de conseils"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-muted)] self-start md:self-auto overflow-x-auto max-w-full"
        >
          {(
            [
              { id: 'tous', label: 'Tous' },
              { id: 'communication', label: 'Communication' },
              { id: 'valeurs', label: 'Valeurs' },
              { id: 'spiritualite', label: 'Spiritualité' },
            ] as { id: AdviceCategory; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm font-semibold'
                  : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleArticles.map((article) => (
          <article
            key={article.id}
            className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-6 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                <span className="font-mono tabular-nums text-[var(--accent)] font-medium">
                  {article.index}
                </span>
                <span>{article.categoryLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{article.readTime}</span>
              </div>

              <h3 className="font-display text-2xl font-semibold text-[var(--ink)] leading-snug">
                {article.title}
              </h3>

              <p className="text-sm text-[var(--ink-muted)] leading-relaxed">{article.excerpt}</p>
            </div>

            <div className="pt-4 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => setActiveArticle(article)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Lire l’article et les questions clés</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Article Reader Modal */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                  <span className="font-mono tabular-nums text-[var(--accent)] font-medium">
                    {activeArticle.index}
                  </span>
                  <span>{activeArticle.categoryLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{activeArticle.readTime}</span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[var(--ink)] leading-tight">
                  {activeArticle.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                aria-label="Fermer l’article"
                className="p-2 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-[var(--ink)] leading-relaxed">
              {activeArticle.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-3">
              <h4 className="text-xs font-semibold text-[var(--accent)] tracking-wide">
                Questions essentielles à aborder ensemble
              </h4>
              <ul className="space-y-2 text-sm text-[var(--ink-muted)] list-disc pl-5">
                {activeArticle.questionsToAsk.map((q, idx) => (
                  <li key={idx}>{q}</li>
                ))}
              </ul>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                Fermer la lecture
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
