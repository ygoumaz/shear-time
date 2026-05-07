# Implementation Log — Délégation de tâches à Chantal

| Tâche | Statut | Notes |
|-------|--------|---------|
| T-01 · Migration DB | ✅ | Généré + `server_default='marie'` ajouté manuellement (SQLite) ; appliqué via `flask db upgrade` |
| T-02 · Modèle assignee | ✅ | `backend/models.py` |
| T-03 · GET serialisation | ✅ | `backend/routes.py` |
| T-04 · Dispo Marie filtrée | ✅ | `backend/routes.py` |
| T-05 · Création + dispo Chantal | ✅ | `backend/routes.py` — bugfix post-test (voir BF-01) |
| T-06 · PUT réassignation | ✅ | `backend/routes.py` |
| T-07 · Feasibility endpoint | ✅ | `backend/routes.py` |
| T-08 · api.js | ✅ | `frontend/src/api/api.js` |
| T-09 · Toggle Chantal | ✅ | `frontend/src/pages/Appointments.js` |
| T-10 · Apparence blocs Chantal | ✅ | `frontend/src/pages/Appointments.js` |
| T-11 · Checkboxes création | ✅ | `frontend/src/pages/Appointments.js` |
| T-12 · Réassignation modale | ✅ | `Appointments.js` + `Modal.js` — UX améliorée post-test (voir BF-03) |
| T-13 · CSS | ✅ | `Appointments.module.css` |
| T-14 · Supprimer drag & drop | ✅ | `frontend/src/pages/Appointments.js` |

---

## Corrections post-test

### BF-01 · Faux conflit Chantal à la création (backend)
**Symptôme :** Sur un calendrier vide, déléguer un bloc à Chantal retournait 409 « Chantal est déjà occupée » alors qu'elle ne l'était pas.
**Cause :** Le check `has_assignee_conflict` était appelé *après* `db.session.add()`. SQLAlchemy autoflush rendait les nouveaux objets visibles à la requête — ils se conflictaient avec eux-mêmes.
**Correction :** Le check de disponibilité de Chantal est maintenant fait *avant* tout `db.session.add()`, en itérant sur les blocs du service sans toucher la session.
**Fichier :** `backend/routes.py`, fonction `create_service_appointment`

### BF-02 · "Fermer" sur la modale fermait aussi le panneau de création (frontend)
**Symptôme :** Après une erreur 409, cliquer "Fermer" sur la modale fermait également le panneau latéral de création, empêchant de corriger la sélection.
**Cause :** Le handler click-outside du panneau ne distinguait pas les clics sur la modale.
**Correction :** Le handler vérifie maintenant si un élément `modalOverlay` est présent dans le DOM avant de fermer le panneau.
**Fichier :** `frontend/src/pages/Appointments.js`

### BF-03 · Bouton "Enregistrer" supprimé — sauvegarde immédiate sur la checkbox (UX)
**Changement :** La réassignation Marie ↔ Chantal dans la modale de détail se sauvegarde maintenant au moment du clic sur la checkbox, sans bouton intermédiaire. En cas d'erreur 409, la checkbox revient à son état d'origine et le message s'affiche dans la modale.
**Fichier :** `frontend/src/pages/Appointments.js`

### BF-04 · Suppression du filtrage de services à la création — tous les services toujours visibles
**Symptôme :** Si Marie avait déjà un RDV sur un créneau, les services étaient masqués dans le sélecteur de création. Impossible de créer un RDV pour Chantal sur ce créneau.
**Cause :** L'ancien design filtrait les services disponibles via `POST /services/available` (ne gardait que ceux sans conflit pour Marie). Avec la délégation à Chantal, ce filtrage était trop restrictif.
**Correction :**
- Frontend : suppression de `getAvailableServices`, de l'état `availableServices`, et du call dans `handleDateClick`. Le sélecteur utilise maintenant la liste complète des services (`services`).
- Backend : suppression de l'endpoint `POST /services/available` et de la fonction `is_service_available` (plus aucun consommateur). Le check de conflit à la création est maintenant inline et vérifie **par bloc** : Marie pour ses blocs, Chantal pour les blocs délégués. Erreur 409 avec message explicite si conflit.
**Fichiers :** `backend/routes.py`, `frontend/src/pages/Appointments.js`, `frontend/src/api/api.js`

---

## Amélioration UI — Panneau de création & détection de conflits

### UI · Résumé de l'état final

**Backend :**
- `POST /appointments/conflict-check` — endpoint read-only, vérifie les conflits par bloc avant création. Retourne `svc_idx`, `assignee`, `conflict`, `conflict_with`.

**Frontend — Détection de conflits en temps réel :**
- `checkConflicts(date, service_code, delegated_blocks)` ajoutée à `api.js`.
- Deux appels parallèles au changement de service/date : un sans délégation (Marie), un avec tous les blocs délégués (Chantal). Résultat : `blockConflicts[svc_idx] = { marie: bool, chantal: bool }`.
- Pattern cancellable dans `useEffect` pour éviter les race conditions.

**Frontend — Pills d'assignation inline :**
- Chaque carte de bloc de service contient deux pill buttons verticaux à droite ("Marie" / "Chantal"), chacun suivi d'un indicateur ✅/❌.
- Pill active : fond blanc. Pill conflictée : désactivée (opacity 0.35). Carte conflictée : bordure gauche ambre (`4px solid #ffc107`).
- Cliquer une pill la sélectionne directement (pas de toggle — sélection explicite).
- Le bouton "Ajouter rendez-vous" est désactivé si le bloc actif (Marie ou Chantal selon sélection) est en conflit.

**Frontend — Toggle "Chantal" dans le header :**
- Checkbox native remplacée par un slider CSS pur (dégradé `#667eea → #764ba2` quand actif), déplacé en haut à gauche du header. Accessible clavier (Space/Enter).

**Panel :** largeur portée à 340px.

**Fichiers modifiés :** `backend/routes.py`, `frontend/src/api/api.js`, `frontend/src/pages/Appointments.js`, `frontend/src/pages/Appointments.module.css`
