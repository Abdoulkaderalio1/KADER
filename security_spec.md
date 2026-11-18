# Spécification de Sécurité Firestore — Le Chemin pour le Nikah

## 1. Invariants de Données
1. **Isolation PII** : Les données personnelles sensibles (`email`, `exactLat`, `exactLng`, préférences privées, statut de paiement) sont strictement isolées dans `/users_private/{userId}` et accessibles uniquement au propriétaire (`request.auth.uid == userId`).
2. **Intégrité d'Identité** : Tout document créé dans `/profiles/{userId}`, `/unlocks/{unlockId}`, `/reviews/{reviewId}` ou `/conversations/{convId}/messages/{messageId}` doit correspondre exactement à `request.auth.uid` et exiger `request.auth.token.email_verified == true`.
3. **Confidentialité des Discussions** : Seuls les 2 participants déclarés dans `participants` d'une conversation peuvent lire ou écrire des messages chiffrés dans `/conversations/{convId}/messages`.
4. **Immutabilité & Bornes** : Toutes les chaînes ont une longueur maximale stricte (`size()`), les identifiants suivent `^[a-zA-Z0-9_\-]+$`, et les horodatages `createdAt`/`updatedAt` doivent correspondre à `request.time`.

## 2. Les 12 Payloads Malveillants ("Dirty Dozen")
1. **Usurpation de profil** : Création de `/profiles/otherUid` avec `uid: "otherUid"` par l'utilisateur `attackerUid` -> `PERMISSION_DENIED`.
2. **Champ fantôme (Shadow Field)** : Injection de `isAdmin: true` ou `vipBypass: true` dans `/profiles/{uid}` -> `PERMISSION_DENIED`.
3. **Email non vérifié** : Écriture dans `/profiles/{uid}` avec `email_verified: false` -> `PERMISSION_DENIED`.
4. **Fuite PII** : Lecture `get` sur `/users_private/victimUid` par `attackerUid` -> `PERMISSION_DENIED`.
5. **Poison d'ID** : Création d'un document avec un ID de 200 caractères ou contenant `/` ou `$` -> `PERMISSION_DENIED`.
6. **Falsification de note** : Écriture dans `/reviews/{id}` avec `rating: 99` ou `authorUid: "someoneElse"` -> `PERMISSION_DENIED`.
7. **Auto-notation** : Écriture dans `/reviews/{id}` où `authorUid == targetUid` -> `PERMISSION_DENIED`.
8. **Lecture non autorisée de messages** : Lecture de `/conversations/conv_A_B/messages` par un utilisateur C -> `PERMISSION_DENIED`.
9. **Modification d'un message chiffré** : Tentative d'`update` ou `delete` sur un message existant -> `PERMISSION_DENIED`.
10. **Falsification de paiement** : Création d'un document dans `/unlocks/{id}` avec `payerUid: "victimUid"` -> `PERMISSION_DENIED`.
11. **Modification de `createdAt`** : Mise à jour d'un profil modifiant `createdAt` -> `PERMISSION_DENIED`.
12. **Dépassement de volume (Denial of Wallet)** : Champ `bio` de 10 000 caractères ou `ciphertext` de 20 000 caractères -> `PERMISSION_DENIED`.
