# Clarifications — Délégation de tâches à Chantal

## Q1 — Granularité de la délégation
**Réponse :** La délégation se fait au niveau du **bloc individuel**. Pour un service avec 3 blocs service, chaque bloc est indépendamment assignable à Chantal.

## Q2 — Conflit Chantal à la création
**Réponse :** Si Chantal est déjà occupée sur un bloc qu'on souhaite lui déléguer, **la création du RDV entier est bloquée**. Un message d'erreur est affiché et l'utilisateur peut modifier sa sélection (décocher ce bloc) avant de resoumettre. Le formulaire reste ouvert.

## Q3 — Apparence visuelle des blocs Chantal
**Réponse :**
- La **couleur** du bloc reste identique à celle du service (pas de changement de teinte).
- L'**opacité** est légèrement réduite pour le rendre plus discret.
- Un **label « Chantal »** est ajouté quelque part sur le bloc du calendrier pour indiquer clairement l'assignée.

## Q4 — Toggle calendrier : état par défaut
**Réponse :** Le toggle « Afficher les tâches de Chantal » est **coché par défaut** (blocs Chantal visibles au chargement).

## Q5 — Réassignation sur rendez-vous existant
**Réponse :** La réassignation se fait **bloc par bloc**, via la pop-up de détail déjà existante. Une **case à cocher « Confier à Chantal »** est ajoutée sur cette pop-up. Elle reflète l'état actuel du bloc (cochée si `assignee = chantal`, décochée si `assignee = marie`). La modification est soumise individuellement pour ce bloc uniquement.
