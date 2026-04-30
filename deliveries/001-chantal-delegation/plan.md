# Plan technique — Délégation de tâches à Chantal

## Vue d'ensemble

La fonctionnalité s'articule en trois couches :
1. **Base de données** — ajout d'un champ `assignee` sur `Appointment`
2. **Backend** — adaptation de la disponibilité + endpoint de réassignation
3. **Frontend** — suppression du drag & drop + UI création (cases à cocher par bloc) + toggle calendrier + pop-up réassignation

---

## 1. Base de données

### Changement de schéma
Ajouter une colonne `assignee` sur la table `appointment` :
- Type : `VARCHAR(10)`
- Valeur par défaut : `'marie'`
- Contrainte : `NOT NULL`
- Valeurs admises : `'marie'` ou `'chantal'` (contrôle applicatif côté backend)

### Rétrocompatibilité
Les enregistrements existants sans valeur reçoivent `'marie'` via la valeur par défaut SQL. Aucune donnée existante n'est affectée.

### Migration Alembic
Créer une migration Flask-Migrate qui ajoute `assignee VARCHAR(10) NOT NULL DEFAULT 'marie'` sur la table `appointment`.

---

## 2. Backend (`backend/`)

### 2a. `models.py`
Ajouter le champ `assignee` au modèle `Appointment` :
```python
assignee = db.Column(db.String(10), nullable=False, default='marie')
```

### 2b. `routes.py` — Création d'un RDV (`create_service_appointment`)
- Lire un champ optionnel `delegated_blocks` dans le payload : liste d'index de blocs (parmi les blocs de type `service`) à assigner à Chantal.
- Lors de la boucle de création des blocs, calculer l'`assignee` de chaque bloc créé.
- **Avant** de committer, vérifier la disponibilité de Chantal pour chaque bloc délégué : requêter les `Appointment` avec `assignee='chantal'` et détecter les chevauchements. Si conflit → rollback + erreur `409` avec message clair.
- Inclure `assignee` dans la réponse GET `/appointments`.

### 2c. `routes.py` — Disponibilité (`is_service_available`)
Modifier la fonction `is_service_available` pour qu'elle ne tienne compte que des blocs `assignee='marie'` lors du calcul des conflits (filtrer la requête sur `assignee='marie'`).

### 2d. `routes.py` — Réassignation (`PUT /appointments/<id>`)
Étendre l'endpoint existant pour accepter un champ `assignee` dans le payload :
- Valider que la valeur est `'marie'` ou `'chantal'`.
- **Dans les deux sens** : vérifier que le prestataire cible n'a pas de conflit sur ce créneau (hors le bloc lui-même).
  - Réassignation vers `'chantal'` → vérifier dispo de Chantal.
  - Réassignation vers `'marie'` → vérifier dispo de Marie.
- Si conflit → `409` avec message descriptif.
- Sinon → mettre à jour et retourner `200`.

### 2e. `routes.py` — Endpoint de faisabilité (`GET /appointments/<id>/assignee-feasibility`)
Nouveau endpoint léger retournant pour un bloc donné si chaque prestataire est disponible :
```json
{ "marie_available": true, "chantal_available": false }
```
Logique : requêter les blocs des deux prestataires sur le créneau du bloc (hors lui-même) et retourner les flags de disponibilité.

### 2f. Sérialisation GET `/appointments`
Ajouter `"assignee": a.assignee` dans le dictionnaire retourné pour chaque appointment.

---

## 3. Frontend (`frontend/src/`)

### 3a. `api/api.js`
- Modifier `addAppointment` pour passer le champ `delegated_blocks` (tableau d'index).
- Modifier `updateAppointment` pour pouvoir passer `assignee`.
- Ajouter `getAssigneeFeasibility(id)` : appelle `GET /appointments/:id/assignee-feasibility`.

### 3b. `pages/Appointments.js` — Création (panneau latéral)

**État local supplémentaire :**
```js
const [delegatedBlocks, setDelegatedBlocks] = useState([]);
```
Réinitialiser à `[]` à chaque ouverture du panneau.

**UI dans la timeline de service :**
Pour chaque bloc de type `service`, ajouter une case à cocher « Confier à Chantal » sous les infos du bloc. Décochée par défaut.

Quand le service change (select), réinitialiser `delegatedBlocks`.

**Soumission (`handleAddAppointment`) :**
- Passer `delegated_blocks: delegatedBlocks` dans le payload.
- Si le backend répond avec une erreur `409`, **ne pas fermer le panneau** — afficher l'erreur via la modale existante et laisser l'utilisateur corriger.

### 3c. `pages/Appointments.js` — Toggle Chantal

**État local :**
```js
const [showChantal, setShowChantal] = useState(true);
```

**Dans le rendu FullCalendar :**
Filtrer les events avant de les passer : si `showChantal === false`, exclure les appointments dont `assignee === 'chantal'`.

**Apparence visuelle des blocs Chantal :**
Dans le mapping des events, si `a.assignee === 'chantal'` :
- Ajouter `opacity: 0.55` via `extendedProps` + `eventDidMount` callback (injecter le style sur l'élément DOM).
- Modifier le `title` pour préfixer avec `« Chantal — »`.

**Toggle UI :**
Ajouter une case à cocher dans l'en-tête du calendrier (`div.header`) :
```
☑ Afficher les tâches de Chantal
```

### 3d. `pages/Appointments.js` — Pop-up de détail (réassignation)

**Une seule modale** — la modale existante (détails + suppression) est étendue avec la case à cocher. Pas de nouvelle modale.

**Approche :**
- Conserver la structure actuelle de `handleEventClick` et de la modale (`modal` state).
- Avant d'ouvrir la modale, appeler `getAssigneeFeasibility(id)` pour récupérer `{ marie_available, chantal_available }`.
- Le contenu de la modale est enrichi avec :
  - Une case à cocher « Confier à Chantal » (état initial : `appointment.assignee === 'chantal'`)
  - La case est **désactivée (grisée)** si le basculement est impossible :
    - Si actuellement `marie` et `chantal_available === false` → case désactivée (ne peut pas déléguer)
    - Si actuellement `chantal` et `marie_available === false` → case désactivée (ne peut pas rapatrier)
  - Un bouton « Enregistrer » n'apparaît que si la valeur de la case diffère de l'état actuel
  - Le bouton « Supprimer » existant est conservé tel quel
- À l'enregistrement : appeler `updateAppointment(id, { assignee })`, puis `fetchAppointments()`.
- En cas d'erreur `409` inattendue du backend : afficher le message dans la modale sans la fermer.

**Note :** La case grisée côté UI est un confort visuel. Le backend reste la source de vérité et refuse toujours via `409` en cas de conflit.

---

## 4. Flux de données

```
Création RDV
  UI (delegatedBlocks=[1]) → POST /appointments { service_code, delegated_blocks:[1] }
    → backend valide dispo Chantal
    → crée blocs avec assignee='marie'|'chantal'
    → retourne 201 ou 409

Calendrier
  GET /appointments → inclut assignee
  showChantal=false → filtre events assignee='chantal'
  showChantal=true  → affiche tous, blocs chantal en opacité réduite + label

Réassignation
  Clic bloc → GET /appointments/:id/assignee-feasibility
            → modale existante enrichie avec checkbox
            → checkbox grisée si le basculement est impossible
  Toggle case + Enregistrer → PUT /appointments/:id { assignee }
    → backend valide dispo du prestataire cible (dans les deux sens)
    → retourne 200 ou 409
```

---

## 5. Risques et points d'attention

| Risque | Mitigation |
|--------|-----------|
| `is_service_available` ignore maintenant les blocs Chantal pour Marie → créneau vide côté Marie mais Chantal occupée | Vérification Chantal séparée à la création/réassignation (F-03b) |
| Blocs existants sans `assignee` | Valeur par défaut `'marie'` en DB + migration backward-compatible |
| Réassignation vers Marie alors qu'elle est déjà prise | Vérification bidirectionnelle dans PUT + checkbox grisée en préventif via feasibility endpoint |
| Double-vérification concurrente (race condition) | Acceptable pour usage mono-utilisateur de Marie |

---

## 6. Ordre de livraison conseillé

1. Modèle `Appointment` (champ `assignee`)
2. Migration DB (générée depuis le modèle modifié)
2. Backend : sérialisation GET + disponibilité Marie
3. Backend : création avec `delegated_blocks` + vérif Chantal
4. Backend : PUT réassignation bidirectionnel + endpoint feasibility
5. Frontend : supprimer le drag & drop
6. Frontend : `api.js` (delegated_blocks, assignee, feasibility)
7. Frontend : toggle + affichage calendrier (opacité, label, filtre)
8. Frontend : cases à cocher création
9. Frontend : pop-up réassignation (checkbox + grisage + enregistrer)
