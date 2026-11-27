# Ping Points — Concept et business model

Document de cadrage — 26 novembre 2026  
Nom de travail, disponibilité juridique et nom de domaine à vérifier.

## 1. Le projet en une phrase

Une application web pour trouver des partenaires de tennis de table près de chez soi, organiser des rencontres et suivre sa progression sportive au même endroit.

**Promesse : « Trouve avec qui jouer, joue plus souvent et mesure tes progrès. »**

L'ambition est de proposer une alternative indépendante pour certains usages des joueurs, pas de se présenter comme un service officiel de la FFTT.

## 2. Le problème et le positionnement

Trois besoins structurent le produit :

- Trouver un partenaire disponible, proche et de niveau compatible.
- Organiser une séance dans un lieu réellement accessible.
- Comprendre son évolution sans tenir un tableau personnel de résultats.

Ces besoins sont des hypothèses à valider auprès de joueurs et de clubs. Ce document ne constitue pas un audit des fonctionnalités actuelles de l'application FFTT ou de ses autres concurrents.

**La différenciation à tester n'est pas seulement le suivi des points : c'est le passage de « je veux jouer » à une rencontre effectivement organisée.** Les statistiques donnent ensuite une raison de revenir entre deux séances.

## 3. À qui s'adresse l'application ?

| Public | Besoin principal | Rôle dans le lancement |
|---|---|---|
| Adultes licenciés et compétiteurs amateurs | Partenaires de niveau proche, préparation et suivi des résultats | Cible prioritaire |
| Joueurs loisirs et non licenciés | Trouver où jouer et avec qui | Public complémentaire, licence facultative |
| Nouveaux arrivants ou joueurs de passage | Découvrir les joueurs et clubs locaux | Cas d'usage différenciant |
| Clubs et entraîneurs | Animer les créneaux, accueillir de nouveaux joueurs | Partenaires de diffusion, puis clients possibles |

Commencer sur un bassin de vie où plusieurs clubs peuvent participer. Une communauté locale active a davantage de valeur qu'un annuaire national presque vide.

## 4. Le parcours utilisateur

1. Le joueur crée son compte et renseigne son prénom, son nom, sa ville, son club et son niveau. Il peut ajouter son numéro de licence et ses points de départ.
2. Il choisit ce qui est visible : pseudonyme ou prénom, club, niveau et zone approximative. Son numéro de licence reste privé par défaut.
3. Il indique ses disponibilités, son rayon de recherche et son objectif : loisir, entraînement ou préparation à la compétition.
4. Il consulte des profils compatibles et propose une séance dans un club ou un lieu public adapté.
5. Une fois la proposition acceptée, les joueurs confirment l'horaire et les conditions d'accès au lieu.
6. Après la rencontre, le joueur ajoute son résultat et consulte son historique et ses statistiques.

Une proposition de séance ne vaut pas réservation de table : les horaires, tarifs et autorisations d'accès doivent être précisés.

## 5. Les fonctionnalités du produit

### Profil joueur

- Nom, prénom, pseudonyme public et ville.
- Club actuel, facultatif pour les joueurs loisirs.
- Numéro de licence facultatif ; sa saisie seule ne prouve ni l'identité ni la validité de la licence.
- Niveau déclaré, points de référence si disponibles et objectifs.
- Disponibilités et mobilité.
- Style de jeu facultatif : défense, attaque, prise porte-plume, etc.

### Trouver un partenaire et organiser une séance

- Recherche par ville ou zone approximative, sans géolocalisation obligatoire.
- Filtres par distance, niveau, disponibilité et type de séance.
- Proposition structurée : lieu, date, durée et objectif.
- Acceptation ou refus, puis échanges privés entre participants.
- Blocage, signalement et limitation des sollicitations abusives.

### Ajouter ses matchs

- Date, adversaire, résultat, score facultatif et type de rencontre.
- Séparation explicite entre compétition officielle et match amical.
- Pour les calculs : points de référence des deux joueurs pour la période et coefficient applicable.
- Notes personnelles facultatives : service, remise, déplacement, gestion du stress.
- Modification et suppression avec recalcul des statistiques concernées.

La confirmation d'un match amical par l'adversaire peut renforcer la fiabilité de l'historique partagé, mais ne transforme pas le résultat en résultat fédéral.

### Voir sa progression

- Courbe du total de points estimé et historique des variations.
- Victoires, défaites, nombre de rencontres et taux de victoire.
- Résultats face à des adversaires moins bien ou mieux classés.
- Évolution par mois, phase ou saison.
- Comparaison avec un objectif personnel.

Toujours afficher le nombre de matchs analysés : quelques résultats ne suffisent pas à établir une tendance fiable.

## 6. Calcul des points : confiance avant promesse commerciale

**Principe : partir des points de début de saison et appliquer les variations des rencontres admissibles, puis les ajustements réglementaires pertinents.**

Pour chaque rencontre, utiliser les points de référence prévus par le règlement applicable, pas automatiquement le total estimé après le match précédent. La variation dépend notamment du résultat, de l'écart de points et du coefficient de l'épreuve.

Le moteur doit être versionné par saison et gérer explicitement les règles couvertes : barèmes, coefficients, périodes et éventuels ajustements. Les dérives, forfaits, bonus ou corrections exceptionnelles ne doivent pas être considérés comme pris en charge tant qu'ils ne le sont pas réellement.

Trois informations doivent rester distinctes :

| Information | Présentation |
|---|---|
| Points saisis par le joueur | Valeur déclarée, avec date de référence |
| Total calculé par l'application | Estimation, avec périmètre et limites visibles |
| Classement officiel | Affiché comme officiel uniquement depuis une source autorisée et identifiée |

Les matchs amicaux ne modifient pas l'estimation des points officiels. Un indicateur loisir pourrait être proposé plus tard, mais dans un classement séparé et clairement nommé.

Ne pas promettre une synchronisation FFTT avant d'avoir vérifié les possibilités techniques, les droits d'accès, les conditions d'utilisation et les éventuels coûts. Prévoir un fonctionnement utile avec saisie manuelle dès le départ.

## 7. Business model proposé

**Modèle recommandé : un socle gratuit pour développer la communauté, un abonnement joueur pour les analyses avancées et une offre club dans un second temps.**

Les prix ci-dessous sont des hypothèses de test, pas une preuve de volonté de payer.

| Offre | Contenu envisagé | Prix à tester |
|---|---|---|
| Gratuit | Profil, recherche locale, propositions de séance, saisie des matchs, historique et courbe simple | Gratuit |
| Joueur Plus | Analyses détaillées, comparaison de périodes, objectifs personnalisés et exports sportifs avancés | 3,99 € TTC/mois ou 29,99 € TTC/an |
| Club | Page administrable, créneaux ouverts, inscriptions et outils d'animation | 19 à 49 €/mois, HT ou TTC à préciser |
| Services partenaires, plus tard | Réservation de stages ou de cours avec des partenaires | Commission à négocier, seulement si le service est réellement opéré |

La recherche de partenaires et les échanges nécessaires à une séance doivent rester utilisables gratuitement : les bloquer trop tôt réduirait l'intérêt du réseau. L'accès aux droits sur les données personnelles ne dépend jamais d'un abonnement.

### Qui paie, et pour quelle valeur ?

Le joueur paie pour mieux exploiter ses résultats et préparer ses objectifs. Le club paie pour des outils qui lui font gagner du temps ou facilitent son animation, pas simplement pour figurer dans l'annuaire.

La volonté de payer pour des statistiques seules reste incertaine. Tester l'offre avant de construire des tableaux de bord complexes.

### Principaux coûts

Hébergement, base de données, messages et notifications, cartographie éventuelle, paiement, support, modération, maintenance et conformité. Ajouter les coûts éventuels de données sous licence et le temps commercial auprès des clubs.

### Exemple de revenus, pas une prévision

Avec 5 000 utilisateurs actifs mensuels et 4 % d'abonnés payant tous 3,99 € par mois, les 200 abonnés représenteraient **798 € TTC de recettes mensuelles brutes**, avant TVA applicable, frais, coûts et rémunération. Les abonnements annuels diminueraient le revenu mensuel moyen à ce tarif.

Ce scénario illustre qu'une petite communauté payante ne finance pas automatiquement une entreprise. Le seuil de rentabilité devra être calculé à partir des coûts réels et de la marge par abonnement.

Écarter la revente de données personnelles du modèle recommandé. Des partenariats commerciaux éventuels doivent être identifiés et ne pas fausser discrètement les recommandations.

## 8. Idées nouvelles à tester, par ordre de priorité

| Idée | Valeur attendue | Priorité |
|---|---|---|
| « Disponible pour jouer » sur un créneau précis | Trouver un partenaire réellement disponible, pas seulement proche | Forte |
| Séances ouvertes par les clubs | Relier la découverte de joueurs à un lieu accessible | Forte |
| Mode déplacement | Trouver un partenaire pendant un séjour ou déplacement | Après validation locale |
| Objectif de séance partagé | Se mettre d'accord : panier de balles, matchs, service/remise | Après le premier lancement |
| Carnet d'après-match | Transformer un résultat en axe de travail personnel | Après le premier lancement |
| Rappel d'objectif et bilan mensuel | Donner une lecture régulière de la progression | Après validation de la rétention |
| Recherche de partenaires de double | Répondre à un besoin complémentaire | Plus tard |
| Événements et défis amicaux locaux | Renforcer l'animation de la communauté | Plus tard, avec règles et modération |
| Mini-jeu « Ping Arcade » | Jouer des échanges sur une table de ping-pong stylisée, sans modifier les points sportifs | Expérience secondaire après les améliorations essentielles |
| Quiz « Quel choix tactique ? » | Découvrir des situations de jeu avec des explications contextualisées | Plus tard, après relecture du contenu par un entraîneur |

Éviter au lancement le fil social généraliste, le classement national maison, la marketplace complète et le « coach IA » présenté comme expert. Ils élargissent fortement le périmètre sans prouver que les joueurs se rencontrent davantage.

## 9. Première version : le MVP

Le MVP, ou produit minimum viable, doit permettre de vérifier deux choses : **les joueurs organisent-ils des rencontres et reviennent-ils suivre leurs résultats ?**

À inclure : comptes sécurisés, profil avec ville/club/niveau, recherche locale, disponibilités, proposition et confirmation de séance, échanges limités aux participants, saisie des matchs, estimation documentée des points, graphique simple, sauvegarde et récupération des données, blocage et signalement.

À reporter : paiement, offre club complète, import fédéral automatique, réservation de tables, tournois, analyse vidéo et application mobile native.

Une application web adaptée au téléphone suffit pour démarrer. Une version installable de type PWA peut suivre ; les notifications devront être évaluées selon les appareils.

### Situation du prototype présent dans ce dossier

Le README décrit déjà un prototype local nommé Ping Points : profil, matchs et répertoire personnel stockés dans le navigateur, sans comptes ni communauté partagée. Il constitue une base de démonstration, pas encore un service de mise en relation entre utilisateurs.

Le README indique aussi que le calcul actuel reste indicatif et ne couvre pas certains ajustements. Son existence ne dispense pas de vérifier les règles et leurs mises à jour avant une mise en production.

## 10. Stratégie de lancement

1. Interroger une quinzaine de joueurs et quelques responsables de clubs : comment trouvent-ils leurs partenaires aujourd'hui, et qu'est-ce qui les bloque réellement ?
2. Choisir une seule zone et obtenir l'engagement de quelques clubs ou organisateurs locaux.
3. Recruter un premier groupe de joueurs adultes avec des disponibilités réelles, plutôt qu'accumuler des profils incomplets.
4. Accompagner manuellement les premières mises en relation pour identifier les obstacles.
5. Observer les séances réalisées et le retour des utilisateurs pendant plusieurs semaines.
6. Tester ensuite l'intérêt payant pour les analyses ou les outils club avant d'élargir géographiquement.

Canaux possibles : clubs partenaires, affiches avec QR code autorisées dans les salles, tournois locaux avec accord des organisateurs et communautés de joueurs. Ne pas importer de fichiers de licenciés ou envoyer de sollicitations massives sans base légale appropriée.

## 11. Indicateurs de réussite

**Indicateur principal : nombre de séances réalisées et confirmées par les participants, par semaine et par zone.**

À suivre en complément : part des recherches donnant des partenaires pertinents, délai de réponse, taux d'acceptation, annulations, rétention à quatre semaines, joueurs enregistrant plusieurs matchs, signalements et conversion payante.

Les téléchargements, inscriptions et profils créés ne suffisent pas à démontrer l'utilité. Fixer des seuils de décision avant le pilote, adaptés à la densité locale et aux moyens disponibles.

## 12. Risques et garde-fous

| Risque | Réponse prévue |
|---|---|
| Peu de joueurs proches et disponibles | Lancement concentré et créneaux animés avec les clubs |
| Partenaires trouvés une fois, puis départ de l'application | Mesurer le retour réel et l'intérêt du carnet de progression |
| Doublons, erreurs ou matchs manquants | Contrôles de saisie, corrections possibles et limites du calcul visibles |
| Confusion avec un service fédéral | Identité indépendante et distinction entre déclaratif, estimé et officiel |
| Dépendance aux données FFTT | Saisie manuelle utile et vérification des droits avant intégration |
| Harcèlement ou localisation trop précise | Visibilité choisie, zone approximative, échanges contrôlés, blocage et modération |
| Rencontres impliquant des mineurs | Pilote réservé aux adultes ; parcours dédié à concevoir avant toute ouverture aux mineurs |
| Revenus insuffisants | Coûts limités, tests de prix et validation de la valeur pour les clubs |

Prévoir dès le lancement l'information des utilisateurs, la minimisation des données, les bases légales adaptées, les durées de conservation, l'exercice des droits et la suppression du compte. Distinguer les préférences de visibilité des consentements éventuellement nécessaires. Faire valider les sujets juridiques avant ouverture publique.

## 13. Décisions recommandées

Retenir Ping Points comme nom provisoire. Cibler d'abord les joueurs adultes d'un bassin local, licenciés ou non. Garder la licence facultative et privée. Proposer gratuitement la mise en relation et un suivi simple ; réserver les analyses avancées à un futur test payant.

**Priorité : prouver qu'on aide des joueurs à jouer ensemble plus souvent.** Le suivi des points renforce cette promesse, mais ne doit pas masquer les enjeux de disponibilité, de lieux accessibles et de confiance.

La prochaine étape est un pilote local et quelques entretiens, pas le développement de toutes les idées en parallèle.

## 14. Améliorer le site existant

Les éléments ci-dessous sont des propositions à développer, pas des fonctionnalités déjà disponibles.

### Protéger l'historique avant d'ajouter des nouveautés

Le stockage actuel dans le navigateur ne constitue pas une sauvegarde : effacer les données du navigateur ou changer d'appareil peut rendre l'historique inaccessible.

Prévoir un export et un import de sauvegarde contenant le profil, les matchs et le répertoire personnel, avec version de format et contrôle des données importées. Avant toute restauration, montrer ce qui sera ajouté ou remplacé et demander confirmation ; un fichier invalide ne doit pas écraser les données existantes. Signaler que le fichier peut contenir des informations personnelles et doit être conservé en lieu sûr.

À terme, des comptes et une sauvegarde côté serveur permettront la récupération et l'usage sur plusieurs appareils, avec des règles d'accès adaptées.

### Donner un objectif et des enseignements au joueur

| Amélioration | Expérience proposée | Garde-fou |
|---|---|---|
| Objectif personnel | Choisir un total de points estimé ou un nombre de séances à atteindre avant une date | Ne pas garantir une progression sportive |
| Bilan après-match | Noter un point fort et un axe de travail pour la prochaine séance | Notes privées par défaut |
| Lecture des résultats | Filtrer amicaux et compétitions, comparer les périodes et les résultats selon le niveau adverse | Afficher la taille de l'échantillon et les données manquantes |
| Disponibilités | Indiquer un jour, un horaire, une zone et un objectif de séance | Ne présenter des joueurs disponibles que depuis un service partagé réel |
| Tableau de bord orienté action | Mettre en avant « Ajouter un match », l'objectif en cours et la prochaine séance confirmée | Ne pas inventer de rencontres ou d'activité pour remplir l'écran |

Conserver une interface lisible sur téléphone : navigation explicite, boutons faciles à toucher, formulaires courts et graphiques compréhensibles sans dépendre uniquement des couleurs.

## 15. Espace « Défis » et mini-jeu « Ping Arcade »

### Intention

Créer un jeu d'arcade inspiré du principe de Pong : deux raquettes se renvoient une balle, dans un univers original de tennis de table moderne. Cette piste remplace le concept initial de cibles à toucher. Le mini-jeu peut donner une raison supplémentaire de revenir, mais il ne remplace ni les rencontres réelles ni le suivi sportif.

**Promesse : « Une table, deux raquettes : à toi de gagner l'échange. »**

### Direction artistique

Une table bleue ou vert profond, des lignes blanches, un filet central, deux raquettes contrastées et une balle blanche avec une ombre légère. Reprendre le bleu nuit et le vert menthe du site pour garder une identité cohérente.

Privilégier une vue du dessus, avec le joueur en bas et l'adversaire en haut : elle évoque une table de ping-pong tout en gardant les trajectoires lisibles. Un cadre légèrement en relief, des ombres discrètes et une courte traînée de balle facultative apportent du style sans nécessiter un moteur 3D.

Créer des visuels, sons et une interface originaux, sans reprendre les logos, les ressources graphiques ou l'identité d'Atari. « Ping Arcade » reste un nom de travail dont la disponibilité doit être vérifiée.

### Règles proposées pour une première version

1. Le joueur choisit une difficulté et lance une partie contre un adversaire contrôlé par l'ordinateur.
2. Il déplace sa raquette horizontalement avec la souris, en glissant le doigt dans une zone de contrôle sous la table ou avec les flèches du clavier.
3. La balle rebondit sur les raquettes et les bords latéraux. Il s'agit d'une convention arcade, pas d'une simulation fidèle des règles du tennis de table.
4. L'angle du renvoi dépend du point d'impact sur la raquette ; la vitesse augmente progressivement pendant l'échange, avec un plafond pour conserver la jouabilité.
5. Si la balle dépasse une raquette, l'adversaire marque un point. Après un court compte à rebours, un nouvel échange commence.
6. La partie se joue en 11 points, avec deux points d'écart. Elle peut être mise en pause ou quittée à tout moment.
7. L'écran final affiche le résultat, le plus long échange et le nombre de renvois réussis. Le record d'échange est conservé sur l'appareil si le stockage est disponible.

L'adversaire doit avoir une vitesse et un délai de réaction limités pour rester battable. Les niveaux facile, normal et difficile modifient ces paramètres de façon explicite. Versionner les règles et séparer les records par difficulté et mode de contrôle.

### Modes à envisager ensuite

Un mode « Échange infini » permettrait de chercher la plus longue série de renvois sans jouer un match complet. Un mode deux joueurs sur le même clavier pourrait suivre sur ordinateur. Le multijoueur à distance reste hors du premier périmètre : il demande une synchronisation réseau et un traitement de la latence.

### Limites et accessibilité

- Les scores du jeu n'ont aucun effet sur les points estimés FFTT, les statistiques de matchs ou le niveau déclaré.
- Les performances dépendent aussi de l'écran, du périphérique et du navigateur : ce n'est pas une évaluation fiable du niveau au tennis de table.
- Prévoir des contrôles suffisamment grands, un contraste suffisant, aucune séquence clignotante et le respect des préférences de réduction des animations pour les effets décoratifs.
- Rendre les menus et commandes accessibles au clavier, proposer une pause et un mode découverte plus lent. Ne pas présenter ces aménagements comme une accessibilité complète du jeu aux personnes malvoyantes.
- Garder le son facultatif et désactivable ; aucune information indispensable ne doit dépendre uniquement du son ou de la couleur.
- Si la page passe en arrière-plan, mettre automatiquement la partie en pause et attendre une reprise volontaire avec compte à rebours.
- Adapter la table aux petits écrans et placer la commande tactile hors de la zone de jeu pour éviter de cacher la balle avec le doigt.
- En cas d'échec de sauvegarde, afficher le résultat de la partie et prévenir que le record n'a pas été enregistré.

### Évolution sociale, seulement après les comptes

Commencer par le record personnel. Ensuite, tester le partage volontaire d'un résultat et les défis entre amis. Un résultat partagé depuis le navigateur reste déclaratif ; un classement compétitif demanderait une validation côté serveur et des protections contre la manipulation des scores.

Pas de classement national au lancement, de lots financiers, de notifications insistantes ou de pénalité pour une journée sans jouer.

### Place dans le business model

Garder le mini-jeu de base gratuit. Sa valeur économique éventuelle est indirecte : améliorer l'attachement au produit, à vérifier par l'usage. Ne pas compter de revenus supplémentaires tant que cette hypothèse n'est pas validée et ne pas réserver un avantage de score aux abonnés.

## 16. Autre piste ludique : « Quel choix tactique ? »

Un quiz court présente une situation de match, propose plusieurs réponses et explique les avantages et les limites de chaque choix. Exemple de thème : options de remise face à un service court coupé, selon la hauteur de balle, le placement et les qualités du joueur.

Éviter de présenter une seule réponse comme universellement correcte lorsque la situation ne le permet pas. Faire relire les contenus par un entraîneur avant publication. Commencer par quelques situations originales bien expliquées plutôt que par une grande quantité de réponses générées automatiquement.

Les résultats du quiz restent distincts des points et du niveau sportif. Aucun contenu vidéo ou illustration d'un tiers ne doit être repris sans droits adaptés.

## 17. Ordre de réalisation et critères de décision

| Étape | Livrable | Ce qu'il faut vérifier |
|---|---|---|
| 1 — Fiabilité du prototype | Export et restauration de sauvegarde | Un aller-retour conserve les données ; un import invalide ne les détruit pas |
| 2 — Valeur sportive | Objectif personnel, bilan après-match et filtres de statistiques | Les joueurs comprennent les résultats et réutilisent ces fonctions |
| 3 — Expérience ludique limitée | Ping Arcade contre l'ordinateur, avec record d'échange local, sans classement partagé | Les contrôles tactiles, souris et clavier fonctionnent ; les collisions, le score, la difficulté et la pause restent cohérents sur différentes tailles d'écran |
| 4 — Communauté réelle | Comptes, disponibilités partagées et propositions de séance | Des joueurs organisent effectivement des séances avec confidentialité et modération adaptées |
| 5 — Extensions validées | Quiz tactique, défis entre amis et offres payantes testées | La demande et la volonté de payer justifient chaque investissement |

Le mini-jeu reste une expérience à budget limité, pas un prérequis au lancement communautaire. Si le pilote local est prêt, ne pas le retarder pour terminer le jeu.

Pour évaluer l'espace Défis, suivre les parties terminées, les retours volontaires et surtout le maintien de l'usage sportif : saisie des matchs et séances organisées. Une hausse du temps passé à jouer ne prouve pas, à elle seule, que l'application remplit mieux sa mission.

## 18. Nouvelles idées : un compagnon de jeu, pas seulement un compteur

Les propositions suivantes complètent les pistes précédentes. Elles restent à tester ; aucune n'est présentée comme déjà développée.

| Concept | Fonctionnement concret | Intérêt et limites |
|---|---|---|
| Mon duo d'entraînement | Deux joueurs acceptent un partenariat pour quelques séances, choisissent un objectif commun et un rythme | Favoriser des rencontres régulières ; chacun peut quitter le duo et masquer ses disponibilités |
| Séance express de 20 minutes | Une fiche originale propose trois exercices, une durée et du matériel nécessaire, avec un minuteur facultatif | Donner un objectif à une séance ; contenu relu par un entraîneur et adapté au niveau, sans promesse de résultat |
| Carnet de matériel | Noter sa raquette, ses revêtements et les dates de changement, puis afficher ces repères sur sa courbe | Aider à contextualiser ses sensations ; une évolution simultanée ne prouve pas que le matériel en est la cause |
| Carte souvenir de saison | Générer une carte avec matchs joués, bilan, progression estimée et meilleur souvenir choisi par le joueur | Partage volontaire ; masquer par défaut licence, contacts et noms des adversaires |
| Table ouverte | Un club publie un créneau, les niveaux accueillis, les places et les conditions d'accès ; les joueurs demandent à participer | Réduire l'incertitude sur le lieu ; aucune place n'est garantie avant confirmation et une vraie réservation demande un système dédié |
| Cercle de confiance | Après accord mutuel, retrouver rapidement quelques partenaires avec lesquels on aime jouer | Plus utile qu'un classement public des personnes ; aucune note publique de réputation |
| Mode tournoi personnel | Préparer une liste pratique et enregistrer ses matchs au fil de la journée, avec un récapitulatif final | Faciliter la saisie ; ne gère ni tableau officiel ni inscriptions à une compétition |

### Trois idées à explorer en premier

La carte souvenir est une piste légère liée aux données déjà présentes. Le carnet de matériel enrichit le suivi sans nécessiter une communauté en ligne. Les duos et tables ouvertes sont des pistes fortes pour la communauté, mais attendent les comptes, les accords mutuels et la gestion des inscriptions.

Ne pas lancer toutes ces fonctions ensemble. Pour chaque idée, vérifier qu'un joueur comprend l'intérêt, termine le parcours et souhaite le réutiliser.

## 19. Direction artistique : « Club moderne, énergie arcade »

### L'ambiance recherchée

Une identité sportive, chaleureuse et nette : le sérieux d'un carnet de progression, avec le plaisir d'une salle de ping. Éviter à la fois l'apparence d'un tableur administratif et celle d'un casino lumineux.

Le tableau de bord conserve un fond clair pour lire les données. Ping Arcade peut utiliser un décor sombre et plus expressif, tout en gardant la même typographie, les mêmes boutons et les mêmes icônes.

### Palette proposée

| Rôle | Couleur indicative | Usage |
|---|---|---|
| Bleu nuit | `#10233B` | Navigation, titres, fond de l'arcade |
| Vert profond | `#176B58` | Actions principales sur fond clair |
| Menthe | `#7FDCC4` | Accents et illustrations sur fond sombre |
| Bleu table | `#205E91` | Plateau de jeu et éléments graphiques sportifs |
| Blanc cassé | `#F5F7FB` | Fond des écrans de suivi |
| Orange balle | `#E9A23B` | Repères ludiques et détails d'illustration |
| Rouge sobre | `#B83E49` | Erreurs, sans transformer une défaite sportive en erreur système |

Ces couleurs sont des intentions, pas une certification d'accessibilité. Vérifier chaque couple texte/fond : au moins 4,5:1 pour le texte courant et 3:1 pour le grand texte selon les critères WCAG AA. La menthe et l'orange ne servent pas de texte fin sur fond blanc.

### Typographie et rythme

Une seule famille sans empattement, avec des variantes régulière, semi-grasse et grasse. Conserver la pile de polices système actuelle pour une première version ; une police additionnelle éventuelle devra avoir une licence adaptée et être hébergée sans appel inutile à un service tiers.

Prévoir du texte courant autour de 16 px, des titres de section entre 20 et 28 px et des chiffres clés entre 28 et 36 px. Éviter les informations essentielles en petits caractères. Utiliser des chiffres de largeur fixe dans les scores et les statistiques.

Organiser les espacements sur une base de 8 px, des cartes avec des coins de 12 à 16 px et des ombres discrètes. Réserver les grands effets visuels à un seul élément par écran.

## 20. Icônes et dessins : un langage visuel original

### Une famille d'icônes cohérente

Remplacer les symboles textuels disparates par des SVG dessinés sur une grille de 24 × 24, avec un trait d'environ 1,8 px, des extrémités arrondies et une complexité comparable. Les icônes héritent de la couleur du composant.

| Fonction | Dessin proposé |
|---|---|
| Tableau de bord | Quatre cases dont une contient une petite courbe |
| Mes matchs | Deux raquettes opposées avec une balle entre elles |
| Partenaires | Deux silhouettes reliées par un arc d'échange |
| Mon profil | Silhouette simple avec une petite raquette |
| Objectifs | Cible avec une balle sur un anneau |
| Disponibilités | Calendrier avec un repère horaire |
| Ping Arcade | Mini-table vue du dessus, filet et deux raquettes |
| Sauvegarde | Document avec flèche, orientée selon export ou import |

Conserver un libellé visible à côté des icônes de navigation, notamment sur téléphone. Une icône décorative est ignorée par les technologies d'assistance ; un bouton sans texte doit avoir un nom accessible explicite. Ne pas compter uniquement sur une infobulle.

### Des illustrations qui racontent une action

Prévoir trois illustrations originales en SVG, légères et adaptées au téléphone :

- **Accueil : « Le prochain échange »** — table en perspective légère, deux raquettes et trajectoire courbe. L'illustration reste décorative et ne concurrence pas le bouton principal.
- **Historique vide : « La première balle »** — carnet ouvert et balle posée sur une ligne ; message : « Ajoute ton premier match pour voir ton parcours. »
- **Partenaires : « La table nous relie »** — deux silhouettes autour d'une table, sans carte géographique fictive ni profils inventés.

Dessiner une petite signature de marque : une balle traversant une ligne de filet. Elle peut accompagner le nom Ping Points sans devenir une copie d'un logo existant.

Privilégier les formes géométriques simples, deux ou trois couleurs et un même style de traits. Pas de mélange entre emojis, photos génériques, dessin 3D et icônes plates. Ne pas utiliser de portraits de joueurs sans autorisation.

### Micro-interactions

Une carte peut se soulever légèrement au survol ; un bouton confirme visuellement son activation ; l'ajout d'un match déclenche une confirmation courte. Sur écran tactile, aucune action ne dépend du survol.

Limiter les transitions décoratives à environ 150–200 ms et les supprimer ou simplifier lorsque l'utilisateur préfère moins d'animations. Pas de confettis automatiques, de vibrations ou de sons à chaque victoire.

## 21. Présentation des écrans à concevoir

| Écran | Composition proposée | Action principale |
|---|---|---|
| Accueil | Message personnel discret, résumé sportif, objectif en cours, courbe et accès secondaire à l'arcade | Ajouter un match |
| Matchs | Filtres lisibles, liste compacte sur téléphone, détail d'une rencontre et bilan personnel | Enregistrer une rencontre |
| Partenaires | Disponibilités et conditions du lieu avant les détails secondaires ; distinguer annuaire personnel et communauté | Proposer une séance, seulement avec le service partagé |
| Profil | Informations personnelles, niveau, club et réglages de visibilité en groupes séparés | Enregistrer les modifications |
| Défis | Une grande carte Ping Arcade et une carte secondaire pour le futur quiz | Jouer une partie |
| Bilan de saison | Résumé lisible, repères chronologiques et choix des informations à partager | Créer ma carte souvenir |

Pour le prototype actuel, renommer clairement la rubrique locale « Mon répertoire ». Réserver « Trouver des partenaires » à une recherche réellement partagée. Une belle présentation ne doit pas suggérer l'existence d'utilisateurs en ligne.

### Un démarrage guidé, sans imposer toutes les données

Proposer un parcours court : choisir son usage, renseigner son point de départ si l'on souhaite estimer ses points, puis ajouter son premier match. Le club, la licence et le répertoire peuvent être complétés plus tard.

Un joueur loisir doit pouvoir enregistrer ses matchs sans être obligé d'inventer un total de points. Dans ce cas, afficher ses résultats, mais laisser l'estimation des points indisponible avec une explication.

### Des états aussi soignés que les écrans remplis

Prévoir explicitement : aucune donnée, recherche sans résultat, sauvegarde impossible, import invalide, chargement réel, absence de connexion au service partagé et confirmation d'une action. Chaque message explique ce qui se passe et l'action possible, sans faire disparaître les saisies.

Sur téléphone, remplacer les grands tableaux par des cartes récapitulatives ou une présentation réellement lisible. Viser des zones tactiles d'au moins 44 × 44 px, un focus clavier visible et une mise en page sans défilement horizontal à 320 px pour les écrans hors jeu.

## 22. Personnalisation et nouveautés ludiques à petite échelle

### Ma table, mon ambiance

Dans Ping Arcade, proposer quelques thèmes originaux : « Club classique », « Nuit menthe » et « Tournoi bleu ». Ils changent le décor, jamais les règles, la taille des raquettes ou la vitesse de balle. Les contrastes utiles au jeu restent identiques ou équivalents.

### Badges personnels utiles

Des repères comme « Premier match enregistré », « Premier bilan rédigé » ou « Objectif de séances atteint » peuvent accompagner le parcours. Ils décrivent une activité déclarée et ne prouvent ni le niveau ni la qualité d'un joueur.

Éviter les récompenses qui incitent à inventer des matchs, les séries quotidiennes obligatoires et les badges humiliants. Le joueur doit pouvoir masquer ces éléments.

### Un défi arcade choisi, pas imposé

Proposer ponctuellement un objectif facultatif, par exemple tenir un échange de 15 renvois en mode facile. Pas de notification quotidienne automatique. L'objectif est stable pour une version donnée du jeu et n'a aucune incidence sur le classement sportif.

### Monétisation esthétique éventuelle

Des packs de décors pourraient être testés plus tard comme achat facultatif, avec un prix fixe et un aperçu. Aucun tirage aléatoire payant, aucun avantage de performance et aucune obligation d'achat pour accéder au jeu de base.

Cette piste ne remplace pas le modèle principal gratuit + analyses avancées + services club. Ne pas additionner des revenus cosmétiques hypothétiques aux projections existantes sans preuve de demande.

## 23. Transformer ces idées en chantier de design

| Priorité | Travail de conception | Critère de réussite |
|---|---|---|
| D'abord | Palette, typographie, boutons et famille d'icônes | Une action a le même aspect et le même nom sur chaque écran |
| Ensuite | Maquettes de l'accueil, des matchs et du profil sur téléphone | Un nouveau joueur trouve comment enregistrer son premier match sans aide |
| Puis | Illustrations originales et états vides/erreurs | Les dessins renforcent la compréhension sans masquer les informations |
| Ensuite | Maquette Ping Arcade et commandes tactiles | La table, la balle, le score et la zone de contrôle restent lisibles simultanément |
| Après validation | Carte souvenir, carnet de matériel et personnalisation | Ces fonctions répondent à un usage observé et n'alourdissent pas la navigation |

Faire essayer les maquettes à quelques joueurs, y compris un débutant et une personne peu à l'aise avec les interfaces. Observer les actions plutôt que demander seulement si le design leur plaît.

**Résultat recherché : un site plus beau parce qu'il est plus cohérent, plus clair et plus agréable à utiliser, pas simplement plus chargé.**

Ces sections définissent une direction de produit et de design. Elles ne modifient pas le site et ne constituent pas des maquettes ou des ressources graphiques déjà réalisées.
