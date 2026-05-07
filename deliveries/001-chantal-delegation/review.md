# Review — Délégation de tâches à Chantal

## Statut global : ✅ Prêt à implémenter avec 3 points à trancher en amont

---

## Problèmes bloquants (à résoudre avant d'implémenter)

### R-01 · `Modal.js` ne supporte pas de contenu React (bloque T-12)
**Constat :** `Modal.js` utilise `dangerouslySetInnerHTML` pour le contenu et n'accepte pas de `children`. La checkbox de réassignation (T-12) ne peut pas être injectée dans une string HTML.

**Recommandation :** Étendre `Modal.js` avec un prop optionnel `children` rendu sous le `message`. La `ConfirmModal` devient :
```jsx
const ConfirmModal = ({ message, onClose, onConfirm, children }) => (
    ...
    <div dangerouslySetInnerHTML={{ __html: message }} />
    {children}
    ...
);
```
Le composant `Modal` passe `children` à `ConfirmModal`. Aucune régression sur les usages existants (pas de `children` actuellement).

---

### R-02 · Indexation `delegated_blocks` : ambiguïté frontend ↔ backend (bloque T-05 et T-11)
**Constat :** Le backend (T-05) calcule un `service_block_index` qui ne compte **que** les blocs de type `service`. Le frontend (T-11) itère sur `blocks` (tous types, pauses incluses). Si le frontend envoie l'index dans le tableau complet (ex. `[2]` pour le 3e bloc au total), le backend l'interprétera comme le 3e bloc service — décalage garanti sur les services avec pauses.

**Recommandation :** Le frontend doit envoyer l'index **parmi les blocs service uniquement**. Dans la timeline, calculer un compteur séparé :
```js
let svcIdx = 0;
blocks.map((block, i) => {
    const currentSvcIdx = block.type === 'service' ? svcIdx++ : null;
    // utiliser currentSvcIdx pour la checkbox
})
```
Documenter explicitement dans T-05 et T-11 que `delegated_blocks` est la liste des **indices parmi les blocs service** (0 = premier bloc service, 1 = deuxième bloc service, etc.).

---

## Points de vigilance (non bloquants, à garder en tête)

### R-03 · F-02 mentionne « multi-blocs » mais la checkbox doit s'afficher pour tous les services
**Constat :** La définition F-02 dit « rendez-vous multi-blocs » mais un service à un seul bloc service doit aussi pouvoir être délégué (ex. Coupe Femme = 1 bloc). La restriction « multi-blocs » est probablement un raccourci de langage.

**Recommandation :** T-11 montre déjà la checkbox pour tout bloc de type `service` — comportement correct. Aucune modification nécessaire, juste une note pour éviter toute confusion à l'implémentation.

---

### R-04 · ~~Drag & drop des blocs Chantal ne vérifie pas les conflits~~
**Résolu :** La fonctionnalité de drag & drop est supprimée entièrement (T-14). Aucune dette technique.

---

## Vérification croisée définition / clarifications / plan / tâches

| Exigence | Couverte par tâche(s) | Statut |
|----------|-----------------------|--------|
| F-01 `assignee` sur Appointment | T-01, T-02 | ✅ |
| F-02 Checkbox par bloc à la création | T-11 | ✅ (voir R-02) |
| F-03 Dispo Marie filtrée | T-04 | ✅ |
| F-03b Dispo Chantal vérifiée | T-05, T-06 | ✅ |
| F-04 Toggle calendrier | T-09 | ✅ |
| F-05 Apparence distincte blocs Chantal | T-10, T-13 | ✅ |
| F-06 Réassignation sur RDV existant | T-12 | ✅ (voir R-01) |
| F-07 Réassignation bidirectionnelle | T-06 | ✅ |
| Chantal occupée à la création → erreur 409 | T-05, T-11 | ✅ |
| Checkbox grisée si conflit | T-07, T-12 | ✅ (voir R-01) |
| Toggle coché par défaut | T-09 | ✅ |
| Rétrocompatibilité données existantes | T-01 (server_default) | ✅ |
| Migration PostgreSQL / Render | T-01 | ✅ || Suppression drag & drop | T-14 | ✅ |
---

## Résumé des actions avant implémentation

| # | Action | Tâche impactée |
|---|--------|---------------|
| R-01 | Étendre `Modal.js` avec prop `children` | T-12 (et T-12 mis à jour) |
| R-02 | Clarifier indexation service-only dans T-05 et T-11 | T-05, T-11 |
