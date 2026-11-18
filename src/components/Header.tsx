import React from 'react';
import { User } from 'firebase/auth';

export type AppSection = 'decouvrir' | 'proximite' | 'messagerie' | 'verification' | 'partage';

interface HeaderProps {
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
  user: User | null;
  onOpenAccountOrLogin: () => void;
  unreadCount: number;
}

const NAV_ITEMS: { id: AppSection; label: string }[] = [
  { id: 'decouvrir', label: 'Découvrir' },
  { id: 'proximite', label: 'Proximité' },
  { id: 'messagerie', label: 'Messagerie' },
  { id: 'verification', label: 'Vérification' },
  { id: 'partage', label: 'Affiches' },
];

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  onNavigate,
  user,
  onOpenAccountOrLogin,
  unreadCount,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-hairline)] bg-[var(--canvas)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('decouvrir');
          }}
          className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)] whitespace-nowrap shrink-0"
        >
          Le Chemin pour le Nikah
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--ink)] font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {item.label}
                {item.id === 'messagerie' && unreadCount > 0 && (
                  <span className="ml-1.5 font-mono text-xs tabular-nums text-[var(--accent)]">
                    ({unreadCount})
                  </span>
                )}
                <span
                  className={`absolute left-0 right-0 -bottom-0.5 h-0.5 bg-[var(--accent)] transition-opacity ${
                    isActive ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onOpenAccountOrLogin}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {user ? 'Mon Espace' : 'Connexion'}
          </button>
        </div>
      </div>

      {/* Mobile secondary single-row nav */}
      <nav className="md:hidden border-t border-[var(--border-hairline)] px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto text-xs font-medium">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`py-1 px-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'text-[var(--accent)] font-semibold underline underline-offset-4'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              {item.label}
              {item.id === 'messagerie' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
