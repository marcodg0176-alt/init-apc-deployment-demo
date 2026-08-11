# Journal de mise en place - APC Analytics (Demo)

Date : 2026-08-11
Compte GitHub : marcodg0176-alt

Ce document retrace la mise en place du dépôt de démonstration
`init-apc-deployment-demo` : création des fichiers du projet, tests,
dépôt GitHub, environnements protégés et déclenchement de la pipeline
CI/CD. **Le déploiement décrit dans la pipeline est entièrement
SIMULÉ** (de simples `echo`) - aucun hébergement réel n'est
contacté.

## Liens

- Dépôt GitHub : https://github.com/marcodg0176-alt/init-apc-deployment-demo
- Run de la pipeline déclenché manuellement : https://github.com/marcodg0176-alt/init-apc-deployment-demo/actions/runs/31467549245

## 1. Commandes exécutées, dans l'ordre

1. Création de l'arborescence du projet (`data/`, `src/`, `tests/`,
   `scripts/`, `migrations/`, `.github/workflows/`) et écriture de
   tous les fichiers demandés à l'identique, plus un `package.json`
   (non fourni dans la demande initiale mais nécessaire pour que les
   commandes `npm test`, `npm run report`, `npm run healthcheck`,
   `npm run migrate`, `npm run rollback` fonctionnent).
2. `npm test` -> échec au premier essai (voir section "Problèmes
   rencontrés" ci-dessous), puis succès après correction.
3. `git --version`, `gh --version`, `gh auth status` -> outils
   présents, session GitHub déjà authentifiée.
4. `git init -b main`
5. `git config user.name "marcodg0176-alt"` et
   `git config user.email "marcodg0176-alt@users.noreply.github.com"`
   (config locale au dépôt uniquement, aucune identité globale
   n'était configurée sur la machine).
6. `git add .github DEPLOYMENT_RUNBOOK.md data migrations package.json scripts src tests`
7. `git commit -m "Initial commit: APC analytics demo with CI/CD pipeline"`
8. `gh repo create init-apc-deployment-demo --public --source=. --remote=origin --push`
   -> dépôt créé, mais push refusé (voir "Problèmes rencontrés").
9. `gh auth refresh -h github.com -s workflow` (exécuté par
   l'utilisateur, flux d'autorisation interactif via navigateur).
10. `git push -u origin main` -> succès.
11. `gh api --method PUT repos/marcodg0176-alt/init-apc-deployment-demo/environments/staging`
    -> création de l'environnement "staging" sans règle de protection.
12. `gh api --method PUT repos/marcodg0176-alt/init-apc-deployment-demo/environments/production -f 'reviewers[][type]=User' -F 'reviewers[][id]=243165500'`
    -> création de l'environnement "production" avec une règle de
    reviewer obligatoire (marcodg0176-alt).
13. `gh workflow run deploy.yml --repo marcodg0176-alt/init-apc-deployment-demo`
    -> déclenchement manuel de la pipeline.
14. `gh run view 31467549245` et
    `gh api .../actions/runs/31467549245/pending_deployments`
    -> vérification que le run est bien arrêté au gate de production,
    en attente d'approbation (`current_user_can_approve: true`,
    aucune approbation donnée).

## 2. Environnements GitHub et règles

| Environnement | Règle de protection                                | Utilisation dans la pipeline                        |
|----------------|-----------------------------------------------------|-------------------------------------------------------|
| staging        | Aucune                                               | Migration + "déploiement" + health-check automatiques |
| production     | Reviewer obligatoire : marcodg0176-alt               | Migration + "déploiement" + health-check, seulement après approbation manuelle |

## 3. Explication simple de chaque étape de la pipeline (`deploy.yml`)

1. **Tests und Report** - exécute `npm test` (6 tests unitaires sur
   l'ingestion CSV et les calculs d'occupation) puis `npm run report`
   pour générer un rapport JSON à partir des données d'exemple. Si les
   tests échouent, la pipeline s'arrête ici : rien n'est jamais migré
   ou "déployé" sur du code cassé.
2. **Migration - Staging** - applique les migrations SQL en attente
   (`npm run migrate -- up --env=staging`) sur l'environnement
   staging. Chaque migration a un script inverse (`*.down.sql`) pour
   pouvoir être annulée.
3. **Deploy und Health-Check - Staging** - simule un déploiement
   (`echo`) puis exécute `npm run healthcheck`, qui vérifie que le
   rapport généré est cohérent (données présentes, pas d'erreurs
   d'ingestion, structure complète). Un health-check en échec ferait
   échouer ce job et bloquerait la suite.
4. **Migration - Produktion** - même principe que l'étape 2, mais sur
   l'environnement production. Comme "production" a une règle de
   reviewer obligatoire, ce job **attend une approbation manuelle**
   avant de s'exécuter - c'est le "gate" mentionné dans la demande.
5. **Deploy und Health-Check - Produktion** - identique à l'étape 3,
   mais sur production. C'est la dernière étape de la pipeline.

Un workflow séparé, `rollback.yml`, peut être déclenché manuellement
(`workflow_dispatch`) en cas de problème : il exécute
`npm run rollback` (réactive la version précédente dans
`scripts/release-history.json`), puis
`npm run migrate -- down --env=production` (annule la dernière
migration via son script `*.down.sql`), puis relance un health-check.

## 4. État actuel du run déclenché

Run `31467549245` (déclenché via `workflow_dispatch`) :

- ✅ Tests und Report
- ✅ Migration - Staging
- ✅ Deploy und Health-Check - Staging
- ⏸ Migration - Produktion -> **en attente d'approbation manuelle**
  sur l'environnement "production" (non approuvé, conformément à la
  consigne de ne pas approuver moi-même)
- ⏳ Deploy und Health-Check - Produktion -> pas encore atteint

## 5. Problèmes rencontrés et résolutions

### a) `npm test` échouait sur cette machine

La commande initiale du script `test` était `node --test tests/`.
Sur cette machine (Node.js v24.18.0, Windows), passer un **répertoire**
à `node --test` échoue avec
`Error: Cannot find module '...\tests'` au lieu de découvrir les
fichiers de test du dossier. En listant les fichiers explicitement
(`node --test tests/ingest.test.js tests/aggregate.test.js`), les 6
tests passaient sans problème.

Je me suis arrêté et j'ai signalé l'erreur avant de continuer, comme
demandé. Après confirmation, j'ai corrigé le script dans
`package.json` en `node --test tests/*.test.js` (glob explicite), ce
qui fonctionne de manière fiable ici et fonctionnera également sur
les runners GitHub Actions (Ubuntu). Résultat final : **6 tests
passés, 0 échec**.

### b) Aucune identité Git configurée

Ni `git config user.name` ni `user.email` n'étaient définis (ni en
local, ni en global) sur cette machine, ce qui aurait empêché tout
commit. Je vous ai demandé comment procéder ; vous avez choisi
d'utiliser le nom d'utilisateur GitHub et l'adresse "noreply"
associée. Cette identité a été configurée **localement pour ce dépôt
uniquement** (pas de modification de la configuration Git globale).

### c) Push refusé : jeton sans le scope `workflow`

Le premier `gh repo create ... --push` a bien créé le dépôt GitHub,
mais le push a été refusé par GitHub :

```
! [remote rejected] HEAD -> main (refusing to allow an OAuth App to
  create or update workflow `.github/workflows/deploy.yml` without
  `workflow` scope)
```

Le jeton `gh` en place n'avait que les scopes `gist, read:org, repo`,
ce qui est insuffisant pour pousser des fichiers dans
`.github/workflows/`. Je vous ai demandé d'exécuter vous-même (flux
interactif nécessitant une approbation dans le navigateur) :

```
gh auth refresh -h github.com -s workflow
```

Une fois le scope `workflow` ajouté, `git push -u origin main` a
réussi.

## 6. Principes respectés

- Le dépôt est public, comme demandé.
- Aucune approbation du gate "production" n'a été effectuée par moi -
  le run reste en attente.
- Aucune configuration Git globale n'a été modifiée (identité définie
  en local au dépôt uniquement).
- Le déploiement est intégralement simulé (`echo`), aucun système
  d'hébergement réel n'est impliqué.
