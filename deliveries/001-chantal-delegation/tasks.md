# Tasks — Délégation de tâches à Chantal

## T-01 · Migration DB — ajout colonne `assignee`
**Fichier cible :** `backend/migrations/versions/<nouveau_fichier>.py` (généré par Flask-Migrate)

**Contexte Render/PostgreSQL :** La DB est hébergée sur Render (PostgreSQL). La procédure correcte est :
1. Générer la migration **en local** (contre la DB locale ou la DB Render via `DATABASE_URL`).
2. Commiter le fichier généré dans git.
3. Appliquer sur Render après déploiement.

**Étape 1 — Générer la migration en local**
Depuis le dossier `backend/`, exécuter :
```
flask db migrate -m "add assignee to appointment"
```
Vérifier que le fichier généré dans `migrations/versions/` contient bien :
```python
op.add_column('appointment', sa.Column('assignee', sa.String(10), nullable=False, server_default='marie'))
```
Et dans le downgrade :
```python
op.drop_column('appointment', 'assignee')
```

**Étape 2 — Tester en local**
```
flask db upgrade
```
Vérifier que la colonne est bien créée sur la DB locale.

**Étape 3 — Commiter et pousser**
```
git add migrations/versions/<fichier_généré>.py
git commit -m "migration: add assignee to appointment"
git push
```

**Étape 4 — Appliquer sur Render**
Deux options :
- **Option A (recommandée)** : dans les paramètres du service Render, définir la commande de démarrage comme `flask db upgrade && gunicorn ...` — la migration s'applique automatiquement à chaque déploiement.
- **Option B** : après déploiement, ouvrir le Shell Render (onglet "Shell" dans le dashboard du service) et exécuter `flask db upgrade` manuellement.

**Validation :** La table `appointment` sur Render contient la colonne `assignee`. Les enregistrements existants ont `assignee = 'marie'`.

---

## T-02 · Modèle — champ `assignee` sur `Appointment`
**Fichier cible :** `backend/models.py`

**Action :**
Dans la classe `Appointment`, après la ligne `block_index`, ajouter :
```python
assignee = db.Column(db.String(10), nullable=False, default='marie')
```

**Validation :** Aucune erreur au démarrage de Flask.

---

## T-03 · Backend — exposer `assignee` dans GET `/appointments`
**Fichier cible :** `backend/routes.py`

**Action :**
Dans la list comprehension de `GET /appointments` (fonction `appointments`), ajouter `"assignee": a.assignee` au dictionnaire retourné pour chaque appointment.

**Validation :** `GET /appointments` retourne bien le champ `assignee` pour chaque entrée.

---

## T-04 · Backend — filtrer disponibilité Marie sur ses propres blocs
**Fichier cible :** `backend/routes.py`, fonction `is_service_available`

**Action :**
Remplacer la requête `Appointment.query.all()` par :
```python
all_appointments = Appointment.query.filter_by(assignee='marie').all()
```

**Validation :** Un bloc assigné à Chantal ne bloque plus la disponibilité de Marie dans `/services/available`.

---

## T-05 · Backend — création avec `delegated_blocks` et vérif dispo Chantal
**Fichier cible :** `backend/routes.py`, fonction `create_service_appointment`

**Action :**
1. Lire `delegated_blocks = data.get('delegated_blocks', [])` en début de fonction. C'est une liste d'**indices parmi les blocs de type `service` uniquement** (0 = premier bloc service, 1 = deuxième bloc service, etc. — les pauses ne sont pas comptées). Exemple : pour un service [service, pause, service], `delegated_blocks: [1]` désigne le second bloc service.

2. Avant le commit, pour chaque bloc dont l'`assignee` sera `'chantal'`, vérifier qu'elle n'a pas de conflit :
```python
def has_assignee_conflict(assignee, start_time, duration_minutes, exclude_id=None):
    q = Appointment.query.filter_by(assignee=assignee)
    if exclude_id:
        q = q.filter(Appointment.id != exclude_id)
    for appt in q.all():
        appt_end = appt.date + timedelta(minutes=appt.duration_minutes)
        end_time = start_time + timedelta(minutes=duration_minutes)
        if appt.date < end_time and appt_end > start_time:
            return True
    return False
```
Placer cette fonction helper dans `routes.py` (au niveau module, avant les routes).

3. Dans la boucle des blocs, calculer l'`assignee` :
```python
# service_block_index tracks how many service blocks we've seen so far
assignee = 'chantal' if service_block_index in delegated_blocks else 'marie'
```
Incrémenter `service_block_index` pour chaque bloc de type `service`.

4. Avant `db.session.commit()`, vérifier les conflits Chantal :
```python
for appt in appointments_created:
    if appt.assignee == 'chantal' and has_assignee_conflict('chantal', appt.date, appt.duration_minutes):
        db.session.rollback()
        return jsonify({"error": "Chantal est déjà occupée sur ce créneau."}), 409
```

5. Passer `assignee=assignee` lors de la construction de chaque `Appointment`.

**Validation :** Créer un RDV avec `delegated_blocks:[0]` → le 1er bloc service a `assignee='chantal'`. Créer un 2e RDV en déléguant le même créneau à Chantal → réponse `409`.

---

## T-06 · Backend — PUT réassignation bidirectionnelle
**Fichier cible :** `backend/routes.py`, fonction `update_appointment`

**Action :**
Après le bloc existant qui gère `'date'`, ajouter :
```python
if 'assignee' in data:
    new_assignee = data['assignee']
    if new_assignee not in ('marie', 'chantal'):
        return jsonify({"error": "Valeur assignee invalide."}), 400
    if has_assignee_conflict(new_assignee, appointment.date, appointment.duration_minutes, exclude_id=appointment.id):
        name = 'Chantal' if new_assignee == 'chantal' else 'Marie'
        return jsonify({"error": f"{name} est déjà occupée sur ce créneau."}), 409
    appointment.assignee = new_assignee
```

**Validation :** PUT avec `{ "assignee": "chantal" }` sur un bloc → 200 si libre, 409 si Chantal occupée. Idem pour `"marie"`.

---

## T-07 · Backend — endpoint `GET /appointments/<id>/assignee-feasibility`
**Fichier cible :** `backend/routes.py`

**Action :**
Ajouter une nouvelle route après `update_appointment` :
```python
@api_blueprint.route('/appointments/<int:appointment_id>/assignee-feasibility', methods=['GET'])
def assignee_feasibility(appointment_id):
    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Appointment not found"}), 404
    marie_available = not has_assignee_conflict('marie', appointment.date, appointment.duration_minutes, exclude_id=appointment_id)
    chantal_available = not has_assignee_conflict('chantal', appointment.date, appointment.duration_minutes, exclude_id=appointment_id)
    return jsonify({"marie_available": marie_available, "chantal_available": chantal_available})
```

**Validation :** `GET /appointments/1/assignee-feasibility` retourne `{ "marie_available": true/false, "chantal_available": true/false }`.

---

## T-08 · Frontend API — nouveaux appels dans `api.js`
**Fichier cible :** `frontend/src/api/api.js`

**Action :**
1. Dans `addAppointment`, le payload existant est déjà passé tel quel — rien à changer côté fonction, le composant passera `delegated_blocks` dans l'objet.

2. `updateAppointment` existe déjà et passe le payload tel quel — même logique, rien à changer.

3. Ajouter à la fin du fichier :
```js
export const getAssigneeFeasibility = async (id) => {
    const res = await fetch(`${API_URL}/appointments/${id}/assignee-feasibility`);
    return res.json();
};
```

4. Dans `Appointments.js`, ajouter `getAssigneeFeasibility` à l'import depuis `../api/api`.

**Validation :** Pas d'erreur d'import dans la console du navigateur.

---

## T-09 · Frontend — toggle « Afficher les tâches de Chantal »
**Fichier cible :** `frontend/src/pages/Appointments.js`

**Action :**
1. Ajouter l'état : `const [showChantal, setShowChantal] = useState(true);`

2. Dans le `div.header` (juste avant ou après le bouton « Liste des clients »), ajouter :
```jsx
<label className={styles.chantalToggle}>
    <input
        type="checkbox"
        checked={showChantal}
        onChange={(e) => setShowChantal(e.target.checked)}
    />
    Afficher les tâches de Chantal
</label>
```

3. Dans le mapping `events={[...appointments.map(...)]}`, filtrer avant le map :
```js
appointments
    .filter(a => showChantal || a.assignee !== 'chantal')
    .map((a) => { ... })
```

**Validation :** Décocher le toggle masque les blocs Chantal du calendrier.

---

## T-10 · Frontend — apparence visuelle des blocs Chantal
**Fichier cible :** `frontend/src/pages/Appointments.js`

**Action :**
Dans le `.map()` qui construit les events FullCalendar, modifier la construction du `title` et ajouter `classNames` pour les blocs Chantal :

```js
const isChantal = a.assignee === 'chantal';

// Préfixer le titre si Chantal
if (isChantal) {
    title = `Chantal — ${title}`;
}

return {
    id: a.id,
    title,
    start: new Date(a.date),
    end: new Date(new Date(a.date).getTime() + a.duration_minutes * 60000),
    backgroundColor: eventColor,
    borderColor: eventColor,
    classNames: isChantal ? ['chantal-block'] : []
};
```

Dans `Appointments.module.css`, ajouter :
```css
:global(.chantal-block) {
    opacity: 0.55;
}
```

**Validation :** Les blocs Chantal sont légèrement transparents et préfixés « Chantal — » dans le calendrier.

---

## T-11 · Frontend — cases à cocher « Confier à Chantal » à la création
**Fichier cible :** `frontend/src/pages/Appointments.js`

**Action :**
1. Ajouter l'état : `const [delegatedBlocks, setDelegatedBlocks] = useState([]);`

2. Dans `handleDateClick`, réinitialiser : `setDelegatedBlocks([]);`

3. Réinitialiser aussi dans le `onChange` du select service : ajouter `setDelegatedBlocks([]);` quand `service_code` change.

4. Dans la timeline des blocs (le `.map()` sur `availableServices[...].blocks`), pour les blocs de type `service` uniquement, ajouter après les infos du bloc.

   **Important (R-02) :** `delegated_blocks` utilise les indices **parmi les blocs service uniquement**. Calculer un compteur séparé :
```jsx
{(() => {
    let svcIdx = 0;
    return blocks.map((block, i) => {
        const currentSvcIdx = block.type === 'service' ? svcIdx++ : null;
        return (
            <div key={i}>
                {/* ... infos bloc existantes ... */}
                {block.type === 'service' && (
                    <label className={styles.chantalCheckbox}>
                        <input
                            type="checkbox"
                            checked={delegatedBlocks.includes(currentSvcIdx)}
                            onChange={(e) => {
                                setDelegatedBlocks(prev =>
                                    e.target.checked
                                        ? [...prev, currentSvcIdx]
                                        : prev.filter(i => i !== currentSvcIdx)
                                );
                            }}
                        />
                        Confier à Chantal
                    </label>
                )}
            </div>
        );
    });
})()}
```

5. Dans `handleAddAppointment`, modifier le payload :
```js
await addAppointment({ customer_id, date, service_code, delegated_blocks: delegatedBlocks });
```

6. Si la réponse est une erreur `409` : afficher via la modale existante **sans fermer le panneau**. Modifier le `catch` ou vérifier le status de la réponse avant de fermer.

**Validation :** Cocher « Confier à Chantal » sur un bloc → le bloc créé a `assignee='chantal'`. Déléguer sur un créneau pris → panneau reste ouvert avec message d'erreur.

---

## T-12 · Frontend — réassignation dans la modale de détail existante
**Fichier cible :** `frontend/src/pages/Appointments.js`

**Action :**
1. Ajouter l'état :
```js
const [modalAssignee, setModalAssignee] = useState(null);
const [modalFeasibility, setModalFeasibility] = useState({ marie_available: true, chantal_available: true });
const [modalAppointmentId, setModalAppointmentId] = useState(null);
```

2. Dans `handleEventClick`, après avoir trouvé l'`appointment`, appeler la feasibility **avant** d'ouvrir la modale :
```js
const feasibility = await getAssigneeFeasibility(appointmentId);
setModalFeasibility(feasibility);
setModalAssignee(appointment.assignee);
setModalAppointmentId(appointmentId);
```

3. Dans le contenu `message` de la modale, **remplacer la chaîne HTML statique par du JSX** (la modale doit accepter du JSX ou un composant). Si la modale actuelle n'accepte que des strings HTML (`dangerouslySetInnerHTML`), passer par un état React séparé pour la checkbox plutôt que de l'intégrer dans la string.

   Approche la plus simple avec la modale existante : ajouter un **second état géré en dehors de la modale** et rendre la checkbox directement dans `Appointments.js` sous la modale, visible uniquement quand la modale est ouverte avec un `appointmentId`. Ou vérifier si `Modal.js` peut accepter des `children`.

4. La checkbox doit être :
   - Cochée si `modalAssignee === 'chantal'`
   - Désactivée si :
     - `modalAssignee === 'marie'` et `modalFeasibility.chantal_available === false`
     - `modalAssignee === 'chantal'` et `modalFeasibility.marie_available === false`

5. Un bouton « Enregistrer » n'apparaît que si `modalAssignee` diffère de `appointment.assignee`.

6. Au clic « Enregistrer » :
```js
const res = await updateAppointment(modalAppointmentId, { assignee: modalAssignee });
if (res.error) {
    // afficher l'erreur sans fermer
} else {
    setModal({ open: false, ... });
    await fetchAppointments();
}
```

**Dépendance (R-01) :** `Modal.js` utilise `dangerouslySetInnerHTML` et n'accepte pas de `children` actuellement. Avant d'implémenter T-12, étendre `Modal.js` en ajoutant un prop optionnel `children` rendu après le `message` dans `ConfirmModal` (et passé depuis `Modal`). Les usages existants ne sont pas affectés (pas de `children` transmis aujourd'hui).

**Validation :** Cliquer un bloc Chantal → case cochée. Décocher → bouton Enregistrer apparaît. Enregistrer → bloc passe à Marie dans le calendrier.

---

## T-13 · CSS — styles pour les nouveaux éléments UI
**Fichier cible :** `frontend/src/pages/Appointments.module.css`

**Action :**
Ajouter les classes nécessaires pour :
- `.chantalToggle` — style du label/checkbox du toggle dans l'en-tête (alignement avec le bouton existant)
- `.chantalCheckbox` — style de la case « Confier à Chantal » dans la timeline de création
- `:global(.chantal-block)` — opacité 0.55 pour les blocs Chantal dans FullCalendar (déjà mentionné en T-10)

Le style doit rester cohérent avec le CSS Module existant.

---

## T-14 · Frontend — supprimer le drag & drop
**Fichier cible :** `frontend/src/pages/Appointments.js`

**Action :**
1. Sur le composant `<FullCalendar>`, passer `editable={false}` (ou supprimer la prop, sa valeur par défaut est `false`).
2. Supprimer la prop `eventDrop={handleEditEvent}`.
3. Supprimer la fonction `handleEditEvent` entière.

**Validation :** Les blocs du calendrier ne sont plus déplaçables par glisser-déposer.

---

## Ordre d'exécution et dépendances

```
T-01 (migration)
  └─ T-02 (modèle)
       └─ T-03 (GET serialisation)
       └─ T-04 (dispo Marie)
       └─ T-05 (création + dispo Chantal)  ← dépend helper has_assignee_conflict
       └─ T-06 (PUT réassignation)          ← dépend helper has_assignee_conflict
       └─ T-07 (feasibility endpoint)       ← dépend helper has_assignee_conflict
            └─ T-08 (api.js)
                 └─ T-09 (toggle)
                 └─ T-10 (apparence)
                 └─ T-11 (création UI)      ← dépend T-05
                 └─ T-12 (réassignation UI) ← dépend T-06, T-07, T-08
                      └─ T-13 (CSS)
T-14 (supprimer drag & drop)               ← indépendant, peut être fait en premier
```
