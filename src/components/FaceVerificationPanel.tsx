import React, { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, ShieldCheck, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';

interface VerificationResult {
  isRealHumanFace: boolean;
  livenessScore: number;
  faceMatchScore: number;
  verified: boolean;
  summaryFr: string;
  reasons: string[];
}

interface FaceVerificationPanelProps {
  user: User | null;
  currentPhotoUrl?: string;
  isAlreadyVerified: boolean;
  onVerificationSuccess: (result: {
    selfieDataUrl: string;
    score: number;
    summaryFr: string;
  }) => Promise<void>;
  onRequireLogin: () => void;
}

export const FaceVerificationPanel: React.FC<FaceVerificationPanelProps> = ({
  user,
  currentPhotoUrl,
  isAlreadyVerified,
  onVerificationSuccess,
  onRequireLogin,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(currentPhotoUrl ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 540 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError(
        'Caméra indisponible ou autorisation refusée. Vous pouvez importer un selfie net ci-dessous.'
      );
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  function captureSelfie() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setSelfieDataUrl(dataUrl);
    setResult(null);
    stopCamera();
  }

  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'selfie' | 'profile'
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 640;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.84);
        if (target === 'selfie') {
          setSelfieDataUrl(compressed);
          setResult(null);
        } else {
          setProfilePhotoUrl(compressed);
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function runVerification() {
    if (!user) {
      onRequireLogin();
      return;
    }
    if (!selfieDataUrl) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const res = await fetch('/api/verify-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selfieBase64: selfieDataUrl,
          profilePhotoBase64:
            profilePhotoUrl && profilePhotoUrl.startsWith('data:image/')
              ? profilePhotoUrl
              : undefined,
          displayName: user.displayName || 'Membre',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec de l’analyse biométrique.');
      }
      setResult(data as VerificationResult);
      if (data.verified) {
        await onVerificationSuccess({
          selfieDataUrl: profilePhotoUrl && profilePhotoUrl.startsWith('data:image/') ? profilePhotoUrl : selfieDataUrl,
          score: Math.round((Number(data.livenessScore) + Number(data.faceMatchScore)) / 2),
          summaryFr: data.summaryFr,
        });
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Erreur lors de la vérification.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[var(--border-hairline)]">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
            Sécurité biométrique et lutte contre les faux profils
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[var(--ink)]">
            Vérification stricte par reconnaissance faciale
          </h2>
          <p className="text-sm sm:text-base text-[var(--ink-muted)] leading-relaxed">
            Chaque membre confirme son identité par capture vidéo en direct et validation photo.
            Aucune donnée biométrique brute n’est publiée : seul le statut vérifié apparaît sur votre
            fiche.
          </p>
        </div>

        {isAlreadyVerified && (
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent)] shrink-0">
            <ShieldCheck className="w-5 h-5" />
            <span>Identité faciale certifiée</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Camera & Capture Area */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Étape 1 · Capture du visage en direct
            </h3>
            {selfieDataUrl && (
              <button
                type="button"
                onClick={() => {
                  setSelfieDataUrl(null);
                  setResult(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reprendre
              </button>
            )}
          </div>

          <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[var(--surface-muted)] border border-[var(--border-hairline)] flex items-center justify-center">
            {cameraActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-white/75" />
                </div>
              </>
            ) : selfieDataUrl ? (
              <img
                src={selfieDataUrl}
                alt="Selfie capturé pour vérification"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center px-6 space-y-3">
                <Camera className="w-10 h-10 mx-auto text-[var(--ink-muted)]" />
                <p className="text-sm text-[var(--ink-muted)] max-w-sm">
                  Placez votre visage face à une source de lumière naturelle, sans lunettes de soleil
                  ni filtre.
                </p>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{cameraError}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!cameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                Ouvrir la caméra
              </button>
            ) : (
              <button
                type="button"
                onClick={captureSelfie}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Capturer le selfie
              </button>
            )}

            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-hairline)] text-[var(--ink)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer">
              <Upload className="w-4 h-4" />
              Importer un selfie
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'selfie')}
              />
            </label>
          </div>
        </div>

        {/* Profile Photo Comparison & Verification Verdict */}
        <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-6 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[var(--ink)]">
              Étape 2 · Validation photo &amp; contrôle IA
            </h3>
            <p className="text-xs text-[var(--ink-muted)]">
              Ajoutez votre photo de profil pour vérifier la correspondance biométrique avec votre
              selfie en direct.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-24 rounded-lg overflow-hidden bg-[var(--surface-muted)] border border-[var(--border-hairline)] shrink-0 flex items-center justify-center">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt="Photo de profil à valider"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-[var(--ink-muted)] text-center px-2">Aperçu</span>
              )}
            </div>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:bg-[var(--surface-muted)] transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Choisir photo de profil
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, 'profile')}
                />
              </label>
              <p className="text-xs text-[var(--ink-muted)]">
                Format JPEG/PNG · Stockée de manière sécurisée après validation.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={!selfieDataUrl || submitting}
            onClick={runVerification}
            className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-45 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {submitting ? 'Analyse biométrique en cours…' : 'Lancer la reconnaissance faciale'}
          </button>

          {apiError && (
            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          {result && (
            <div className="pt-4 border-t border-[var(--border-hairline)] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center gap-2 text-sm font-semibold ${
                    result.verified
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {result.verified ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                  {result.verified ? 'Profil vérifié et certifié' : 'Vérification refusée'}
                </span>
                <span className="font-mono text-xs tabular-nums text-[var(--ink-muted)]">
                  Vivacité {Math.round(result.livenessScore)}% · Match{' '}
                  {Math.round(result.faceMatchScore)}%
                </span>
              </div>

              <p className="text-sm text-[var(--ink)] leading-relaxed">{result.summaryFr}</p>

              {result.reasons && result.reasons.length > 0 && (
                <ul className="space-y-1 text-xs text-[var(--ink-muted)] list-disc pl-4">
                  {result.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
