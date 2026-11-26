# Ping Points

Prototype indépendant de la FFTT, utilisable sur un seul navigateur. Ouvrir `index.html` via un serveur local, par exemple `python3 -m http.server 4173`, puis aller sur http://localhost:4173.

- Le profil, les matchs et le répertoire personnel sont conservés dans le stockage local du navigateur. Une copie privée peut aussi être envoyée à Supabase après connexion, puis restaurée manuellement sur un autre appareil. Il n'y a pas d'annuaire partagé ni de connexion à la FFTT. Ne pas présenter le répertoire local comme une communauté réelle.
- Saisir le total en début de saison, puis chaque match de compétition avec les **points de référence de la période** des deux joueurs et le coefficient applicable. Le total est indicatif, pas un classement fédéral. La dérive entre phases, les bonus, forfaits et corrections exceptionnelles ne sont pas calculés. Les matchs amicaux ne changent pas les points.
- Le calcul des rencontres ordinaires suit le tableau IV.205.1 des [règlements généraux FFTT 2026–2027](https://www.fftt.com/wp-content/uploads/2026/07/reglement_generaux_2026_2027.pdf). Les exemples officiels sont testés par `node --test ranking.test.js`.
- Les anciens matchs du prototype v1 sont récupérés dans la nouvelle interface avec leur variation saisie, sans modifier les données originales. Saisir le point de départ approprié et vérifier les anciennes données pour éviter de compter deux fois une variation.
- N'enregistrer les coordonnées d'un autre joueur qu'avec son accord. Pour permettre la découverte réelle de joueurs à proximité, il faudra un service partagé avec comptes, consentement, contrôle d'accès, confidentialité et gestion des données personnelles.

## Utilisation sur mobile

L'interface est adaptée aux petits écrans et dispose d'un manifeste d'application web (PWA). Sur un site déployé en **HTTPS**, ouvrir l'adresse sur le téléphone, puis choisir « Ajouter à l'écran d'accueil » dans le menu du navigateur (sur iPhone : Partager, puis « Sur l'écran d'accueil »). Les menus et la disponibilité de l'installation varient selon le navigateur et sa version. Ce prototype n'est pas une application native publiée sur les stores.

`localhost` et `127.0.0.1` désignent l'appareil en cours : l'adresse affichée sur l'ordinateur n'est pas directement celle du téléphone. Un déploiement HTTPS accessible depuis le téléphone est nécessaire pour tester l'installation et le mode hors ligne sur celui-ci. Après une première visite complète en ligne, le service worker met en cache les fichiers de l'application ; la connexion et les copies en ligne nécessitent le réseau. Les données locales restent propres à chaque navigateur ou installation et peuvent être exportées puis restaurées depuis le profil. Ne pas partager le fichier de sauvegarde publiquement : il contient potentiellement des données personnelles.

## Compte et sauvegarde en ligne

Depuis **Mon profil**, un joueur adulte peut demander un lien de connexion par e-mail, puis envoyer une copie de ses données ou la restaurer sur un autre appareil. Ces opérations sont **manuelles** : les nouvelles modifications ne sont pas envoyées automatiquement. Chaque remplacement est confirmé, les copies invalides sont refusées et une version protège contre l'écrasement d'une copie modifiée simultanément. Exporter aussi régulièrement une sauvegarde JSON personnelle : cette fonctionnalité n'est pas une garantie de récupération.

Les données locales restent sur l'appareil après déconnexion : ne pas utiliser cette fonction sur un appareil partagé sans comprendre cette limite. La clé `sb_publishable_...` dans `cloud.js` est prévue pour le navigateur ; elle ne remplace pas les règles d'accès. Le schéma `supabase-schema.sql` active RLS, limite la lecture à l'utilisateur et contrôle les écritures avec `auth.uid()` ; aucune clé secrète Supabase ne doit être placée dans le site. `supabase-security.test.sql` teste l'isolation dans une transaction annulée.

Les liens de connexion reviennent sur `https://ping-points.vercel.app/`, configuré comme URL du site dans Supabase. L'envoi d'e-mails Supabase par défaut peut être limité aux adresses autorisées et ne convient pas à un lancement public sans configuration SMTP adaptée. Avant toute ouverture au public, prévoir notamment une politique de confidentialité, l'exercice des droits et la suppression du compte, la validation de la cible adulte, la surveillance et une revue de sécurité.

## Suivi et jeu

Un objectif personnel peut inclure une cible de points estimés et une échéance, sans garantie de progression. Les matchs peuvent être corrigés ou supprimés ; les variations des matchs officiels sont recalculées, tandis que les anciennes saisies conservent leur variation manuelle. Le score, les notes et les points forts ou axes de travail sont facultatifs et privés sur cet appareil.

Les filtres par date, type et résultat montrent la taille de l'échantillon et comparent les références historiques quand elles sont disponibles ; les références manquantes sont comptées séparément. L'import d'une sauvegarde JSON est validé et présente les données actuelles et importées avant un remplacement intégral à confirmer. Il inclut les records de jeu ; une erreur, une annulation ou un conflit de modification ne remplace pas les données.

Ping Arcade est un jeu autonome, sans effet sur les points ou matchs. La balle et l'ordinateur s'adaptent aux réglages ; les commandes sont choisies avant la partie et les records sont séparés par version de règles, difficulté, commande et mode découverte. La page en arrière-plan et le changement de section mettent le jeu en pause. Le son est désactivé par défaut. Ce mode arcade ne mesure pas le niveau sportif et ne prétend pas être accessible à toutes les personnes malvoyantes. Le nom Ping Arcade est provisoire et sa disponibilité n'a pas été vérifiée.

Pour reconstruire le client Supabase : `npm ci && npm run build:cloud`. Les tests locaux se lancent avec `npm test`. Le quiz, les défis en ligne et la recherche de partenaires partagée sont hors du prototype actuel.
