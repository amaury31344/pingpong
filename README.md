# Ping Points

Prototype indépendant de la FFTT. Ouvrir `index.html` via un serveur local, par exemple `python3 -m http.server 4173`, puis aller sur http://localhost:4173.

- Le profil, les matchs et le répertoire personnel sont conservés dans le stockage local du navigateur. Une copie privée peut aussi être envoyée à Supabase après connexion, puis restaurée manuellement sur un autre appareil. Un annuaire séparé permet de rechercher les profils que les joueurs ont explicitement choisi de partager ; il ne s'agit pas d'un annuaire FFTT.
- La bio facultative et la photo de profil sont privées : elles ne sont pas publiées dans l'annuaire. La photo choisie (JPEG, PNG ou WebP, 5 Mo maximum) est recadrée au centre et réduite à 256 pixels sur l'appareil. Elles sont incluses dans les exports JSON et les copies Supabase manuelles.
- Saisir le total en début de saison, puis chaque match de compétition avec les **points de référence de la période** des deux joueurs et le coefficient applicable. Le total est indicatif, pas un classement fédéral. La dérive entre phases, les bonus, forfaits et corrections exceptionnelles ne sont pas calculés. Les matchs amicaux ne changent pas les points.
- Le calcul des rencontres ordinaires suit le tableau IV.205.1 des [règlements généraux FFTT 2026–2027](https://www.fftt.com/wp-content/uploads/2026/07/reglement_generaux_2026_2027.pdf). Les exemples officiels sont testés par `node --test ranking.test.js`.
- Les anciens matchs du prototype v1 sont récupérés dans la nouvelle interface avec leur variation saisie, sans modifier les données originales. Saisir le point de départ approprié et vérifier les anciennes données pour éviter de compter deux fois une variation.
- N'enregistrer les coordonnées d'un autre joueur qu'avec son accord. La recherche ne fournit pas de distance ou de géolocalisation.

## Utilisation sur mobile

L'interface est adaptée aux petits écrans et dispose d'un manifeste d'application web (PWA). Sur un site déployé en **HTTPS**, ouvrir l'adresse sur le téléphone, puis choisir « Ajouter à l'écran d'accueil » dans le menu du navigateur (sur iPhone : Partager, puis « Sur l'écran d'accueil »). Les menus et la disponibilité de l'installation varient selon le navigateur et sa version. Ce prototype n'est pas une application native publiée sur les stores.

La rubrique « Partager et installer » permet de partager ou copier uniquement l'adresse publique du site, sans données personnelles. Elle propose les étapes pour iPhone et Android ainsi qu'un bouton d'installation lorsque le navigateur le permet. Si la copie automatique échoue, l'adresse reste sélectionnable manuellement.

`localhost` et `127.0.0.1` désignent l'appareil en cours : l'adresse affichée sur l'ordinateur n'est pas directement celle du téléphone. Un déploiement HTTPS accessible depuis le téléphone est nécessaire pour tester l'installation et le mode hors ligne sur celui-ci. Après une première visite complète en ligne, le service worker met en cache les fichiers de l'application ; la connexion et les copies en ligne nécessitent le réseau. Les données locales restent propres à chaque navigateur ou installation et peuvent être exportées puis restaurées depuis le profil. Ne pas partager le fichier de sauvegarde publiquement : il contient potentiellement des données personnelles.

## Compte et sauvegarde en ligne

Depuis **Mon profil**, un joueur adulte peut demander un lien de connexion par e-mail, puis envoyer une copie de ses données ou la restaurer sur un autre appareil. Ces opérations sont **manuelles** : les nouvelles modifications ne sont pas envoyées automatiquement. Chaque remplacement est confirmé, les copies invalides sont refusées et une version protège contre l'écrasement d'une copie modifiée simultanément. Exporter aussi régulièrement une sauvegarde JSON personnelle : cette fonctionnalité n'est pas une garantie de récupération.

Les données locales restent sur l'appareil après déconnexion : ne pas utiliser cette fonction sur un appareil partagé sans comprendre cette limite. La clé `sb_publishable_...` dans `cloud.js` est prévue pour le navigateur ; elle ne remplace pas les règles d'accès. Le schéma `supabase-schema.sql` active RLS, limite la lecture à l'utilisateur et contrôle les écritures avec `auth.uid()` ; aucune clé secrète Supabase ne doit être placée dans le site. `supabase-security.test.sql` teste l'isolation dans une transaction annulée.

Les liens de connexion reviennent sur `https://ping-points.vercel.app/`, configuré comme URL du site dans Supabase. L'envoi d'e-mails Supabase par défaut peut être limité aux adresses autorisées et ne convient pas à un lancement public sans configuration SMTP adaptée. Avant toute ouverture au public, prévoir notamment une politique de confidentialité, l'exercice des droits et la suppression du compte, la validation de la cible adulte, la surveillance et une revue de sécurité.

## Recherche de joueurs

Les comptes connectés peuvent rechercher par nom ou pseudonyme les profils explicitement publiés par des joueurs. Le pilote reste réservé aux adultes sur déclaration ; cette case ne vérifie pas l'âge. Chaque personne choisit son nom public et peut partager un club, des points estimés, son bilan et les dates, types et résultats de ses dix derniers matchs, sans nom d'adversaire. Ces derniers éléments peuvent néanmoins permettre d'identifier une rencontre. Les valeurs sont déclarées, non vérifiées et ne proviennent pas de la FFTT. La recherche affiche 30 résultats au maximum.

La publication et son retrait sont manuels ; les nouvelles données ne sont pas publiées automatiquement. Un numéro de version empêche une publication obsolète de rétablir un profil retiré simultanément. Un retrait efface les données partagées et empêche de nouvelles recherches, mais ne peut pas effacer les copies déjà réalisées ; une entrée technique sans contenu est conservée pour gérer les conflits. Les coordonnées, licences et notes privées ne sont pas transférées dans l'annuaire. Les sauvegardes restent privées. `supabase-directory.sql` crée une table sans accès direct pour les clients et quatre fonctions réservées aux comptes connectés ; `supabase-directory-security.test.sql` contient des vérifications transactionnelles à exécuter avec des comptes synthétiques. Cette recherche ne constitue pas encore une mise en relation, une modération ou une recherche exhaustive des licenciés.

## Suivi et jeu

Un objectif personnel peut inclure une cible de points estimés et une échéance, sans garantie de progression. Les matchs peuvent être corrigés ou supprimés ; les variations des matchs officiels sont recalculées, tandis que les anciennes saisies conservent leur variation manuelle. Le score, les notes et les points forts ou axes de travail sont facultatifs et privés sur cet appareil.

Le carnet de matériel conserve les changements de raquette ou de revêtement et les notes associées. Les changements situés entre les dates des matchs comptabilisés apparaissent comme repères approximatifs sur la courbe, sans établir de causalité ; les autres restent visibles dans le carnet. Ces données font partie des sauvegardes JSON et des copies Supabase manuelles.

La carte souvenir est créée et téléchargée sur l'appareil après choix de la période et des informations à afficher. Le nom, la licence, les contacts et les adversaires ne sont pas inclus automatiquement ; le souvenir saisi reste libre et visible sur l'image. Le bilan compte les matchs enregistrés dans la période, y compris les amicaux, mais la variation estimée ne comprend que les compétitions et anciennes saisies.

Les filtres par date, type et résultat montrent la taille de l'échantillon et comparent les références historiques quand elles sont disponibles ; les références manquantes sont comptées séparément. L'import d'une sauvegarde JSON est validé et présente les données actuelles et importées avant un remplacement intégral à confirmer. Il inclut les records de jeu ; une erreur, une annulation ou un conflit de modification ne remplace pas les données.

Ping Arcade est un jeu autonome, sans effet sur les points ou matchs. La balle et l'ordinateur s'adaptent aux réglages ; les commandes sont choisies avant la partie et les records sont séparés par version de règles, difficulté, commande et mode découverte. La page en arrière-plan et le changement de section mettent le jeu en pause. Le son est désactivé par défaut. Ce mode arcade ne mesure pas le niveau sportif et ne prétend pas être accessible à toutes les personnes malvoyantes. Le nom Ping Arcade est provisoire et sa disponibilité n'a pas été vérifiée.

Pour reconstruire le client Supabase : `npm ci && npm run build:cloud`. Les tests locaux se lancent avec `npm test`. Le quiz, les défis en ligne et l'organisation de séances partagées sont hors du prototype actuel.
