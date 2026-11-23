# VOLTA — Club de force & conditionnement à Abidjan

Page d'accueil d'un club de sport fictif basé à Abidjan (Côte d'Ivoire) : HTML, CSS et JavaScript, sans framework ni build.

## Aperçu

- **Hero vidéo** : un athlète détouré (WebM VP9 avec transparence) enchaîne des pompes sur kettlebells devant le titre « DEVENEZ FORT ».
- **Sections** : à propos, coachs (carrousel), installations (slider), planning des cours, tarifs en FCFA (mensuel / annuel), 4 clubs à Abidjan avec carte, essai gratuit et pied de page.
- **Animations** : révélation des titres mot à mot au scroll, apparitions en fondu, compteurs, formes à encoche (`clip-path`), défilement fluide (Lenis) et halo de curseur.
- **Responsive** : de l'écran large au mobile.

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier avec n'importe quel serveur web, par exemple WAMP (`http://localhost/Sport/`) :

```bash
python -m http.server 8000
```

## Structure

```
index.html
assets/
  css/style.css
  js/main.js
  img/      photos (coachs, installations, membres)
  video/    hero-athlete.webm + image de secours (Safari)
```

## Compatibilité

La vidéo transparente (VP9 + alpha) est lue par Chrome, Edge, Firefox et Opera. Safari affiche à la place l'image détourée `hero-athlete-poster.png`.

## Crédits médias

- Vidéo du hero : [Pexels – vidéo 4812839](https://www.pexels.com/video/4812839/), détourée pour ce projet (licence Pexels).
- Photos : [Unsplash](https://unsplash.com) (licence Unsplash).
- Les noms, adresses, numéros et tarifs sont fictifs, à remplacer par les vraies informations.
