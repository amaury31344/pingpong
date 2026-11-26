# Ping Points

Prototype indépendant de la FFTT, utilisable sur un seul navigateur. Ouvrir `index.html` via un serveur local, par exemple `python3 -m http.server 4173`, puis aller sur http://localhost:4173.

- Le profil, les matchs et le répertoire personnel sont conservés dans le stockage local du navigateur. Il n'y a pas de compte, de synchronisation entre appareils, d'annuaire partagé ni de connexion à la FFTT. Ne pas publier ce prototype en présentant le répertoire local comme une communauté réelle.
- Saisir le total en début de saison, puis chaque match de compétition avec les **points de référence de la période** des deux joueurs et le coefficient applicable. Le total est indicatif, pas un classement fédéral. La dérive entre phases, les bonus, forfaits et corrections exceptionnelles ne sont pas calculés. Les matchs amicaux ne changent pas les points.
- Le calcul des rencontres ordinaires suit le tableau IV.205.1 des [règlements généraux FFTT 2026–2027](https://www.fftt.com/wp-content/uploads/2026/07/reglement_generaux_2026_2027.pdf). Les exemples officiels sont testés par `node --test ranking.test.js`.
- Les anciens matchs du prototype v1 sont récupérés dans la nouvelle interface avec leur variation saisie, sans modifier les données originales. Saisir le point de départ approprié et vérifier les anciennes données pour éviter de compter deux fois une variation.
- N'enregistrer les coordonnées d'un autre joueur qu'avec son accord. Pour permettre la découverte réelle de joueurs à proximité, il faudra un service partagé avec comptes, consentement, contrôle d'accès, confidentialité et gestion des données personnelles.

## Utilisation sur mobile

L'interface est adaptée aux petits écrans et dispose d'un manifeste d'application web (PWA). Sur un site déployé en **HTTPS**, ouvrir l'adresse sur le téléphone, puis choisir « Ajouter à l'écran d'accueil » dans le menu du navigateur (sur iPhone : Partager, puis « Sur l'écran d'accueil »). Les menus et la disponibilité de l'installation varient selon le navigateur et sa version. Ce prototype n'est pas une application native publiée sur les stores.

`localhost` et `127.0.0.1` désignent l'appareil en cours : l'adresse affichée sur l'ordinateur n'est pas directement celle du téléphone. Un déploiement HTTPS accessible depuis le téléphone est nécessaire pour tester l'installation et le mode hors ligne sur celui-ci. Après une première visite complète en ligne, le service worker met en cache les fichiers de l'application ; aucun compte ni synchronisation entre appareils n'est créé. Les données restent propres à chaque navigateur ou installation et peuvent être exportées puis restaurées depuis le profil. Ne pas partager le fichier de sauvegarde publiquement : il contient potentiellement des données personnelles.

## Suivi et jeu

Un objectif personnel peut inclure une cible de points estimés et une échéance, sans garantie de progression. Les matchs peuvent être corrigés ou supprimés ; les variations des matchs officiels sont recalculées, tandis que les anciennes saisies conservent leur variation manuelle. Le score, les notes et les points forts ou axes de travail sont facultatifs et privés sur cet appareil.

Les filtres par date, type et résultat montrent la taille de l'échantillon et comparent les références historiques quand elles sont disponibles ; les références manquantes sont comptées séparément. L'import d'une sauvegarde JSON est validé et présente les données actuelles et importées avant un remplacement intégral à confirmer. Il inclut les records de jeu ; une erreur, une annulation ou un conflit de modification ne remplace pas les données.

Ping Arcade est un jeu autonome, sans effet sur les points ou matchs. La balle et l'ordinateur s'adaptent aux réglages ; les commandes sont choisies avant la partie et les records sont séparés par version de règles, difficulté, commande et mode découverte. La page en arrière-plan et le changement de section mettent le jeu en pause. Le son est désactivé par défaut. Ce mode arcade ne mesure pas le niveau sportif et ne prétend pas être accessible à toutes les personnes malvoyantes. Le nom Ping Arcade est provisoire et sa disponibilité n'a pas été vérifiée.

Les tests locaux se lancent avec `node --test ranking.test.js backup.test.js sports.test.js arcade-engine.test.js`. Le quiz, les défis en ligne et les comptes sont hors du prototype actuel.
