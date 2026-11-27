# Sauvegarde des travaux locaux non finalises

Instantane du 27 novembre 2026, conserve a la demande de l'utilisateur.

Les fichiers de ce dossier sont des copies de travail, pas une version
deployee ou une migration a appliquer automatiquement. Les fichiers actifs
a la racine restent ceux de la version publiee, notamment l'espace
"Mon club" et son lien vers la carte officielle FFTT.

## Fichiers conserves

| Fichier | Travail local |
| --- | --- |
| `index.html` | Interface de niveau recherche et bouton "Rejouer ensemble" |
| `practice.js` | Niveaux, invitation depuis une discussion, actualisation temps reel |
| `practice.test.js` | Tests locaux associes aux seances et invitations |
| `social.js` | Bouton de nouvelle invitation et abonnement temps reel du chat |
| `supabase-practice-level.sql` | Migration pour les niveaux recherches |
| `supabase-practice-level-security.test.sql` | Scenarios SQL a executer dans une transaction annulee |
| `supabase-realtime.sql` | Proposition de migration des evenements temps reel |

La migration des niveaux avait ete appliquee au cours du travail precedent.
L'etat distant n'a pas ete recontrole lors de cette sauvegarde.
La migration temps reel n'a pas ete validee ni appliquee dans le cadre
de cette sauvegarde.

## Precautions pour reprendre

- Ne pas copier ces fichiers sur la version en production sans verifier
  leurs dependances et leur compatibilite.
- Revalider les migrations SQL dans un environnement adapte avant tout
  changement de la base reelle. Les migrations archivees ne sont pas
  idempotentes.
- Le test SQL de niveau exige une transaction englobante avec `rollback` :
  il cree des identites fictives et ne doit pas etre lance tel quel en
  production.
- Les tests du chat actifs a la racine precedent ces evolutions ; adapter
  les simulations et tester le cycle de vie Realtime lors de la reprise.
- Les tests JavaScript seuls ne valident pas les politiques SQL ni les
  abonnements Supabase reels.

La sauvegarde GitHub n'entraine ni deploiement Vercel ni execution SQL.
Les mots de passe, fichiers d'environnement, donnees des navigateurs et le
projet distinct "Le coin tranquille" ne font pas partie de cette archive.
