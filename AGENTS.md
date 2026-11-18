# Consignes pour travailler sur Code secret

Ces consignes concernent l’ensemble du projet. Lire `README.md` et les fichiers concernés avant de modifier le code. Répondre en français et expliquer simplement les changements pour permettre la reprise du projet par son auteur.

## Structure et choix techniques

- Conserver une application statique en HTML, CSS et JavaScript, utilisable en ouvrant `index.html` et compatible avec GitHub Pages dans un sous-dossier.
- Utiliser des chemins relatifs et conserver `.nojekyll`.
- Garder les règles et la validation dans `game.js`, l’interface dans `app.js`, la structure dans `index.html` et les styles dans `style.css`.
- Faire passer les actions de l’interface et celles de l’API par le même moteur et la même partie.
- Privilégier des modifications petites et compréhensibles, sans ajouter de dépendance ou d’outil de compilation inutile.

## Règles à préserver

La référence du mode commun est `code-couleurs-1.0` :

- Un code secret fixe de quatre couleurs, tirées au hasard avec répétitions possibles.
- Palette exacte, dans cet ordre : `rouge`, `bleu`, `vert`, `jaune`, `orange`, `violet`.
- Dix essais valides au maximum. Une proposition invalide ne consomme aucun essai et ne modifie pas l’historique.
- Compter les bien placées en premier, puis les mal placées parmi les occurrences restantes. Chaque occurrence compte au maximum une fois ; les indices ne désignent pas les positions.
- Quatre bien placées donnent la victoire, y compris au dixième essai. Sinon, dix essais donnent la défaite.
- Après la fin, aucune proposition ne change les données de la partie. Une nouvelle partie remet à zéro les essais, les propositions, les indices et les erreurs.
- Ne pas ajouter de révélation indépendante de la solution dans l’interface ou les états de l’API.

## API commune de test

Préserver le contrat `0.2` décrit dans le document fourni « API commune de test — Code secret en couleurs » et dans le README.

- Exposer `window.codeSecretTest` uniquement avec le paramètre `test=1`. Dans ce mode, commencer à `not-started`, sans secret imposé conservé d’une session précédente.
- Conserver `version`, `getConfig()`, `startGame(options?)`, `submitGuess(guess)` et `getState()`.
- Garder les getters synchrones et sans effet de bord. Les mutations renvoient des promesses résolues après synchronisation de l’interface.
- Retourner des objets et tableaux indépendants des données internes ; copier aussi les tableaux reçus.
- Pour une proposition, vérifier dans cet ordre : partie non démarrée, partie terminée, tableau dense de chaînes, longueur, couleurs autorisées. Un refus ne modifie que `lastError`.
- Pour un démarrage, vérifier d’abord la forme des options et les clés inconnues, puis le type, la longueur et les couleurs du secret éventuel. En cas d’erreur, rejeter avec une `Error` portant `code` et `message`, en conservant intégralement l’état et l’interface.
- Accepter les objets ordinaires provenant d’une autre fenêtre, notamment dans les tests en iframe.

## Interface et accessibilité

- Conserver les textes du jeu en français, les règles visibles et l’historique consultable jusqu’au redémarrage.
- Identifier les couleurs aussi par un nom ou un symbole.
- Préserver le fonctionnement au clavier et au toucher, le focus visible et les messages d’erreur compréhensibles.
- Après une modification de présentation, vérifier une largeur mobile et une largeur ordinateur, sans débordement horizontal. Distinguer une simulation mobile d’un essai sur téléphone réel.

## Vérifications et documentation

- Après une modification, vérifier le comportement concerné. Pour une correction, noter l’attendu, conserver un scénario reproductible du défaut et comparer le résultat après correction.
- Si le moteur, la validation ou l’API changent, exécuter `node --test tests/game.test.cjs` ou `npm test` et ajouter un test pertinent lorsque nécessaire.
- Pour vérifier l’intégration, lancer `node server.cjs`, ouvrir `http://127.0.0.1:4173/tests/browser.html` et exécuter les vérifications. Recharger la page avant chaque nouvelle exécution.
- Vérifier dans le navigateur les interactions modifiées : saisie, indices, compteur, historique, erreurs, fin de partie et redémarrage selon le changement.
- Pour une modification documentaire seule, relire le contenu et contrôler le diff ; les tests du jeu ne sont pas nécessaires.
- Mettre à jour le README si le fonctionnement, les commandes, la version ou les limites changent. Ne pas présenter un résultat ancien comme une nouvelle vérification.
- Rapporter ce qui a réellement été vérifié et signaler explicitement les vérifications non effectuées. Ne pas inventer de preuve, de retour de camarade ou d’essai sur appareil.

## Confidentialité et Git

- Ne pas intégrer de compte, paiement, classement en ligne, serveur applicatif, service d’IA, clé API, télémétrie ou collecte de données personnelles dans le jeu.
- Ne pas publier de conversation, de document privé, de secret d’accès ou de capsule vidéo dans le dépôt.
- Préserver les modifications existantes de l’utilisateur et l’historique Git. Ne pas écraser de fichiers sans lien avec la tâche.
- Ne créer ou pousser un commit, un tag ou une publication que dans le cadre d’une demande qui l’autorise. Ne pas créer automatiquement les tags pédagogiques `jalon-1` ou `final`.
