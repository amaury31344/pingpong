# API tennis de table : clubs, joueurs et resultats

Recherche du 27 novembre 2026 pour Ping Points.

## Conclusion

L'API officielle FFTT / Smartping est la source la plus adaptee pour
rechercher les clubs affilies et les joueurs francais directement dans Ping
Points. Elle existe, mais son utilisation necessite une demande et
l'approbation de la FFTT. Aucune integration authentifiee n'a ete realisee.

La conclusion precedente selon laquelle aucune API adaptee n'avait ete
trouvee etait incomplete. La carte officielle et l'API Smartping sont deux
services distincts : l'impossibilite d'integrer la carte ne signifie pas
qu'une API n'existe pas.

## Sources examinees

| Service | Donnees documentees | Acces et limites |
| --- | --- | --- |
| FFTT / Smartping | Clubs par nom, ville, code postal ou departement ; details et equipes ; joueurs par nom, licence ou club ; classements et competitions | Projet a faire approuver ; identifiant et cle individuels ; droits et interfaces selon autorisation |
| Sportradar Table Tennis | Competitions, profils de joueurs, classements, historiques et scores en direct selon couverture | Authentification et offre commerciale ; couverture des clubs amateurs francais non etablie |
| BetsAPI | Rencontres et resultats de tennis de table, sport numero 92 | Service payant avec jeton ; couverture FFTT amateur non etablie |
| TheSportsDB | API sportive generaliste | Le catalogue public teste n'a pas renvoye de sport "Table Tennis" ; non retenu comme source pour ce besoin |
| API Recherche d'entreprises | Associations dont le nom correspond a une recherche, filtrees par commune | Ne prouve pas une affiliation FFTT ; ne doit pas servir d'annuaire de clubs verifies |
| Data ES, ministere des Sports | Equipements declares pour la pratique du tennis de table | Contient notamment des installations scolaires ; un equipement n'est pas un club affilie |

Ce tableau ne constitue pas un inventaire exhaustif de toutes les offres.
Les couvertures, tarifs et conditions peuvent evoluer.

## FFTT / Smartping : procedure officielle

Source federale : <https://www.fftt.com/api/>.

1. Lire les conditions generales d'utilisation des donnees federales.
2. Remplir le formulaire en presentant Ping Points et les usages souhaites.
3. Envoyer la demande a `interfaces.informatiques@fftt.email`.
4. Attendre la decision de la FFTT et les identifiants correspondant aux
   interfaces autorisees.

Documents lies depuis la page officielle lors de la recherche :

- [Formulaire de demande](https://www.fftt.com/wp-content/uploads/2026/01/formulaire-api-1484.pdf).
- [Conditions generales d'utilisation](https://www.fftt.com/wp-content/uploads/2026/01/api-conditions-generales-d-utilisations-1485.pdf).

La page officielle indique une evaluation de chaque projet et la fourniture
d'un identifiant et d'une cle apres acceptation. Aucun prix ni quota
contractuel n'est confirme dans ce rapport. Aucun formulaire n'a ete envoye
au nom de l'utilisateur.

## Clients techniques disponibles

- [Client TypeScript non officiel](https://github.com/fftt-api/typescript-client),
  paquet `@fftt-api/typescript-client`.
- [Client PHP non officiel](https://github.com/fftt-api/php-client).
- [Autre client PHP](https://github.com/alamirault/fftt-api).
- [Client C# et documentation Smartping](https://github.com/FlGoldschmitt/FFTT.Api.Client).

Ces bibliotheques consomment les services de la FFTT. Leur licence de code
ne donne pas de droit supplementaire sur les donnees et ne remplace pas
l'autorisation federale.

La documentation du client TypeScript mentionne `APP_ID`, `APP_KEY` et un
numero de serie utilisateur permanent. Elle documente la recherche de clubs
et de joueurs. Les fonctions disponibles doivent etre confirmees avec la
version du client, la documentation federale et les droits accordes.

Des methodes anciennes de parties validees/non validees et de points
virtuels sont annoncees comme supprimees dans les clients recents. Leurs
README divergent aussi sur certains historiques. Ne pas promettre un
equivalent de FFTT Premium ni une actualisation anticipee des points sur
la seule base d'une ancienne bibliotheque.

## Integration envisagee dans Ping Points

Apres autorisation et verification de la documentation applicable :

- Ajouter une route serveur pour les recherches de clubs et de joueurs.
- Conserver la cle dans des variables d'environnement serveur, jamais dans
  les fichiers JavaScript livres au navigateur ni dans Git.
- Appliquer les limites de requetes, de conservation, de cache et de
  redistribution prevues par la FFTT.
- Afficher uniquement les champs necessaires et autorises, en tenant compte
  des donnees personnelles et des mineurs.
- Distinguer une information federale de donnees declarees par les joueurs
  et des points estimes par Ping Points.
- Tester de vraies reponses, les erreurs, les changements de schema et la
  couverture avant publication.

## Carte FFTT et solutions ecartees

La carte officielle est disponible sur <https://carte.fftt.com/>.
Les en-tetes observes sont `X-Frame-Options: SAMEORIGIN` et
`Content-Security-Policy: frame-ancestors 'self'`. Ils empechent son affichage
dans une iframe sur Ping Points.

Ses points d'acces techniques ne constituent pas une API publique
documentee pour la reutilisation. Ils n'ont pas ete retenus comme solution
de remplacement autorisee et aucune protection n'a ete contournee.

La recherche Data ES a bien retourne des lieux de tennis de table a Lille,
dont des etablissements scolaires. Elle a ete retiree de l'espace club
car elle ne repondait pas a la demande de clubs affilies.

## Autres references

- [Sportradar : presentation Table Tennis](https://developer.sportradar.com/table-tennis/reference/overview).
- [BetsAPI : documentation et authentification](https://betsapi.com/docs/).
- [BetsAPI : identifiants des sports](https://betsapi.com/docs/GLOSSARY.html).
- [TheSportsDB : presentation](https://www.thesportsdb.com/api.php).
- [API Recherche d'entreprises](https://www.data.gouv.fr/dataservices/api-recherche-dentreprises).
- [Data ES](https://equipements.sports.gouv.fr/).

## Verification et etat reel

La page officielle FFTT et les documentations citees ont ete consultees.
Les appels authentifies a Smartping, Sportradar et BetsAPI n'ont pas ete
testes : aucun identifiant autorise n'etait disponible pour ces essais.

L'application publiee conserve son espace "Mon club" avec saisie manuelle
et lien vers la carte officielle. La recherche native de clubs et joueurs
FFTT n'est pas encore implementee.
