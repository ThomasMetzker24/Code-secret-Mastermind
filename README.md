# Code secret — v1.0.0

Jeu solo en français inspiré du Mastermind. Ouvrir `index.html` directement dans un navigateur, ou lancer `node server.cjs` puis ouvrir http://127.0.0.1:4173. Aucune installation de dépendances n’est nécessaire.

## Règles et sources

Le code contient quatre couleurs parmi rouge, bleu, vert, jaune, orange et violet. Les répétitions sont autorisées. Dix propositions valides au maximum ; quatre bien placées donnent la victoire, y compris au dixième essai. Les bien placées sont comptées en premier, puis les mal placées parmi les occurrences restantes. Chaque occurrence compte une seule fois. Une saisie invalide ne consomme aucun essai. Après la fin, le jeu refuse les propositions jusqu’à une nouvelle partie.

Sources fournies : « Projet — Code secret en couleurs, inspiré du Mastermind », édition 2.2, annexe `code-couleurs-1.0` ; « API commune de test — Code secret en couleurs », contrat 0.2, édition Google 1.5. Ces documents servent de spécifications du logiciel ; les remises pédagogiques restent à effectuer par l’étudiant.

## Jouer et reprendre le projet

Sélectionner une case, puis une couleur dans la palette. La sélection avance automatiquement à la case suivante. Les noms et les symboles permettent d’identifier les couleurs. Avec le focus dans le panneau de saisie, les touches 1 à 6 choisissent une couleur, les flèches changent de case et Retour arrière ou Suppr efface la case sélectionnée. Entrée valide depuis les cases ou la palette. Tous les boutons sont accessibles avec Tab et leur activation habituelle.

- `index.html` : structure, règles visibles et version.
- `style.css` : présentation adaptative, sans police ni ressource distante.
- `game.js` : règles, validation et API du moteur, sans accès au DOM (Document Object Model).
- `app.js` : interface et exposition de l’API de la véritable partie affichée.
- `tests/game.test.cjs` : tests du moteur avec le lanceur intégré de Node.js.
- `tests/browser.html` et `tests/browser.js` : vérifications du jeu réel dans une iframe.
- `server.cjs` : serveur local facultatif, limité aux fichiers de l’application et des tests.

Décisions prise avec Codex : 
- Utiliser un moteur unique pour les clics, le clavier et l’API, ce qui permet de vérifier les règles indépendamment du rendu, puis de comparer la même partie avec l’écran.
- L’application utilise uniquement HTML, CSS et JavaScript afin de faciliter sa reprise et sa publication statique.

**Une décision expliquée plus en détail.** Le code secret reste dans la fermeture du moteur afin de rendre une variable accessible qu'aux fonctions qui l'utilisent. Cela permet également d'éviter de montrer la réponse par accident ainsi que de créer une distinction entre le fonctionnement du jeu et son affichage. De ce fait, aucun champ de solution n’est renvoyé, même après une défaite. Comme dans tout jeu exécuté côté navigateur, les outils de débogage permettent cependant d’inspecter le programme.

## API commune 0.2

Ouvrir `index.html?test=1` (ou `/?test=1` sur le serveur local). L’API `window.codeSecretTest` est exposée lorsque les scripts sont chargés. Le mode test commence à `not-started`. Sans `test=1`, l’objet n’existe pas et une partie aléatoire démarre automatiquement.

```js
const api = window.codeSecretTest;
api.getConfig();
await api.startGame({ secret: ["rouge", "rouge", "bleu", "vert"] });
await api.submitGuess(["rouge", "bleu", "rouge", "vert"]);
// lastResult : { wellPlaced: 2, misplaced: 2 }
api.getState();
```

`getConfig` et `getState` sont synchrones. Les mutations renvoient des promesses après mise à jour du DOM. Les entrées et les états retournés sont copiés. Un `startGame` invalide rejette avec une `Error` portant `code` et `message`, sans modifier l’état ni l’interface. Un refus de proposition ne change que `lastError`. Les contrôles suivent la priorité du contrat, y compris pour les tableaux creux et les éléments non textuels.

## Vérifications du 11 novembre et du 20 novembre 2026

Lancer `node --test tests/game.test.cjs` ou `npm test` : **18 tests réussis, 0 échec**. Ils couvrent les neuf exemples T01–T09 (indices et état), les refus prioritaires, les doublons, les copies défensives, le cycle de vie, la victoire à dix, la défaite et les démarrages invalides. Une vérification indépendante du calcul parcourt aussi les 1 296 secrets possibles contre quatre propositions représentatives.

Avec le serveur local, ouvrir http://127.0.0.1:4173/tests/browser.html puis cliquer sur « Exécuter les vérifications » : **10 vérifications réussies, 0 échec** dans le navigateur intégré. Recharger cette page avant chaque nouvelle exécution pour vérifier l’état initial neuf. Les assertions comparent les états à l’historique, aux indices, au compteur, aux erreurs et aux commandes visibles ; elles vérifient également l’absence de l’API en mode normal.

| Vérification | Attendu | Obtenu |
| --- | --- | --- |
| Secret rouge–rouge–bleu–vert, proposition rouge–bleu–rouge–vert | 2 bien, 2 mal | 2 bien, 2 mal et une ligne à l’écran |
| Proposition courte pendant une partie | Refus, aucun essai ajouté | `invalid-length`, historique inchangé, message visible |
| Neuf propositions bleues puis code exact rouge | Victoire à 10 | `won`, 10 essais, validation désactivée |
| Dix propositions bleues pour un secret rouge | Défaite à 10 | `lost`, historique de 10 lignes |
| Nouvelle partie depuis l’interface | API et interface remises à zéro | `playing`, 0 essai, historique et cases vides |
| Touches 1, 2, 3, 4 puis Entrée | Une proposition rouge–bleu–vert–jaune | Une ligne enregistrée avec les quatre couleurs dans cet ordre |

**Correction documentée.** Le premier essai d’intégration acceptait seulement les objets dont le prototype était celui de la fenêtre du jeu. Un objet ordinaire fourni depuis la fenêtre parente était refusé avec `invalid-options`. Avant correction : 3 vérifications d’intégration réussies, 7 échecs. La reconnaissance d’un objet ordinaire accepte désormais aussi ceux provenant d’une autre fenêtre. Après correction, le même essai : 10 réussites, 0 échec. Le test Node « Objet ordinaire fourni par une autre fenêtre » conserve ce scénario de régression.

Rendu inspecté aux largeurs de fenêtre 390 et 1 280 pixels. Aucun débordement horizontal mesuré ; à 390 pixels, la largeur utile et la largeur de contenu valent toutes deux 375 pixels, la barre de défilement occupant le reste. La composition et la validation au clavier ont été essayées dans le navigateur. Cela constitue cependant une simulation mobile, pas un essai sur un téléphone physique. Des essais sur un Samsung Galaxy A8 ont été réalisés le 20 novembre. Le lien du jeu Mastermind fonctionne sur le navigateur Google Chrome ainsi que sur Mozilla Firefox. En revanche, l'affichage mobile doit être adapté: à l'heure actuelle, les indices ne sont totalement visibles qu'en retournant le téléphone à l'horizontal. Des essais ont également été fait sur ordinateur. Le lien du jeu fonctionne sur les navigateurs Microsoft Edge, Google Chrome et Mozilla Firefox. Enfin, la conformité de l'URL GitHub Pages publiée a aussi été testée avec succès.

## Publication et limites

Le dépôt source est [ThomasMetzker24/Code-secret-Mastermind](https://github.com/ThomasMetzker24/Code-secret-Mastermind), sur la branche `main`. Les chemins sont relatifs, compatibles avec un sous-dossier GitHub Pages. Pour mettre le jeu en ligne, activer Pages dans les paramètres GitHub, source « Deploy from a branch », branche `main`, dossier `/ (root)`. Le fichier `.nojekyll` permet de servir directement le site statique. La publication du code dans le dépôt ne configure pas GitHub Pages ; un premier tag de remise a été créé par la suite (20 novembre).

Les parties sont conservées uniquement en mémoire : recharger la page les efface. Pas de compte, de serveur applicatif, de télémétrie, de service d’IA ni de stockage de données personnelles. L'installation PWA n'est pas implémentée. La navigation avec lecteur d'écran, le retour d’un camarade, le dernier tag de remise et la capsule vidéo restent à réaliser.
