# Definition — Délégation de tâches à Chantal

## Contexte
L'application Shear Time est utilisée par Marie, coiffeuse indépendante. Une assistante, Chantal, rejoint le salon. Certaines tâches dans un rendez-vous peuvent être déléguées à Chantal, libérant Marie pour prendre d'autres clients pendant ce temps.

## Problème
Aujourd'hui, tous les blocs d'un rendez-vous sont implicitement assignés à Marie. Il n'y a aucune notion de prestataire. Quand Chantal prend en charge une tâche, le créneau reste bloqué pour Marie alors qu'il devrait être libéré.

## Objectif
Permettre à Marie d'assigner un ou plusieurs blocs d'un rendez-vous à Chantal, afin que :
- le créneau correspondant soit libéré pour Marie,
- le travail de Chantal soit visible sur le calendrier (via un filtre dédié),
- la réassignation reste possible après création.

## Périmètre

### Inclus
1. **Délégation à la création** — Lors de la création d'un rendez-vous, Marie peut cocher quelles tâches (blocs) sont prises en charge par Chantal. Par défaut, toutes les tâches sont assignées à Marie.
2. **Libération du créneau de Marie** — Un bloc assigné à Chantal ne bloque plus la disponibilité de Marie (logique de disponibilité côté backend).
3. **Affichage filtré au calendrier** — Une case à cocher sur la page calendrier permet d'afficher ou masquer les tâches de Chantal.
4. **Réassignation sur rendez-vous existant** — On peut modifier l'assignation d'un bloc (Marie ↔ Chantal) sur un rendez-vous déjà créé.

### Exclus
- Gestion d'un profil/compte pour Chantal (pas d'authentification multi-utilisateur).
- Calendrier dédié propre à Chantal (filtrage sur le calendrier existant de Marie suffit).
- Notifications ou alertes à Chantal.
- Autres prestataires au-delà de Marie et Chantal.
- Déplacement des rendez-vous par glisser-déposer (fonctionnalité supprimée).

## Exigences fonctionnelles

| ID | Exigence |
|----|----------|
| F-01 | Chaque `Appointment` (bloc) peut avoir un attribut `assignee` valant `marie` (défaut) ou `chantal`. |
| F-02 | À la création d'un rendez-vous multi-blocs, l'UI présente chaque bloc service avec une case à cocher « Confier à Chantal ». |
| F-03 | La vérification de disponibilité (endpoint `/services/available`) ne tient compte que des blocs assignés à Marie pour calculer les conflits de Marie. |
| F-03b | Chantal a sa propre contrainte de disponibilité : on ne peut lui déléguer un bloc que si elle n'a pas déjà un bloc assigné (`assignee = chantal`) sur ce créneau. |
| F-04 | Le calendrier affiche un toggle « Afficher les tâches de Chantal » (coché par défaut). |
| F-05 | Les blocs de Chantal ont une apparence visuelle distincte sur le calendrier (ex. couleur différente ou indicateur). |
| F-06 | Sur un rendez-vous existant, une action de réassignation permet de changer l'`assignee` d'un bloc (Marie ↔ Chantal). |
| F-07 | La réassignation déclenche une mise à jour backend ; les conflits de disponibilité de Marie **et de Chantal** sont recalculés. |

## Critères d'acceptation
- Créer un RDV et déléguer un bloc à Chantal → ce créneau n'est plus bloquant pour Marie dans `/services/available`.
- Tenter de déléguer un bloc à Chantal alors qu'elle est déjà occupée sur ce créneau → l'UI signale le conflit et empêche la délégation.
- Les blocs Chantal s'affichent/disparaissent selon le toggle du calendrier.
- Modifier l'assignée d'un bloc existant fonctionne sans perte de données.
- Aucune régression sur les rendez-vous existants (sans `assignee`, comportement identique à `marie`).
