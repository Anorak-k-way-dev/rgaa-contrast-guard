# RGAA Contrast Guard

Vérificateur de ratio de contraste WCAG 2.1 / RGAA 4 ultra-léger, conçu pour aider les développeurs et designers à valider immédiatement la conformité de leurs couples de couleurs (textes normaux, grands textes et composants UI) et à trouver la teinte conforme la plus proche en un clic.

🔗 **Démo en ligne :** [Ouvrir RGAA Contrast Guard](https://anorak-k-way-dev.github.io/rgaa-contrast-guard/)

## Choix d'architecture & Éco-conception

- **Zéro dépendance & zéro build :** HTML5 sémantique, CSS natif et Vanilla JS (< 15 Ko non compressé, 0 requête tiers, favicon SVG inline).
- **Accessibilité RGAA 4 & Opquast :** Navigation complète au clavier avec `:focus-visible`, lien d'évitement, aucune information véhiculée par la couleur seule, validation de formulaire non bloquante et annonces `aria-live` débouncées pour ne pas saturer les lecteurs d'écran.
- **Gestion rigoureuse du focus :** Lors de l'application d'une couleur suggérée (qui masque le panneau de suggestion), le focus est explicitement replacé sur le champ de couleur mis à jour.
- **Séparation des responsabilités :** Le moteur mathématique (`js/contrast.js`) est isolé du DOM (`js/app.js`).

## Lancement local

Ouvrir directement `index.html` dans un navigateur ou servir le dossier en local :

    python3 -m http.server 8000

## Audits visés

- **Lighthouse :** 100/100 Performance, Accessibilité, Bonnes pratiques, SEO.
- **W3C HTML/CSS Validator :** 0 erreur.