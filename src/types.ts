export type Gender = 'homme' | 'femme';
export type PracticeLevel = 'pratiquant' | 'regulier' | 'en_apprentissage';
export type NikahTimeline = 'immediat' | '6_12_mois' | 'connaissance_serieuse';
export type DarkPalette = 'emerald_night' | 'obsidian_gold' | 'midnight_slate';
export type AccentTone = 'emerald' | 'gold' | 'sapphire';
export type UnlockPlan = 'contact_unique' | 'pass_mensuel' | 'pass_serenite';
export type PaymentMethod = 'Wave' | 'Orange Money' | 'Moov Money' | 'Carte Bancaire';

export interface PublicProfile {
  uid: string;
  displayName: string;
  age: number;
  gender: Gender;
  city: string;
  country: string;
  latApprox: number;
  lngApprox: number;
  profession: string;
  education?: string;
  practiceLevel: PracticeLevel;
  nikahTimeline: NikahTimeline;
  bio: string;
  photoUrl?: string;
  faceVerified: boolean;
  photoVerified: boolean;
  verificationScore?: number;
  ecdhX?: string;
  ecdhY?: string;
  sharePrivacy: 'membres' | 'verifies_uniquement';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PrivateUserData {
  uid: string;
  email: string;
  exactLat?: number;
  exactLng?: number;
  pushEnabled: boolean;
  darkMode: boolean;
  darkPalette: DarkPalette;
  accentTone: AccentTone;
  passActive: boolean;
  passPlan: 'none' | 'pass_mensuel' | 'pass_serenite';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ContactUnlock {
  id?: string;
  payerUid: string;
  targetUid: string;
  plan: UnlockPlan;
  amountFcfa: number;
  paymentMethod: PaymentMethod;
  reference: string;
  status: 'paid';
  createdAt?: unknown;
}

export interface EncryptedMessage {
  id: string;
  senderUid: string;
  recipientUid: string;
  participants: string[];
  ciphertext: string;
  iv: string;
  senderKeyX?: string;
  senderKeyY?: string;
  e2eeAlg: 'ECDH-P256-AES-GCM-256';
  createdAt?: unknown;
  plaintext?: string;
}

export interface MemberReview {
  id?: string;
  authorUid: string;
  authorName: string;
  targetUid: string;
  rating: number;
  sincerityScore: number;
  respectScore: number;
  comment: string;
  createdAt?: unknown;
}

export interface FilterState {
  search: string;
  gender: 'tous' | Gender;
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  nikahTimeline: 'tous' | NikahTimeline;
  verifiedOnly: boolean;
  minRating: number;
}

export interface OnlineUserPresence {
  uid: string;
  displayName: string;
  city: string;
  latApprox?: number;
  lngApprox?: number;
  lastSeen: number;
}
