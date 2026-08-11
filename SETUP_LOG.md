# Journal de mise en place - APC Analytics (Demo)

Date : 2026-08-11
Compte GitHub : marcodg0176-alt

Ce document retrace, de bout en bout, la mise en place du dépôt de
démonstration `init-apc-deployment-demo` : création des fichiers du
projet, tests, dépôt GitHub, environnements protégés, déclenchement de
la pipeline CI/CD jusqu'en production, et nettoyage des warnings.

**Rappel important : le "déploiement" décrit dans cette pipeline est
entièrement SIMULÉ** (de simples commandes `echo` dans les jobs
`Deploy und Health-Check`). Aucun hébergement réel, aucun serveur de
production, aucune base de données réelle n'est contacté à un moment
quelconque de ce projet. C'est un exercice de démonstration pour
illustrer une pipeline de déploiement (tests -> migration -> deploy ->
health-check -> gate manuel -> migration -> deploy -> health-check) et
un mécanisme de rollback.

## Liens

- Dépôt GitHub : https://github.com/marcodg0176-alt/init-apc-deployment-demo
- Run de la pipeline allé jusqu'en production (vert de bout en bout) :
  https://github.com/marcodg0176-alt/init-apc-deployment-demo/actions/runs/31467549245

## 1. Commandes exécutées, dans l'ordre

**Création du projet et tests locaux**

1. Création de l'arborescence (`data/`, `src/`, `tests/`, `scripts/`,
   `migrations/`, `.github/workflows/`) et écriture de tous les
   fichiers du projet, plus un `package.json` (non fourni au départ
   mais nécessaire pour que `npm test`, `npm run report`,
   `npm run healthcheck`, `npm run migrate`, `npm run rollback`
   fonctionnent).
2. `npm test` -> échec au premier essai (voir "Problèmes rencontrés",
   point a).
3. Correction du script `test` dans `package.json`, puis `npm test`
   -> succès, **6 tests passés, 0 échec**.

**Outils et identité Git**

4. `git --version`, `gh --version`, `gh auth status` -> outils
   présents, session GitHub déjà authentifiée (scopes initiaux :
   `gist`, `read:org`, `repo`).
5. `git init -b main`
6. `git config user.name "marcodg0176-alt"` et
   `git config user.email "marcodg0176-alt@users.noreply.github.com"`
   (configuration **locale au dépôt uniquement** ; aucune identité
   Git globale n'était définie sur la machine, et je n'ai pas touché
   à la config globale).
7. `git add .github DEPLOYMENT_RUNBOOK.md data migrations package.json scripts src tests`
8. `git commit -m "Initial commit: APC analytics demo with CI/CD pipeline"`

**Création du dépôt GitHub et premier push**

9. `gh repo create init-apc-deployment-demo --public --source=. --remote=origin --push`
   -> le dépôt est créé, mais le push est refusé (voir "Problèmes
   rencontrés", point b).
10. `gh auth refresh -h github.com -s workflow` (exécuté par vous-même,
    flux d'autorisation interactif via navigateur, pour ajouter le
    scope `workflow` manquant).
11. `git push -u origin main` -> succès.

**Environnements GitHub**

12. `gh api --method PUT repos/marcodg0176-alt/init-apc-deployment-demo/environments/staging`
    -> création de l'environnement "staging", sans règle de
    protection.
13. `gh api --method PUT repos/marcodg0176-alt/init-apc-deployment-demo/environments/production -f 'reviewers[][type]=User' -F 'reviewers[][id]=243165500'`
    -> création de l'environnement "production" avec une règle de
    reviewer obligatoire (vous-même, marcodg0176-alt).

**Déclenchement et suivi de la pipeline**

14. `gh workflow run deploy.yml --repo marcodg0176-alt/init-apc-deployment-demo`
    -> déclenchement manuel de la pipeline (run `31467549245`).
15. `gh run view 31467549245` et
    `gh api .../actions/runs/31467549245/pending_deployments`
    -> vérification que le run s'était bien arrêté au gate de
    production, en attente d'approbation, sans qu'aucune approbation
    n'ait été donnée par moi.
16. Rédaction et commit d'une première version de `SETUP_LOG.md`,
    poussée sur `main` (ce push a lui-même redéclenché
    automatiquement la pipeline sur un nouveau run, comme prévu par
    la configuration `on: push: branches: [main]`).
17. **Vous avez approuvé manuellement le gate de production** dans
    l'interface GitHub sur le run `31467549245`.
18. `gh run list` puis `gh run view 31467549245` -> confirmation que
    ce run est passé **"success" de bout en bout**, les 5 jobs verts
    (Tests, Migration Staging, Deploy+Health-Check Staging, Migration
    Production, Deploy+Health-Check Production).

**Nettoyage des warnings Node.js 20**

19. Modification de `node-version: 20` -> `node-version: 24` dans
    `.github/workflows/deploy.yml` et `.github/workflows/rollback.yml`
    (les runners GitHub forçaient déjà l'exécution sur Node 24 et
    signalaient Node 20 comme déprécié dans les logs).
20. `git add .github/workflows/deploy.yml .github/workflows/rollback.yml`
21. `git commit -m "Bump Actions runners from Node.js 20 to 24"`
22. `git push origin main` -> succès (redéclenche également
    automatiquement la pipeline sur un nouveau run).
23. Mise à jour de ce fichier `SETUP_LOG.md` avec l'historique complet,
    puis commit et push sur `main`.

## 2. Environnements GitHub et règles de protection

| Environnement | Règle de protection                    | Rôle dans la pipeline                                                    |
|----------------|-----------------------------------------|---------------------------------------------------------------------------|
| staging        | Aucune                                  | Migration + "déploiement" simulé + health-check, entièrement automatiques |
| production     | Reviewer obligatoire : marcodg0176-alt  | Migration + "déploiement" simulé + health-check, uniquement après approbation manuelle du reviewer |

## 3. Ce que fait chaque étape de la pipeline (`deploy.yml`), en clair

La pipeline se déclenche automatiquement à chaque push sur `main`, ou
manuellement via `workflow_dispatch`. Elle enchaîne 5 jobs, chacun
dépendant du succès du précédent (`needs:`) :

1. **Tests und Report** - installe Node.js, exécute `npm test` (les 6
   tests unitaires qui vérifient le parsing du CSV APC et les calculs
   d'occupation/anomalies), puis `npm run report` pour générer un
   rapport JSON à partir des données d'exemple. C'est la porte
   d'entrée : si un test échoue, tout s'arrête ici et rien n'est
   jamais migré ou "déployé" sur du code cassé.
2. **Migration - Staging** - applique les migrations SQL en attente
   sur l'environnement staging (`npm run migrate -- up --env=staging`).
   Chaque migration a un script inverse (`*.down.sql`) prêt à
   l'emploi, donc rien n'est appliqué sans plan de retour arrière.
3. **Deploy und Health-Check - Staging** - simule un déploiement (un
   simple `echo`, aucun vrai serveur), puis exécute
   `npm run healthcheck`, qui revérifie que le rapport généré est
   cohérent (des données sont présentes, aucune erreur d'ingestion,
   la structure du rapport est complète). Si le health-check échoue,
   ce job échoue et bloque la suite.
4. **Migration - Produktion** - même logique que l'étape 2, mais sur
   l'environnement production. Comme "production" a une règle de
   reviewer obligatoire, ce job **se met en pause et attend une
   approbation manuelle** avant de s'exécuter : c'est le "gate" qui
   empêche tout déploiement en production sans qu'un humain ait
   explicitement validé le passage.
5. **Deploy und Health-Check - Produktion** - identique à l'étape 3,
   mais sur l'environnement production. C'est la dernière étape :
   quand elle passe, la pipeline est verte de bout en bout.

Un workflow séparé, `rollback.yml`, peut être déclenché manuellement à
tout moment (`workflow_dispatch`, avec un champ texte pour indiquer la
raison) en cas de problème détecté après un déploiement : il exécute
`npm run rollback` (réactive la version précédente d'après
`scripts/release-history.json`), puis
`npm run migrate -- down --env=production` (annule la dernière
migration via son script `*.down.sql`), puis relance un health-check
pour confirmer que le retour en arrière a bien remis le système dans
un état sain.

## 4. Résultat final du run allé jusqu'en production

Run `31467549245` (déclenché via `workflow_dispatch`) :

- ✅ Tests und Report
- ✅ Migration - Staging
- ✅ Deploy und Health-Check - Staging
- ✅ Migration - Produktion (débloqué après votre approbation manuelle
  du gate)
- ✅ Deploy und Health-Check - Produktion

**Statut global : success, de bout en bout.**

## 5. Problèmes rencontrés et résolutions

### a) `npm test` échouait sur cette machine

Le script `test` initial était `node --test tests/`. Sur cette machine
(Node.js v24.18.0, Windows), passer un **répertoire** à `node --test`
échouait avec `Error: Cannot find module '...\tests'` au lieu de
découvrir les fichiers de test qu'il contient - un comportement
constaté aussi bien en Git Bash qu'en PowerShell, donc pas un artefact
d'un shell en particulier. En listant les fichiers explicitement
(`node --test tests/ingest.test.js tests/aggregate.test.js`), les 6
tests passaient sans aucun problème : le code des tests n'était pas en
cause.

Conformément à la consigne ("s'il y a la moindre différence, arrête-toi
et montre-moi l'erreur"), je me suis arrêté et j'ai montré l'erreur
avant de continuer. Après votre confirmation, j'ai corrigé le script
dans `package.json` en `node --test tests/*.test.js` (glob explicite
des fichiers de test), qui fonctionne de manière fiable ici et
continuera de fonctionner sur les runners GitHub Actions (Ubuntu).

### b) Push refusé : jeton `gh` sans le scope `workflow`

`gh repo create ... --push` a bien créé le dépôt GitHub, mais le push
du premier commit (qui contient `.github/workflows/*.yml`) a été
rejeté par GitHub :

```
! [remote rejected] HEAD -> main (refusing to allow an OAuth App to
  create or update workflow `.github/workflows/deploy.yml` without
  `workflow` scope)
```

Le jeton `gh` en place n'avait que les scopes `gist`, `read:org` et
`repo` - insuffisant pour pousser des modifications dans
`.github/workflows/`. C'est une restriction de sécurité de GitHub, pas
un bug. Vous avez exécuté vous-même (l'opération nécessite une
approbation interactive dans le navigateur, donc je ne pouvais pas la
faire à votre place) :

```
gh auth refresh -h github.com -s workflow
```

Une fois le scope `workflow` ajouté au jeton, `git push -u origin main`
a réussi immédiatement.

## 6. Principes respectés tout au long de la mise en place

- Le dépôt est public, comme demandé, et son nom correspond exactement
  à `init-apc-deployment-demo`.
- Le gate de production n'a jamais été approuvé par moi - seule votre
  approbation manuelle dans l'interface GitHub a permis au run
  `31467549245` de continuer jusqu'en production.
- Aucune configuration Git globale n'a été modifiée : l'identité de
  commit est définie localement, pour ce dépôt uniquement.
- Le déploiement reste, à chaque étape, entièrement simulé (`echo`) :
  aucun système d'hébergement réel n'a été connecté ou configuré.
