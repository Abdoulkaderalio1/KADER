import { NikahTimeline, PracticeLevel } from '../types';

export const WHATSAPP_DIRECT_NUMBER = '22799614098';
export const WHATSAPP_DISPLAY_NUMBER = '+227 99 61 40 98';

export const PRACTICE_LABELS: Record<PracticeLevel, string> = {
  pratiquant: 'Pratiquant(e) assidu(e)',
  regulier: 'Pratique régulière',
  en_apprentissage: 'En progression spirituelle',
};

export const TIMELINE_LABELS: Record<NikahTimeline, string> = {
  immediat: 'Nikah souhaité sous 6 mois',
  '6_12_mois': 'Nikah d’ici 6 à 12 mois',
  connaissance_serieuse: 'Connaissance sérieuse en vue du Nikah',
};

export function buildFacebookShareUrl(quote: string): string {
  const url = typeof window !== 'undefined' ? window.location.origin : 'https://lecheminpourlenikah.app';
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
}

export function buildWhatsAppDirectUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_DIRECT_NUMBER}?text=${encodeURIComponent(message)}`;
}
