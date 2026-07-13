# Recette MVP Tontine

Date: 2026-07-13
Objectif: valider les parcours critiques après le recentrage "core métier tontine".

## Pré-requis
- Avoir au moins 1 utilisateur de chaque rôle: admin, caissier, commercial.
- Avoir un client de type simple (épargnant), un apprenant et un non-apprenant.
- Avoir au moins une cotisation validée aujourd'hui.

## Scénario 1 — Case 1 bénéfice non comptée en dette
1. Se connecter en commercial.
2. Ouvrir un client avec dossier de financement actif.
3. Enregistrer une cotisation sur la case 1 (jaune, bénéfice société).
4. Vérifier que la dette/remboursement client ne diminue pas avec cette case.
5. Enregistrer une cotisation de type remboursement (case non bénéfice).
6. Vérifier que la dette diminue uniquement sur cette cotisation remboursement.

Résultat attendu:
- Case 1 reste visuellement jaune.
- La dette n'est pas réduite par la case 1.
- La dette est réduite par les montants allocation remboursement.

## Scénario 2 — Recherche Mes clients (commercial)
1. Se connecter en commercial.
2. Aller dans Mes clients.
3. Rechercher par nom puis par numéro.
4. Effacer la recherche.

Résultat attendu:
- Le filtrage répond en temps réel.
- Seuls les clients du commercial connecté apparaissent.

## Scénario 3 — Détail épargnant
1. En commercial, ouvrir le détail d'un client type simple.
2. Vérifier la section spécifique épargnant (solde + historique cotisations).
3. Vérifier l'absence de sections non pertinentes de financement lourd.

Résultat attendu:
- Le panneau met en avant l'épargne/cotisation.
- Les infos affichées sont cohérentes avec l'historique du client.

## Scénario 4 — Total Validé (jour + cumul)
1. En commercial, relever la valeur Total Validé aujourd'hui.
2. Valider une nouvelle cotisation.
3. Vérifier la mise à jour du total du jour et du cumul global.

Résultat attendu:
- Le total du jour augmente du montant validé.
- Le cumul global augmente du même montant.

## Scénario 5 — Caisse MVP tontine (caissier)
1. Se connecter en caissier.
2. Ouvrir Vue d'ensemble puis Caisse.
3. Vérifier les KPI: jour, mois, nombre de cotisations, clients contributeurs.
4. Vérifier le tableau des cotisations récentes.

Résultat attendu:
- La vue caisse est orientée cotisations tontine uniquement.
- Aucune navigation Dépôts/Retraits n'est visible dans le menu caissier.

## Scénario 6 — Suppression admin sans code
1. Se connecter en admin.
2. Ouvrir Gestion des clients.
3. Cliquer suppression sur un client de test.
4. Vérifier l'affichage d'une popup de confirmation (sans saisie de code).
5. Confirmer.

Résultat attendu:
- Suppression exécutée après confirmation explicite.
- Aucun champ code admin demandé pour la suppression.

## Contrôles complémentaires
- Vérifier en caissier les libellés:
  - Colonne clients: Actifs.
  - Types apprenant/non-apprenant: compte courant.
  - Type simple: compte épargne.
- Vérifier la traçabilité dans les logs (création compte, transfert surplus, suppression).
