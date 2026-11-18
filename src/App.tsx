import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  BellRing,
  CheckCircle2,
  Lock,
  MapPin,
  MessageCircle,
  Moon,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Sun,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  testConnection,
} from './firebase';
import {
  AccentTone,
  DarkPalette,
  EncryptedMessage,
  FilterState,
  Gender,
  MemberReview,
  NikahTimeline,
  OnlineUserPresence,
  PaymentMethod,
  PracticeLevel,
  PrivateUserData,
  PublicProfile,
  UnlockPlan,
} from './types';
import {
  buildFacebookShareUrl,
  buildWhatsAppDirectUrl,
  TIMELINE_LABELS,
  WHATSAPP_DISPLAY_NUMBER,
} from './data/communityProfiles';
import {
  decryptMessage,
  deriveSharedAesKey,
  encryptMessage,
  getOrCreateUserKeyPair,
  StoredKeyPair,
} from './lib/crypto';
import { calculateDistanceKm, formatDistanceLabel, fuzzCoordinates } from './lib/geo';
import { AppSection, Header } from './components/Header';
import { ProximityRadar } from './components/ProximityRadar';
import { FaceVerificationPanel } from './components/FaceVerificationPanel';
import { PaidContactModal } from './components/PaidContactModal';
import { EncryptedChat, makeConvId } from './components/EncryptedChat';
import { MemberProfileModal } from './components/MemberProfileModal';
import { PosterShareStudio } from './components/PosterShareStudio';
import { ThemeAndProfileDrawer } from './components/ThemeAndProfileDrawer';
import { FaqSection } from './components/FaqSection';
import { NikahAdviceSection } from './components/NikahAdviceSection';

const HERO_IMAGE = '/src/assets/images/hero_nikah_sanctuary_1795020698519.jpg';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('decouvrir');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Customizable Light / Dark Mode & Accent
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('nikah_dark_mode');
    return saved ? saved === 'true' : false;
  });
  const [darkPalette, setDarkPalette] = useState<DarkPalette>(() => {
    return (localStorage.getItem('nikah_dark_palette') as DarkPalette) || 'emerald_night';
  });
  const [accentTone, setAccentTone] = useState<AccentTone>(() => {
    return (localStorage.getItem('nikah_accent_tone') as AccentTone) || 'emerald';
  });

  // Push Notification & Toast
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Geolocation
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
    fuzzedLat: number;
    fuzzedLng: number;
    cityLabel: string;
  } | null>(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Firestore synced state
  const [firestoreProfiles, setFirestoreProfiles] = useState<PublicProfile[]>([]);
  const [privateData, setPrivateData] = useState<PrivateUserData | null>(null);
  const [unlockedTargetIds, setUnlockedTargetIds] = useState<Set<string>>(new Set());
  const [firestoreReviews, setFirestoreReviews] = useState<MemberReview[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, EncryptedMessage[]>>({});

  // E2EE keypair & WebSocket
  const [keyPair, setKeyPair] = useState<StoredKeyPair | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserPresence[]>([]);
  const [typingFromUid, setTypingFromUid] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI Modal states
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [unlockModalProfile, setUnlockModalProfile] = useState<PublicProfile | null>(null);
  const [activePartnerUid, setActivePartnerUid] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    gender: 'tous',
    ageMin: 18,
    ageMax: 60,
    maxDistanceKm: 10000,
    nikahTimeline: 'tous',
    verifiedOnly: false,
    minRating: 0,
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 5000);
  }, []);

  // Sync theme classes on documentElement
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.setAttribute('data-dark-palette', darkPalette);
    root.setAttribute('data-accent', accentTone);
    localStorage.setItem('nikah_dark_mode', String(darkMode));
    localStorage.setItem('nikah_dark_palette', darkPalette);
    localStorage.setItem('nikah_accent_tone', accentTone);
  }, [darkMode, darkPalette, accentTone]);

  // Firestore connectivity check + Auth listener
  useEffect(() => {
    testConnection();
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        try {
          const kp = await getOrCreateUserKeyPair(firebaseUser.uid);
          setKeyPair(kp);

          const profRef = doc(db, 'profiles', firebaseUser.uid);
          const profSnap = await getDoc(profRef);
          if (!profSnap.exists()) {
            const fuzzed = fuzzCoordinates(13.5116, 2.1254, firebaseUser.uid);
            await setDoc(profRef, {
              uid: firebaseUser.uid,
              displayName: (firebaseUser.displayName || 'Membre Nikah').slice(0, 60),
              age: 27,
              gender: 'homme',
              city: 'Niamey',
              country: 'Niger',
              latApprox: fuzzed.latApprox,
              lngApprox: fuzzed.lngApprox,
              profession: 'Membre vérifié',
              practiceLevel: 'pratiquant',
              nikahTimeline: '6_12_mois',
              bio: 'Démarche sérieuse et respectueuse en vue du Nikah.',
              photoUrl: firebaseUser.photoURL || '',
              faceVerified: false,
              photoVerified: false,
              ecdhX: kp.publicJwk.x || '',
              ecdhY: kp.publicJwk.y || '',
              sharePrivacy: 'membres',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          const privRef = doc(db, 'users_private', firebaseUser.uid);
          const privSnap = await getDoc(privRef);
          if (!privSnap.exists()) {
            await setDoc(privRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || 'membre@nikah.app',
              pushEnabled: Notification?.permission === 'granted',
              darkMode,
              darkPalette,
              accentTone,
              passActive: false,
              passPlan: 'none',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.error('Bootstrap profile warning:', err);
        }
      } else {
        setKeyPair(null);
        setPrivateData(null);
        setUnlockedTargetIds(new Set());
        setMessagesByConv({});
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time listeners (strictly gated on authReady && user)
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubProfiles = onSnapshot(
      collection(db, 'profiles'),
      (snap) => {
        const list: PublicProfile[] = snap.docs.map((d) => d.data() as PublicProfile);
        setFirestoreProfiles(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'profiles')
    );

    const unsubPrivate = onSnapshot(
      doc(db, 'users_private', user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as PrivateUserData;
          setPrivateData(data);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users_private/${user.uid}`)
    );

    const unsubUnlocks = onSnapshot(
      query(collection(db, 'unlocks'), where('payerUid', '==', user.uid)),
      (snap) => {
        const nextSet = new Set<string>();
        snap.docs.forEach((d) => {
          const u = d.data() as { targetUid: string };
          if (u.targetUid) nextSet.add(u.targetUid);
        });
        setUnlockedTargetIds(nextSet);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'unlocks')
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as MemberReview) }));
        setFirestoreReviews(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
    );

    return () => {
      unsubProfiles();
      unsubPrivate();
      unsubUnlocks();
      unsubReviews();
    };
  }, [authReady, user]);

  // Real authenticated Firestore member profiles only (zero fake profiles)
  const allProfiles = firestoreProfiles;

  const myProfile = useMemo(() => {
    if (!user) return null;
    return allProfiles.find((p) => p.uid === user.uid) ?? null;
  }, [allProfiles, user]);

  // Subscribe to encrypted messages for active conversation
  useEffect(() => {
    if (!authReady || !user || !keyPair) return;
    const otherProfiles = allProfiles.filter((p) => p.uid !== user.uid);
    const partner =
      otherProfiles.find((p) => p.uid === activePartnerUid) ?? otherProfiles[0] ?? null;
    if (!partner) return;

    const convId = makeConvId(user.uid, partner.uid);
    const msgQuery = query(
      collection(db, 'conversations', convId, 'messages'),
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(
      msgQuery,
      async (snap) => {
        const aesKey = await deriveSharedAesKey(
          keyPair.privateJwk,
          partner.ecdhX,
          partner.ecdhY,
          convId
        );
        const decrypted: EncryptedMessage[] = await Promise.all(
          snap.docs.map(async (d) => {
            const raw = d.data() as Omit<EncryptedMessage, 'id'>;
            const plaintext = await decryptMessage(aesKey, raw.ciphertext, raw.iv);
            return {
              id: d.id,
              ...raw,
              plaintext,
            };
          })
        );
        setMessagesByConv((prev) => ({ ...prev, [convId]: decrypted }));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `conversations/${convId}/messages`)
    );

    return () => unsub();
  }, [authReady, user, keyPair, activePartnerUid, allProfiles]);

  // WebSocket real-time presence & notifications
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      if (user) {
        ws.send(
          JSON.stringify({
            type: 'presence:join',
            uid: user.uid,
            displayName: myProfile?.displayName || user.displayName || 'Membre',
            city: myProfile?.city || 'Niamey',
            latApprox: userCoords?.fuzzedLat ?? myProfile?.latApprox,
            lngApprox: userCoords?.fuzzedLng ?? myProfile?.lngApprox,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'presence:list') {
          setOnlineUsers(data.users || []);
        } else if (data.type === 'chat:typing') {
          setTypingFromUid(data.isTyping ? data.senderUid : null);
        } else if (data.type === 'chat:notify') {
          setUnreadCount((c) => c + 1);
          const alertText = `Nouveau message chiffré de ${data.senderName || 'un membre'}`;
          showToast(alertText);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('Le Chemin pour le Nikah', {
              body: alertText,
            });
          }
        }
      } catch {
        // Ignore malformed frame
      }
    };

    ws.onclose = () => setWsConnected(false);

    return () => {
      ws.close();
    };
  }, [user, myProfile?.displayName, myProfile?.city, showToast]);

  // Real reviews aggregation per profile (zero fake reviews)
  function getRatingStats(profile: PublicProfile): { avg: number; count: number; list: MemberReview[] } {
    const list = firestoreReviews.filter((r) => r.targetUid === profile.uid);
    if (list.length === 0) {
      return {
        avg: 0,
        count: 0,
        list: [],
      };
    }
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    return {
      avg: sum / list.length,
      count: list.length,
      list,
    };
  }

  // Geolocation handler
  const handleRequestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n’est pas prise en charge par votre navigateur.');
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const fuzzed = fuzzCoordinates(lat, lng, user?.uid || 'guest');
        setUserCoords({
          lat,
          lng,
          fuzzedLat: fuzzed.latApprox,
          fuzzedLng: fuzzed.lngApprox,
          cityLabel: `${fuzzed.latApprox.toFixed(2)}, ${fuzzed.lngApprox.toFixed(2)}`,
        });

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'geo:update',
              latApprox: fuzzed.latApprox,
              lngApprox: fuzzed.lngApprox,
            })
          );
        }

        if (user) {
          try {
            await setDoc(
              doc(db, 'profiles', user.uid),
              {
                latApprox: fuzzed.latApprox,
                lngApprox: fuzzed.lngApprox,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
            await setDoc(
              doc(db, 'users_private', user.uid),
              {
                exactLat: lat,
                exactLng: lng,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch {
            // Optional persistence if user profile already exists
          }
        }
        showToast('Position locale actualisée avec floutage de confidentialité (±1,3 km).');
      },
      () => {
        setGeoError(
          'Accès GPS refusé. Le radar utilise votre ville de référence en attendant votre autorisation.'
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, [user, showToast]);

  const handleToggleLiveTracking = useCallback(() => {
    if (liveTracking) {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setLiveTracking(false);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError('Géolocalisation en temps réel indisponible.');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fuzzed = fuzzCoordinates(
          pos.coords.latitude,
          pos.coords.longitude,
          user?.uid || 'guest'
        );
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          fuzzedLat: fuzzed.latApprox,
          fuzzedLng: fuzzed.lngApprox,
          cityLabel: `${fuzzed.latApprox.toFixed(2)}, ${fuzzed.lngApprox.toFixed(2)}`,
        });
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'geo:update',
              latApprox: fuzzed.latApprox,
              lngApprox: fuzzed.lngApprox,
            })
          );
        }
      },
      () => {
        setLiveTracking(false);
        setGeoError('Impossible de maintenir le suivi GPS en temps réel.');
      }
    );
    watchIdRef.current = id;
    setLiveTracking(true);
    showToast('Suivi géographique en temps réel activé.');
  }, [liveTracking, user, showToast]);

  // Push notifications
  const handleEnablePush = useCallback(async () => {
    if (typeof Notification === 'undefined') {
      setPushPermission('unsupported');
      return;
    }
    const perm = await Notification.requestPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      new Notification('Le Chemin pour le Nikah', {
        body: 'Les notifications push sont activées pour vos échanges cryptés.',
      });
      if (user) {
        await setDoc(
          doc(db, 'users_private', user.uid),
          { pushEnabled: true, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
      showToast('Notifications push activées.');
    }
  }, [user, showToast]);

  // Auth actions
  async function handleLoginGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Connexion sécurisée réussie.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Connexion annulée.');
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setDrawerOpen(false);
    showToast('Session fermée.');
  }

  // Save theme preference
  async function handleChangeTheme(opts: {
    darkMode?: boolean;
    darkPalette?: DarkPalette;
    accentTone?: AccentTone;
  }) {
    const nextDark = opts.darkMode ?? darkMode;
    const nextPal = opts.darkPalette ?? darkPalette;
    const nextAccent = opts.accentTone ?? accentTone;
    setDarkMode(nextDark);
    setDarkPalette(nextPal);
    setAccentTone(nextAccent);

    if (user) {
      try {
        await setDoc(
          doc(db, 'users_private', user.uid),
          {
            darkMode: nextDark,
            darkPalette: nextPal,
            accentTone: nextAccent,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Ignore if private doc still bootstrapping
      }
    }
  }

  // Save profile
  async function handleSaveProfile(data: {
    displayName: string;
    age: number;
    gender: Gender;
    city: string;
    country: string;
    profession: string;
    practiceLevel: PracticeLevel;
    nikahTimeline: NikahTimeline;
    bio: string;
    sharePrivacy: 'membres' | 'verifies_uniquement';
  }) {
    if (!user) return;
    const profRef = doc(db, 'profiles', user.uid);
    try {
      await setDoc(
        profRef,
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast('Votre profil matrimonial a été mis à jour.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
    }
  }

  // Verification callback
  async function handleVerificationSuccess(res: {
    selfieDataUrl: string;
    score: number;
    summaryFr: string;
  }) {
    if (!user) return;
    const profRef = doc(db, 'profiles', user.uid);
    try {
      await setDoc(
        profRef,
        {
          photoUrl: res.selfieDataUrl.slice(0, 115000),
          faceVerified: true,
          photoVerified: true,
          verificationScore: res.score,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      showToast('Vérification faciale certifiée et enregistrée sur votre profil.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${user.uid}`);
    }
  }

  // Paid Contact Unlock
  async function handleConfirmPayment(params: {
    targetUid: string;
    plan: UnlockPlan;
    amountFcfa: number;
    paymentMethod: PaymentMethod;
    reference: string;
  }) {
    if (!user) {
      await handleLoginGoogle();
      return;
    }
    const unlockId = `${user.uid}_${params.targetUid}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'unlocks', unlockId), {
        payerUid: user.uid,
        targetUid: params.targetUid,
        plan: params.plan,
        amountFcfa: params.amountFcfa,
        paymentMethod: params.paymentMethod,
        reference: params.reference,
        status: 'paid',
        createdAt: serverTimestamp(),
      });

      if (params.plan === 'pass_mensuel' || params.plan === 'pass_serenite') {
        await setDoc(
          doc(db, 'users_private', user.uid),
          {
            passActive: true,
            passPlan: params.plan,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setUnlockedTargetIds((prev) => new Set(prev).add(params.targetUid));
      setUnlockModalProfile(null);
      setActivePartnerUid(params.targetUid);
      setActiveSection('messagerie');
      showToast('Mise en contact débloquée. Canal chiffré ouvert.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `unlocks/${unlockId}`);
    }
  }

  // Send Encrypted Message
  async function handleSendMessage(partner: PublicProfile, plaintext: string) {
    if (!user || !keyPair) return;
    const convId = makeConvId(user.uid, partner.uid);
    const convRef = doc(db, 'conversations', convId);

    try {
      const convSnap = await getDoc(convRef);
      const participants = [user.uid, partner.uid].sort();
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          participantA: participants[0],
          participantB: participants[1],
          participants,
          lastEncryptedHint: 'Message chiffré E2EE',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(
          convRef,
          {
            lastEncryptedHint: 'Message chiffré E2EE',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      const aesKey = await deriveSharedAesKey(
        keyPair.privateJwk,
        partner.ecdhX,
        partner.ecdhY,
        convId
      );
      const { ciphertext, iv } = await encryptMessage(aesKey, plaintext);

      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        senderUid: user.uid,
        recipientUid: partner.uid,
        participants,
        ciphertext,
        iv,
        senderKeyX: keyPair.publicJwk.x || '',
        senderKeyY: keyPair.publicJwk.y || '',
        e2eeAlg: 'ECDH-P256-AES-GCM-256',
        createdAt: serverTimestamp(),
      });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'chat:notify',
            senderUid: user.uid,
            senderName: myProfile?.displayName || user.displayName || 'Membre',
            recipientUid: partner.uid,
            convId,
          })
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `conversations/${convId}/messages`);
    }
  }

  // Submit community review
  async function handleSubmitReview(params: {
    targetUid: string;
    rating: number;
    sincerityScore: number;
    respectScore: number;
    comment: string;
  }) {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        authorUid: user.uid,
        authorName: (myProfile?.displayName || user.displayName || 'Membre').slice(0, 60),
        targetUid: params.targetUid,
        rating: params.rating,
        sincerityScore: params.sincerityScore,
        respectScore: params.respectScore,
        comment: params.comment,
        createdAt: serverTimestamp(),
      });
      showToast('Votre notation a été publiée.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'reviews');
    }
  }

  // Filtered discovery profiles
  const originLat = userCoords?.fuzzedLat ?? 13.5116;
  const originLng = userCoords?.fuzzedLng ?? 2.1254;

  const filteredProfiles = useMemo(() => {
    return allProfiles
      .filter((p) => !user || p.uid !== user.uid)
      .map((p) => {
        const dist = calculateDistanceKm(originLat, originLng, p.latApprox, p.lngApprox);
        const stats = getRatingStats(p);
        return { profile: p, distanceKm: dist, ratingStats: stats };
      })
      .filter(({ profile, distanceKm, ratingStats }) => {
        if (filters.gender !== 'tous' && profile.gender !== filters.gender) return false;
        if (profile.age < filters.ageMin || profile.age > filters.ageMax) return false;
        if (distanceKm > filters.maxDistanceKm) return false;
        if (filters.nikahTimeline !== 'tous' && profile.nikahTimeline !== filters.nikahTimeline)
          return false;
        if (filters.verifiedOnly && !profile.faceVerified) return false;
        if (filters.minRating > 0 && (ratingStats.count === 0 || ratingStats.avg < filters.minRating))
          return false;
        if (filters.search.trim()) {
          const q = filters.search.trim().toLowerCase();
          const match =
            profile.displayName.toLowerCase().includes(q) ||
            profile.city.toLowerCase().includes(q) ||
            profile.country.toLowerCase().includes(q) ||
            profile.profession.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      });
  }, [allProfiles, user, originLat, originLng, filters, firestoreReviews]);

  const hasGlobalPass = Boolean(privateData?.passActive);

  function openContactFlow(profile: PublicProfile) {
    if (!user) {
      setDrawerOpen(true);
      return;
    }
    const unlocked = hasGlobalPass || unlockedTargetIds.has(profile.uid);
    if (unlocked) {
      setSelectedProfile(null);
      setActivePartnerUid(profile.uid);
      setActiveSection('messagerie');
    } else {
      setSelectedProfile(null);
      setUnlockModalProfile(profile);
    }
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <Header
        activeSection={activeSection}
        onNavigate={(sec) => {
          setActiveSection(sec);
          if (sec === 'messagerie') setUnreadCount(0);
        }}
        user={user}
        onOpenAccountOrLogin={() => setDrawerOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-[var(--surface)] border border-[var(--accent)] rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-xs sm:text-sm text-[var(--ink)]"
        >
          <BellRing className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-14">
        {/* Workspace Quick Controls Bar (Theme + Push + GPS + WhatsApp) */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--border-hairline)]">
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--ink-muted)]">
            <button
              type="button"
              onClick={() => handleChangeTheme({ darkMode: !darkMode })}
              className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {darkMode ? 'Mode clair' : 'Mode sombre'}
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleRequestLocation}
              className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--accent)]" />
              {userCoords ? `GPS : ${userCoords.cityLabel}` : 'Activer la proximité GPS'}
            </button>
            <span aria-hidden="true">·</span>
            {pushPermission !== 'granted' && pushPermission !== 'unsupported' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 text-[var(--accent)]" />
                Activer alertes push
              </button>
            ) : (
              <span>Alertes push actives</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a
              href={buildFacebookShareUrl(
                'Découvrez Le Chemin pour le Nikah : rencontres sérieuses vérifiées par reconnaissance faciale et messagerie cryptée.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5 text-[var(--accent)]" />
              Partager sur Facebook
            </a>
            <a
              href={buildWhatsAppDirectUrl(
                'Assalamou alaykoum, je souhaite échanger via Le Chemin pour le Nikah.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
              WhatsApp {WHATSAPP_DISPLAY_NUMBER}
            </a>
          </div>
        </div>

        {/* Section Routing */}
        {activeSection === 'decouvrir' && (
          <div className="space-y-14">
            {/* Editorial Split Hero */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-6 py-2">
                <p className="text-xs font-medium tracking-wide text-[var(--accent)]">
                  Plateforme matrimoniale vérifiée · Confidentialité intégrale
                </p>
                <h1
                  className="font-display font-semibold tracking-tight text-[var(--ink)] leading-[1.08]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.6rem)',
                    textWrap: 'balance',
                  }}
                >
                  Des rencontres sérieuses et vérifiées pour bâtir votre Nikah
                </h1>
                <p className="text-base text-[var(--ink-muted)] leading-relaxed max-w-xl">
                  Un espace digne, protégé par reconnaissance faciale, géolocalisation discrète et
                  messagerie chiffrée de bout en bout. La mise en contact encadrée préserve chaque
                  membre du spam et des profils factices.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveSection('verification')}
                    className="px-5 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Vérifier mon visage
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSection('proximite')}
                    className="px-5 py-3 rounded-lg text-sm font-medium border border-[var(--border-hairline)] text-[var(--ink)] bg-[var(--surface)] hover:border-[var(--accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Voir les profils à proximité
                  </button>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--surface-muted)]">
                  <img
                    src={HERO_IMAGE}
                    alt="Salon serein Le Chemin pour le Nikah"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </section>

            {/* 4-Column Trust Pillars Strip */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 pb-4 border-y border-[var(--border-hairline)]">
              <div className="space-y-1.5 py-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  01. Reconnaissance faciale stricte
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Validation biométrique par selfie en direct et contrôle photo anti-usurpation.
                </p>
              </div>
              <div className="space-y-1.5 py-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  02. Messagerie cryptée E2EE
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Clés ECDH P-256 et chiffrement AES-GCM 256 bits assurant le secret des discussions.
                </p>
              </div>
              <div className="space-y-1.5 py-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  03. Mise en contact anti-spam
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  L’ouverture du contact est payante afin de garantir l’authenticité de chaque démarche.
                </p>
              </div>
              <div className="space-y-1.5 py-2">
                <h3 className="text-sm font-semibold text-[var(--ink)]">
                  04. Notation communautaire
                </h3>
                <p className="text-xs text-[var(--ink-muted)] leading-relaxed">
                  Évaluations de respect et de sincérité renforçant la confiance entre les membres.
                </p>
              </div>
            </section>

            {/* Advanced Search & Filters */}
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-3xl font-semibold text-[var(--ink)]">
                    Membres à découvrir ({filteredProfiles.length})
                  </h2>
                  <p className="text-xs text-[var(--ink-muted)] mt-1">
                    Affinez votre recherche par distance, tranche d’âge, pratique et niveau de
                    vérification.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--accent)] transition-colors self-start sm:self-auto cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
                  {filtersOpen ? 'Masquer les filtres' : 'Filtres avancés'}
                </button>
              </div>

              {filtersOpen && (
                <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-xs">
                    <div className="lg:col-span-2 relative">
                      <Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                        placeholder="Ville, prénom ou profession…"
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
                      />
                    </div>

                    <select
                      aria-label="Filtrer par profil"
                      value={filters.gender}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, gender: e.target.value as 'tous' | Gender }))
                      }
                      className="px-3 py-2.5 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                    >
                      <option value="tous">Frères &amp; Sœurs</option>
                      <option value="femme">Sœurs uniquement</option>
                      <option value="homme">Frères uniquement</option>
                    </select>

                    <select
                      aria-label="Filtrer par distance"
                      value={filters.maxDistanceKm}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, maxDistanceKm: Number(e.target.value) }))
                      }
                      className="px-3 py-2.5 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                    >
                      <option value={10000}>Toutes distances</option>
                      <option value={10}>Moins de 10 km</option>
                      <option value={50}>Moins de 50 km</option>
                      <option value={500}>Moins de 500 km</option>
                    </select>

                    <select
                      aria-label="Filtrer par horizon du Nikah"
                      value={filters.nikahTimeline}
                      onChange={(e) =>
                        setFilters((f) => ({
                          ...f,
                          nikahTimeline: e.target.value as 'tous' | NikahTimeline,
                        }))
                      }
                      className="px-3 py-2.5 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                    >
                      <option value="tous">Tout horizon Nikah</option>
                      <option value="immediat">Sous 6 mois</option>
                      <option value="6_12_mois">6 à 12 mois</option>
                      <option value="connaissance_serieuse">Connaissance sérieuse</option>
                    </select>

                    <select
                      aria-label="Filtrer par note minimale"
                      value={filters.minRating}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, minRating: Number(e.target.value) }))
                      }
                      className="px-3 py-2.5 rounded-lg bg-[var(--canvas)] border border-[var(--border-hairline)] text-[var(--ink)]"
                    >
                      <option value={0}>Toutes notes</option>
                      <option value={4.5}>Note 4,5+ / 5</option>
                      <option value={4.8}>Note 4,8+ / 5</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[var(--border-hairline)] text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--ink-muted)]">Âge :</span>
                      <input
                        type="number"
                        min={18}
                        max={80}
                        value={filters.ageMin}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, ageMin: Number(e.target.value) || 18 }))
                        }
                        className="w-16 px-2 py-1 rounded bg-[var(--canvas)] border border-[var(--border-hairline)] font-mono tabular-nums text-[var(--ink)]"
                      />
                      <span className="text-[var(--ink-muted)]">à</span>
                      <input
                        type="number"
                        min={18}
                        max={99}
                        value={filters.ageMax}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, ageMax: Number(e.target.value) || 60 }))
                        }
                        className="w-16 px-2 py-1 rounded bg-[var(--canvas)] border border-[var(--border-hairline)] font-mono tabular-nums text-[var(--ink)]"
                      />
                      <span className="text-[var(--ink-muted)]">ans</span>
                    </div>

                    <label className="inline-flex items-center gap-2 cursor-pointer text-[var(--ink)]">
                      <input
                        type="checkbox"
                        checked={filters.verifiedOnly}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, verifiedOnly: e.target.checked }))
                        }
                        className="accent-[var(--accent)] w-4 h-4"
                      />
                      <span>Profils vérifiés par reconnaissance faciale uniquement</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Profile Grid */}
              {filteredProfiles.length === 0 ? (
                <div className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl p-10 text-center space-y-4">
                  {!user ? (
                    <>
                      <p className="text-sm text-[var(--ink)] font-medium">
                        Aucun faux profil affiché — accès réservé aux membres réels authentifiés.
                      </p>
                      <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto">
                        Connectez-vous avec Google et validez votre identité par reconnaissance
                        faciale pour consulter les profils réels inscrits sur la plateforme.
                      </p>
                      <button
                        type="button"
                        onClick={handleLoginGoogle}
                        className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] cursor-pointer"
                      >
                        Se connecter avec Google
                      </button>
                    </>
                  ) : allProfiles.filter((p) => p.uid !== user.uid).length === 0 ? (
                    <>
                      <p className="text-sm text-[var(--ink)] font-medium">
                        Aucun autre membre inscrit pour le moment.
                      </p>
                      <p className="text-xs text-[var(--ink-muted)] max-w-md mx-auto">
                        Votre profil réel est enregistré. Partagez l’affiche officielle sur Facebook
                        ou WhatsApp pour inviter des célibataires sérieux à rejoindre la communauté.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveSection('partage')}
                          className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] cursor-pointer"
                        >
                          Créer une affiche de partage
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSection('verification')}
                          className="px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:border-[var(--accent)] cursor-pointer"
                        >
                          Vérifier mon visage
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--ink-muted)]">
                        Aucun profil réel ne correspond à vos critères actuels.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            search: '',
                            gender: 'tous',
                            ageMin: 18,
                            ageMax: 60,
                            maxDistanceKm: 10000,
                            nikahTimeline: 'tous',
                            verifiedOnly: false,
                            minRating: 0,
                          })
                        }
                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] cursor-pointer"
                      >
                        Réinitialiser les filtres
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredProfiles.map(({ profile, distanceKm, ratingStats }) => {
                    const isUnlocked =
                      Boolean(user) && (hasGlobalPass || unlockedTargetIds.has(profile.uid));
                    const shareQuote = `Profil vérifié sur Le Chemin pour le Nikah : ${profile.displayName}, ${profile.age} ans à ${profile.city}.`;

                    return (
                      <article
                        key={profile.uid}
                        className="bg-[var(--surface)] border border-[var(--border-hairline)] rounded-xl overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div
                            onClick={() => setSelectedProfile(profile)}
                            className="aspect-[3/4] w-full bg-[var(--surface-muted)] relative overflow-hidden cursor-pointer group"
                          >
                            {profile.photoUrl ? (
                              <img
                                src={profile.photoUrl}
                                alt={`${profile.displayName}, ${profile.city}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-6 text-center text-xs text-[var(--ink-muted)]">
                                Portrait en attente de validation
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none" />
                            <div className="absolute bottom-3 left-4 right-4 text-white">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="font-display text-2xl font-semibold leading-tight">
                                  {profile.displayName}, {profile.age}
                                </h3>
                                {profile.faceVerified && (
                                  <CheckCircle2
                                    aria-label="Visage vérifié"
                                    className="w-4 h-4 text-emerald-300 shrink-0"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-white/85 mt-0.5 truncate">
                                {profile.city} · {formatDistanceLabel(distanceKm)}
                              </p>
                            </div>
                          </div>

                          <div className="p-4 space-y-2.5">
                            <div className="flex items-center justify-between gap-2 text-xs text-[var(--ink-muted)]">
                              <span className="truncate">{profile.profession}</span>
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[var(--ink)] shrink-0">
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                {ratingStats.count > 0 ? ratingStats.avg.toFixed(1) : '—'}
                              </span>
                            </div>

                            <p className="text-xs text-[var(--ink-muted)] leading-relaxed line-clamp-2">
                              {profile.bio}
                            </p>

                            <p className="text-[11px] text-[var(--accent)] font-medium">
                              {TIMELINE_LABELS[profile.nikahTimeline]}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => openContactFlow(profile)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {isUnlocked ? (
                              <ShieldCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            {isUnlocked ? 'Message E2EE' : 'Contacter'}
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedProfile(profile)}
                            className="px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border-hairline)] text-[var(--ink)] hover:border-[var(--accent)] transition-colors whitespace-nowrap cursor-pointer"
                          >
                            Profil
                          </button>

                          <a
                            href={buildFacebookShareUrl(shareQuote)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Partager l’affiche sur Facebook"
                            aria-label="Partager sur Facebook"
                            className="p-2 rounded-lg border border-[var(--border-hairline)] text-[var(--ink-muted)] hover:text-[#1877F2] transition-colors"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <NikahAdviceSection />

            <FaqSection onGoToVerification={() => setActiveSection('verification')} />
          </div>
        )}

        {activeSection === 'proximite' && (
          <ProximityRadar
            profiles={allProfiles.filter((p) => !user || p.uid !== user.uid)}
            userCoords={userCoords}
            liveTracking={liveTracking}
            geoError={geoError}
            onRequestLocation={handleRequestLocation}
            onToggleLiveTracking={handleToggleLiveTracking}
            onlineUsers={onlineUsers}
            onSelectProfile={(p) => setSelectedProfile(p)}
            wsConnected={wsConnected}
          />
        )}

        {activeSection === 'messagerie' && (
          <EncryptedChat
            user={user}
            profiles={allProfiles}
            unlockedTargetIds={unlockedTargetIds}
            hasGlobalPass={hasGlobalPass}
            activePartnerUid={activePartnerUid}
            onSelectPartner={(uid) => setActivePartnerUid(uid)}
            messagesByConv={messagesByConv}
            onSendMessage={handleSendMessage}
            onUnlockRequest={(partner) => setUnlockModalProfile(partner)}
            onTyping={(partnerUid, isTyping) => {
              if (wsRef.current?.readyState === WebSocket.OPEN && user) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'chat:typing',
                    senderUid: user.uid,
                    recipientUid: partnerUid,
                    isTyping,
                  })
                );
              }
            }}
            typingFromUid={typingFromUid}
            myFingerprint={keyPair?.fingerprint ?? ''}
            pushPermission={pushPermission}
            onEnablePush={handleEnablePush}
            onRequireLogin={() => setDrawerOpen(true)}
          />
        )}

        {activeSection === 'verification' && (
          <FaceVerificationPanel
            user={user}
            currentPhotoUrl={myProfile?.photoUrl}
            isAlreadyVerified={Boolean(myProfile?.faceVerified)}
            onVerificationSuccess={handleVerificationSuccess}
            onRequireLogin={() => setDrawerOpen(true)}
          />
        )}

        {activeSection === 'partage' && (
          <PosterShareStudio profiles={allProfiles} myProfile={myProfile} />
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-[var(--border-hairline)] bg-[var(--surface)]/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[var(--ink-muted)]">
          <div className="space-y-1">
            <p className="font-display text-lg font-semibold text-[var(--ink)]">
              Le Chemin pour le Nikah
            </p>
            <p>
              Rencontres sérieuses · Vérification faciale · Messagerie cryptée · Confidentialité
              garantie
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href={buildFacebookShareUrl(
                'Rejoignez Le Chemin pour le Nikah, la plateforme de rencontres sérieuses et vérifiées.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--ink)] transition-colors"
            >
              Affiche Facebook
            </a>
            <a
              href={buildWhatsAppDirectUrl(
                'Assalamou alaykoum, je souhaite obtenir des informations sur Le Chemin pour le Nikah.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--ink)] transition-colors"
            >
              WhatsApp direct : {WHATSAPP_DISPLAY_NUMBER}
            </a>
          </div>
        </div>
      </footer>

      {/* Modals & Drawers */}
      <MemberProfileModal
        profile={selectedProfile}
        distanceKm={
          selectedProfile
            ? calculateDistanceKm(
                originLat,
                originLng,
                selectedProfile.latApprox,
                selectedProfile.lngApprox
              )
            : null
        }
        reviews={selectedProfile ? getRatingStats(selectedProfile).list : []}
        avgRating={selectedProfile ? getRatingStats(selectedProfile).avg : 5}
        reviewCount={selectedProfile ? getRatingStats(selectedProfile).count : 0}
        isUnlocked={
          Boolean(user && selectedProfile) &&
          (hasGlobalPass || unlockedTargetIds.has(selectedProfile!.uid))
        }
        user={user}
        onClose={() => setSelectedProfile(null)}
        onContactOrUnlock={openContactFlow}
        onSubmitReview={handleSubmitReview}
        onRequireLogin={() => {
          setSelectedProfile(null);
          setDrawerOpen(true);
        }}
      />

      <PaidContactModal
        profile={unlockModalProfile}
        onClose={() => setUnlockModalProfile(null)}
        onConfirmPayment={handleConfirmPayment}
      />

      <ThemeAndProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        myProfile={myProfile}
        darkMode={darkMode}
        darkPalette={darkPalette}
        accentTone={accentTone}
        onChangeTheme={handleChangeTheme}
        pushPermission={pushPermission}
        onEnablePush={handleEnablePush}
        onLoginGoogle={handleLoginGoogle}
        onLogout={handleLogout}
        onSaveProfile={handleSaveProfile}
      />
    </div>
  );
}
