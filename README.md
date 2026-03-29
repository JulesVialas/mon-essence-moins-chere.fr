# Mon Essence Moins Chère

Comparez les prix des carburants en temps réel dans toutes les stations-service de France, depuis votre mobile.

Données officielles fournies par le [Ministère de l'Économie](https://www.data.gouv.fr/fr/datasets/prix-des-carburants-en-france-flux-instantane-v2/) via data.gouv.fr.

## Fonctionnalités

- Recherche par adresse avec autocomplétion (API adresse.data.gouv.fr)
- Géolocalisation GPS
- Filtrage par type de carburant : SP95, SP98, E10, Gazole, E85, GPL
- Rayon de recherche configurable (5 à 50 km)
- Tri par prix ou par distance
- Résumé min/max avec écart en centimes
- Itinéraire direct vers la station (Google Maps)
- Interface mobile-first, sans dépendance externe côté UI

## Stack

- [Next.js 16](https://nextjs.org/) (App Router)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [TypeScript](https://www.typescriptlang.org/)

## Développement local

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

Aucune variable d'environnement requise — l'API data.gouv.fr est publique.

## Déploiement sur Vercel

### Via l'interface Vercel

1. Pusher le dépôt sur GitHub
2. Aller sur [vercel.com/new](https://vercel.com/new)
3. Importer le dépôt — Vercel détecte automatiquement Next.js
4. Cliquer **Deploy** — aucune configuration requise

### Via la CLI

```bash
npm i -g vercel
vercel
```

### Variables d'environnement

Aucune. L'application consomme uniquement des APIs publiques françaises.

## Architecture

```
app/
├── api/
│   └── stations/
│       └── route.ts        # Proxy vers data.economie.gouv.fr
├── components/
│   └── FuelSearch.tsx      # Composant principal (recherche + résultats)
├── layout.tsx              # Layout global, métadonnées, font
├── page.tsx                # Page d'accueil
└── globals.css             # Styles globaux Tailwind
```

### Route API `/api/stations`

Proxy serveur vers l'API ODSQL du gouvernement. Paramètres :

| Paramètre | Type   | Défaut | Description                          |
|-----------|--------|--------|--------------------------------------|
| `lat`     | number | —      | Latitude (requis)                    |
| `lon`     | number | —      | Longitude (requis)                   |
| `fuel`    | string | SP95   | Type de carburant                    |
| `radius`  | number | 10     | Rayon en km (1–100)                  |

Les résultats sont mis en cache 5 minutes côté serveur (`revalidate: 300`).

## Licence

MIT
