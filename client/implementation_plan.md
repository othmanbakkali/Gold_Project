# Application d'Affichage du Prix de l'Or (Smart TV & Admin)

Cette application permet d'afficher en temps réel le prix de l'or sur des écrans ou Smart TVs, avec un panneau d'administration sécurisé pour la mise à jour quotidienne.

## User Review Required

> [!IMPORTANT]
> Veuillez valider les choix techniques et l'approche esthétique avant que je ne commence le développement. 

## Choix Techniques Proposés

1. **Architecture Globale :**
   - **Backend (Serveur) :** `Node.js` avec le framework `Express`.
   - **Temps Réel :** `Socket.IO` pour que l'écran de la TV se mette à jour *instantanément* dès que l'administrateur modifie le prix, sans avoir besoin de rafraîchir la page.
   - **Base de données :** `SQLite`, une base de données légère et intégrée, parfaite pour stocker le prix actuel et l'historique sans configuration serveur complexe.
   - **Frontend (Client) :** `React` (via `Vite`) pour la création de l'interface utilisateur (à la fois pour la TV et l'Admin).

2. **Application PWA (Progressive Web App) :**
   - Le frontend inclura un `manifest.json` afin qu'il puisse être "installé" sur les navigateurs web des Smart TVs ou ajouté à l'écran d'accueil pour fonctionner en mode plein écran.

3. **Design et Esthétique (Premium) :**
   - **CSS Vanilla** (pas de frameworks génériques) pour un contrôle total.
   - Thème sombre profond et élégant avec des accents dorés (glow effects, dégradés subtils).
   - Typographie moderne et premium (Google Fonts comme *Outfit* ou *Inter*).
   - Animations fluides lors du changement de prix.

## Structure de l'Application

### Dossier `/server` (Backend)
- Serveur Express + Socket.IO.
- Base de données SQLite (`database.sqlite`).
- Routes API pour l'authentification admin et la mise à jour des prix.

### Dossier `/client` (Frontend)
- **`/` (Écran principal / TV) :** Affichage plein écran du cours de l'or, connecté via WebSocket.
- **`/admin` (Panneau Admin) :** Formulaire de mise à jour du prix, protégé par un mot de passe simple défini dans les variables d'environnement.

## Open Questions

> [!WARNING]
> J'ai besoin de vos réponses sur ces points pour finaliser l'implémentation :

1. **Sécurité Admin :** Est-ce qu'un simple mot de passe unique (définissable) pour accéder au panneau d'administration est suffisant pour vos besoins ?
2. **Historique :** Souhaitez-vous afficher d'autres informations sur l'écran de la TV (ex: variation par rapport à hier, graphique des derniers jours) ou **uniquement le prix actuel** en très grand ?
3. **Devise et Unité :** Dans quelle devise (ex: EUR, USD, MAD) et unité (ex: par gramme, par once) le prix doit-il être affiché ?

## Verification Plan

### Tests Prévus
- Lancement du serveur en local dans le dossier `c:\Users\othma\OneDrive\Bureau\SDBO\GOLD_Project`.
- Ouverture du client dans deux onglets du navigateur (simulant la TV et l'Admin).
- Mise à jour du prix dans l'onglet Admin et vérification de la mise à jour *instantanée* sur l'onglet TV, accompagnée d'une animation fluide.
- Vérification que la page `/admin` requiert bien un mot de passe.
