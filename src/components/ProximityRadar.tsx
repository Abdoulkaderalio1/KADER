import React, { useMemo, useState } from 'react';
import { Compass, LocateFixed, Lock, Radio, EyeOff, CheckCircle2 } from 'lucide-react';
import { OnlineUserPresence, PublicProfile } from '../types';
import {
  calculateBearingDeg,
  calculateDistanceKm,
  formatDistanceLabel,
} from '../lib/geo';

interface ProximityRadarProps {
  profiles: PublicProfile[];
  userCoords: { lat: number; lng: number; fuzzedLat: number; fuzzedLng: number; cityLabel: string } | null;
  liveTracking: boolean;
  geoError: string | null;
  onRequestLocation: () => void;
  onToggleLiveTracking: () => void;
  onlineUsers: OnlineUserPresence[];
  onSelectProfile: (profile: PublicProfile) => void;
  wsConnected: boolean;
}

export const ProximityRadar: React.FC<ProximityRadarProps> = ({
  profiles,
  userCoords,
  liveTracking,
  geoError,
  onRequestLocation,
  onToggleLiveTracking,
  onlineUsers,
  onSelectProfile,
  wsConnected,
}) => {
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [hideExactPosition, setHideExactPosition] = useState<boolean>(true);

  const originLat = userCoords?.fuzzedLat ?? 13.5116;
  const originLng = userCoords?.fuzzedLng ?? 2.1254;

  const onlineSet = useMemo(() => new Set(onlineUsers.map((u) => u.uid)), [onlineUsers]);

  const rankedProfiles = useMemo(() => {
    return profiles
      .map((p) => {
        const dist = calculateDistanceKm(originLat, originLng, p.latApprox, p.lngApprox);
        const bearing = calculateBearingDeg(originLat, originLng, p.latApprox, p.lngApprox);
        return { profile: p, distanceKm: dist, bearingDeg: bearing };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [profiles, originLat, originLng]);

  const withinRadius = rankedProfiles.filter((item) => item.distanceKm <= radiusKm);

  return (
    <section className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[var(--border-hairline)]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Géolocalisation locale et confidentialité absolue
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Rencontres authentiques à proximité
          </h2>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            Identifiez les membres vérifiés dans votre zone géographique en temps réel. Votre position
            exacte n’est jamais partagée : un décalage cryptographique de 1,3 km protège votre vie
            privée à tout moment.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onRequestLocation}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LocateFixed className="w-4 h-4" />
            {userCoords ? 'Actualiser ma position' : 'Activer la géolocalisation'}
          </button>
          <button
            type="button"
            onClick={onToggleLiveTracking}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              liveTracking
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]'
                : 'border-[var(--border-hairline)] text-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            <Radio className="w-4 h-4" />
            {liveTracking ? 'Temps réel actif' : 'Suivi temps réel'}
          </button>
        </div>
      </div>

      {geoError && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          {geoError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Interactive Proximity Radar SVG */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--ink)]">Radar de proximité</h3>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                {userCoords
                  ? `Zone active : ${userCoords.cityLabel}`
                  : 'Zone par défaut : Niamey (activez le GPS pour votre ville)'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-[var(--ink-muted)]">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  wsConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
              <span>{wsConnected ? 'En ligne' : 'Local'}</span>
            </div>
          </div>

          <div className="relative aspect-square max-w-[340px] mx-auto">
            <svg viewBox="0 0 320 320" className="w-full h-full">
              <circle
                cx="160"
                cy="160"
                r="140"
                fill="none"
                stroke="currentColor"
                className="text-[var(--border-hairline)]"
                strokeDasharray="4 4"
              />
              <circle
                cx="160"
                cy="160"
                r="95"
                fill="none"
                stroke="currentColor"
                className="text-[var(--border-hairline)]"
              />
              <circle
                cx="160"
                cy="160"
                r="50"
                fill="none"
                stroke="currentColor"
                className="text-[var(--border-hairline)]"
              />
              <line
                x1="160"
                y1="16"
                x2="160"
                y2="304"
                stroke="currentColor"
                className="text-[var(--border-hairline)]"
              />
              <line
                x1="16"
                y1="160"
                x2="304"
                y2="160"
                stroke="currentColor"
                className="text-[var(--border-hairline)]"
              />

              {/* Center user node */}
              <circle cx="160" cy="160" r="7" fill="var(--accent)" />
              <circle
                cx="160"
                cy="160"
                r="16"
                fill="var(--accent)"
                fillOpacity="0.16"
              />

              {/* Nearby member plots */}
              {withinRadius.map(({ profile, distanceKm, bearingDeg }) => {
                const ratio = Math.min(0.92, Math.max(0.18, distanceKm / Math.max(radiusKm, 1)));
                const r = ratio * 135;
                const rad = ((bearingDeg - 90) * Math.PI) / 180;
                const cx = 160 + Math.cos(rad) * r;
                const cy = 160 + Math.sin(rad) * r;
                const isOnline = onlineSet.has(profile.uid);

                return (
                  <g
                    key={profile.uid}
                    onClick={() => onSelectProfile(profile)}
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={cx}
                      cy={cy}
                      r={14}
                      fill="var(--accent)"
                      fillOpacity={isOnline ? 0.25 : 0.1}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill={profile.faceVerified ? 'var(--accent)' : '#8A857B'}
                      stroke="var(--surface)"
                      strokeWidth="2"
                    />
                    <text
                      x={cx}
                      y={cy - 11}
                      textAnchor="middle"
                      className="fill-[var(--ink)] text-[10px] font-medium"
                    >
                      {profile.displayName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Radius selector & privacy control */}
          <div className="space-y-4 pt-4 border-t border-[var(--border-hairline)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--ink-muted)]">Rayon d’exploration</span>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-muted)]">
                {[10, 50, 500, 5000].map((km) => (
                  <button
                    key={km}
                    type="button"
                    onClick={() => setRadiusKm(km)}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono tabular-nums transition-colors cursor-pointer ${
                      radiusKm === km
                        ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-sm'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {km >= 1000 ? 'Global' : `${km} km`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
                {hideExactPosition ? <EyeOff className="w-4 h-4 text-[var(--accent)]" /> : <Lock className="w-4 h-4 text-[var(--accent)]" />}
                <span>Floutage de position (±1,3 km)</span>
              </div>
              <button
                type="button"
                onClick={() => setHideExactPosition((v) => !v)}
                className="text-xs font-medium text-[var(--accent)] hover:underline cursor-pointer"
              >
                {hideExactPosition ? 'Protection active' : 'Activer floutage'}
              </button>
            </div>

            {userCoords && (
              <div className="text-xs font-mono tabular-nums text-[var(--ink-muted)] flex items-center justify-between pt-2 border-t border-[var(--border-hairline)]">
                <span>Coordonnées diffusées :</span>
                <span>
                  {hideExactPosition
                    ? `${userCoords.fuzzedLat.toFixed(3)}, ${userCoords.fuzzedLng.toFixed(3)}`
                    : `${userCoords.lat.toFixed(3)}, ${userCoords.lng.toFixed(3)}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Proximity Ranked Table / List */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border-hairline)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-base font-semibold text-[var(--ink)]">
                Membres détectés par proximité ({withinRadius.length})
              </h3>
            </div>
            <span className="text-xs text-[var(--ink-muted)] font-mono tabular-nums">
              {onlineUsers.length} connecté(s) en direct
            </span>
          </div>

          {withinRadius.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <p className="text-sm text-[var(--ink-muted)]">
                Aucun membre dans un rayon de {radiusKm} km autour de votre zone actuelle.
              </p>
              <button
                type="button"
                onClick={() => setRadiusKm(5000)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                Élargir au réseau complet
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-hairline)]">
              {withinRadius.map(({ profile, distanceKm }) => {
                const isOnline = onlineSet.has(profile.uid);
                return (
                  <div
                    key={profile.uid}
                    className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-[var(--surface-muted)]/60 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={profile.photoUrl}
                        alt={profile.displayName}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-lg object-cover shrink-0 bg-[var(--surface-muted)]"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)] truncate">
                          <span>{profile.displayName}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums font-normal text-[var(--ink-muted)]">
                            {profile.age} ans
                          </span>
                          {profile.faceVerified && (
                            <CheckCircle2 className="w-4 h-4 text-[var(--accent)] shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[var(--ink-muted)] truncate mt-0.5">
                          {profile.city}, {profile.country} · {profile.profession}
                          {isOnline ? ' · En ligne maintenant' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono text-sm tabular-nums font-medium text-[var(--ink)]">
                        {formatDistanceLabel(distanceKm)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectProfile(profile)}
                        className="px-3.5 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Consulter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
