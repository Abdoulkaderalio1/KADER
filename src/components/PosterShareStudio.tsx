import React, { useState } from 'react';
import { Download, MessageCircle, Share2, ShieldCheck } from 'lucide-react';
import { PublicProfile } from '../types';
import {
  buildFacebookShareUrl,
  buildWhatsAppDirectUrl,
  TIMELINE_LABELS,
  WHATSAPP_DISPLAY_NUMBER,
} from '../data/communityProfiles';

interface PosterShareStudioProps {
  profiles: PublicProfile[];
  myProfile: PublicProfile | null;
}

export const PosterShareStudio: React.FC<PosterShareStudioProps> = ({
  profiles,
  myProfile,
}) => {
  const selectable = myProfile ? [myProfile, ...profiles.filter((p) => p.uid !== myProfile.uid)] : profiles;
  const [selectedUid, setSelectedUid] = useState<string>(selectable[0]?.uid ?? '');
  const [customHeadline, setCustomHeadline] = useState<string>(
    'Une démarche sérieuse, vérifiée et protégée vers le Nikah'
  );
  const [downloading, setDownloading] = useState(false);

  const active = selectable.find((p) => p.uid === selectedUid) ?? selectable[0];

  const shareMessage = active
    ? `${customHeadline} — Profil vérifié sur Le Chemin pour le Nikah : ${active.displayName}, ${active.age} ans, ${active.city} (${active.profession}). Échange sécurisé via WhatsApp ${WHATSAPP_DISPLAY_NUMBER}.`
    : `${customHeadline} — Rejoignez Le Chemin pour le Nikah.`;

  async function downloadPosterPng() {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#0D1714';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle architectural frame
      ctx.strokeStyle = '#C99A3B';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

      // Header text
      ctx.fillStyle = '#F4F1EA';
      ctx.font = '600 48px Georgia, serif';
      ctx.fillText('Le Chemin pour le Nikah', 96, 138);

      ctx.fillStyle = '#C99A3B';
      ctx.font = '500 24px sans-serif';
      ctx.fillText(
        active
          ? 'AFFICHE OFFICIELLE · PROFIL VÉRIFIÉ PAR RECONNAISSANCE FACIALE'
          : 'AFFICHE OFFICIELLE · PLATEFORME MATRIMONIALE SÉCURISÉE',
        96,
        186
      );

      const imageSrc = active?.photoUrl || '/src/assets/images/hero_nikah_sanctuary_1795020698519.jpg';
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const boxX = 96;
          const boxY = 235;
          const boxW = 888;
          const boxH = 620;
          const scale = Math.max(boxW / img.width, boxH / img.height);
          const drawW = img.width * scale;
          const drawH = img.height * scale;
          ctx.save();
          ctx.beginPath();
          ctx.rect(boxX, boxY, boxW, boxH);
          ctx.clip();
          ctx.drawImage(img, boxX + (boxW - drawW) / 2, boxY + (boxH - drawH) / 2, drawW, drawH);
          ctx.restore();
          resolve();
        };
        img.onerror = () => resolve();
        img.src = imageSrc;
      });

      // Details block
      ctx.fillStyle = '#F4F1EA';
      ctx.font = '600 50px Georgia, serif';
      ctx.fillText(
        active ? `${active.displayName}, ${active.age} ans` : 'Rencontres Sérieuses & Vérifiées',
        96,
        935
      );

      ctx.fillStyle = '#A7B5AE';
      ctx.font = '400 28px sans-serif';
      ctx.fillText(
        active
          ? `${active.city}, ${active.country}  ·  ${active.profession}`
          : 'Reconnaissance faciale · Géolocalisation discrète · Messagerie E2EE',
        96,
        986
      );

      ctx.fillStyle = '#E5DFD3';
      ctx.font = '400 26px sans-serif';
      ctx.fillText(
        active ? TIMELINE_LABELS[active.nikahTimeline] : customHeadline.slice(0, 62),
        96,
        1042
      );

      // Footer WhatsApp & Security
      ctx.fillStyle = '#189670';
      ctx.fillRect(96, 1120, 888, 120);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 30px sans-serif';
      ctx.fillText(`Échange direct WhatsApp : ${WHATSAPP_DISPLAY_NUMBER}`, 132, 1172);
      ctx.font = '400 22px sans-serif';
      ctx.fillText('Messagerie cryptée E2EE · Mise en contact sécurisée · Partage Facebook direct', 132, 1212);

      const link = document.createElement('a');
      link.download = active
        ? `affiche-nikah-${active.displayName.toLowerCase().replace(/\s+/g, '-')}.png`
        : 'affiche-le-chemin-pour-le-nikah.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--border-hairline)]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Diffusion sociale et prise de contact directe
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Affiches officielles Facebook &amp; WhatsApp
          </h2>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            Générez une affiche soignée prête à être publiée directement sur Facebook ou transmise
            via WhatsApp au <span className="font-mono">{WHATSAPP_DISPLAY_NUMBER}</span> pour
            faciliter des échanges rapides et encadrés.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Controls */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-6 space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="poster-member" className="block text-xs font-medium text-[var(--ink-muted)]">
              Profil à mettre en affiche
            </label>
            <select
              id="poster-member"
              value={active?.uid ?? ''}
              onChange={(e) => setSelectedUid(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
            >
              {selectable.length === 0 ? (
                <option value="">Affiche d’invitation officielle de la plateforme</option>
              ) : (
                selectable.map((p) => (
                  <option key={p.uid} value={p.uid}>
                    {p.displayName} ({p.age} ans · {p.city})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="poster-headline" className="block text-xs font-medium text-[var(--ink-muted)]">
              Message d’accroche de l’affiche
            </label>
            <textarea
              id="poster-headline"
              rows={3}
              value={customHeadline}
              onChange={(e) => setCustomHeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={buildFacebookShareUrl(shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white bg-[#1877F2] hover:bg-[#1465D0] transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Afficher directement sur Facebook
            </a>

            <a
              href={buildWhatsAppDirectUrl(shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Échanger via WhatsApp ({WHATSAPP_DISPLAY_NUMBER})
            </a>

            <button
              type="button"
              onClick={downloadPosterPng}
              disabled={downloading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Génération PNG…' : 'Télécharger l’affiche (PNG)'}
            </button>
          </div>
        </div>

        {/* Live Poster Preview */}
        <div className="lg:col-span-7 flex justify-center">
          <div className="w-full max-w-lg rounded-xl overflow-hidden bg-[#0D1714] text-[#F4F1EA] border border-[#C99A3B]/50 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="font-display text-2xl font-semibold">Le Chemin pour le Nikah</h3>
                <p className="text-xs text-[#C99A3B] mt-0.5">
                  Affiche officielle · Rencontre sérieuse vérifiée
                </p>
              </div>
              {(!active || active.faceVerified) && (
                <ShieldCheck className="w-6 h-6 text-[#189670] shrink-0" />
              )}
            </div>

            <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-black/30">
              <img
                src={active?.photoUrl || '/src/assets/images/hero_nikah_sanctuary_1795020698519.jpg'}
                alt={active ? active.displayName : 'Le Chemin pour le Nikah'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm text-[#D6D0C4] italic">« {customHeadline} »</p>
              <h4 className="font-display text-3xl font-semibold">
                {active ? `${active.displayName}, ${active.age} ans` : 'Rejoignez des membres réels et vérifiés'}
              </h4>
              <p className="text-xs text-[#A7B5AE]">
                {active
                  ? `${active.city}, ${active.country} · ${active.profession} · ${TIMELINE_LABELS[active.nikahTimeline]}`
                  : 'Vérification faciale biométrique · Messagerie cryptée E2EE · Géolocalisation discrète'}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-[#A7B5AE]">
              <span>WhatsApp direct : {WHATSAPP_DISPLAY_NUMBER}</span>
              <span>Partage Facebook &amp; Messagerie E2EE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
