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
