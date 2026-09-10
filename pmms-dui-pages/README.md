# pmms-dui — page DUI HTTPS avec anti-publicité YouTube

Page DUI de [pmms](https://github.com/kibook/pmms) hébergée en HTTPS, avec un
correctif anti-publicité YouTube.

## Pourquoi cette page existe

YouTube refuse de démarrer la lecture quand la page qui l'intègre est servie en
HTTP. La page DUI interne de pmms (`pmms/http/dui/`) est servie par httpmanager
en HTTP : les liens YouTube renvoient alors `Error playing <url>: unknown error`.
Il faut donc une page DUI servie en **HTTPS**, indiquée dans
`Config.dui.urls.https`.

La page officielle de l'auteur (`https://kibook.github.io/pmms-dui`) fonctionne,
mais elle ne contient aucun anti-publicité : YouTube joue ses pubs, et pire,
l'événement `canplay` se déclenche *pendant* la pub — pmms enregistre alors la
durée de la publicité au lieu de celle du morceau, ce qui désynchronise tout le
monde et donne l'impression que le lien du joueur ne fonctionne pas.

Cette page est une copie de la page DUI, hébergée **sur notre propre compte**,
avec le correctif. Aucune dépendance à un tiers : le JavaScript exécuté dans le
navigateur embarqué de chaque joueur est celui de ce dépôt.

## Ce que fait le correctif

Tout est dans `script.js`, bloc `PMMS - anti-publicite YouTube` :

- `startAdSkipper()` — boucle toutes les 250 ms tant que le média existe
- `isAdShowing()` — détecte une pub via les classes `ad-showing` /
  `ad-interrupting` posées par YouTube sur `#movie_player` (seule source fiable :
  les conteneurs `.ytp-ad-*` existent en permanence dans le DOM)
- clic sur le bouton « Passer » (`.ytp-ad-skip-button`,
  `.ytp-ad-skip-button-modern`, `.ytp-skip-ad-button`) et sur les overlays
- pub non skippable : sourdine + `playbackRate = 16` + saut à la fin, avec un
  garde-fou de 180 s pour ne jamais accélérer un vrai morceau
- `whenAdFree()` — retarde la lecture de `media.duration` jusqu'à la fin de la
  pub (abandon au bout de 30 s), ce qui corrige la désynchronisation
- restauration de la vitesse et du volume d'origine en fin de pub

L'accès au DOM de l'iframe YouTube est possible parce que FiveM démarre CEF sans
web-security ; pmms s'en sert déjà pour ses filtres audio. Cela ne fonctionne
donc que dans le jeu, pas dans un navigateur classique.

## Déploiement sur GitHub Pages

1. Créer un dépôt **public** nommé `pmms-dui` sur le compte GitHub.
2. Pousser le contenu de ce dossier à la racine du dépôt :

   ```bash
   cd pmms-dui
   git init
   git add .
   git commit -m "Page DUI pmms avec anti-publicite YouTube"
   git branch -M main
   git remote add origin https://github.com/<COMPTE>/pmms-dui.git
   git push -u origin main
   ```

3. Dépôt → **Settings → Pages** → *Source* : `Deploy from a branch`,
   branche `main`, dossier `/ (root)` → **Save**.
4. Attendre 1–2 min, puis vérifier que `https://<COMPTE>.github.io/pmms-dui/`
   répond (page blanche avec une icône de chargement masquée = normal).
5. Dans `pmms/config.lua` :

   ```lua
   Config.dui.urls.https = "https://<COMPTE>.github.io/pmms-dui"
   ```

6. `restart pmms` côté serveur. Les joueurs doivent recharger le jeu (le
   navigateur embarqué met la page en cache).

Le fichier `.nojekyll` empêche GitHub Pages de passer le dossier dans Jekyll ;
ne pas le supprimer.

## Mise à jour

Après toute modification de `pmms/http/dui/script.js` côté serveur, reporter la
modification ici et repousser sur le dépôt — sinon les joueurs continuent de
charger l'ancienne version. Les deux fichiers doivent rester identiques.
