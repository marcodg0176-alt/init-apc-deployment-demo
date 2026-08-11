# APC Analytics - Deployment-Demo

## Ziel des Projekts

Dieses Repository zeigt beispielhaft eine vollständige
Deployment-Pipeline für eine Data-Analytics-Anwendung im
ÖPNV-Umfeld: von automatisierten Tests über Datenbank-Migrationen mit
Rollback-Pfad bis zum kontrollierten Rollout auf Staging und
Produktion, inklusive Health-Checks und einem separaten
Rollback-Workflow. Fachlich verarbeitet die Anwendung Rohdaten der
automatischen Fahrgastzählung (APC) - CSV-Exporte mit Ein- und
Aussteigern je Haltestelle - und berechnet daraus Auslastung je Fahrt
sowie Anomalien wie eine rechnerisch negative Besetzung.

## Bezug zur Stellenausschreibung (Software Deployment Engineer | Data Analytics, INIT SE)

Die Ausschreibung nennt vier Kernaufgaben; dieses Projekt bildet jede
davon in kleinem Maßstab ab:

- **Planung von Deployments und Rollout auf Kundensystemen** ->
  `DEPLOYMENT_RUNBOOK.md` beschreibt den Ablauf von der Vorbereitung
  über Staging bis zur Freigabe für Produktion, inklusive
  Wartungsfenster- und Freigabe-Logik.
- **Koordination von Software-Migrationen** -> `migrations/` enthält
  versionierte SQL-Migrationen mit passendem `*.down.sql` je Schritt;
  `migrations/migrate.js` verwaltet den Anwendungsstatus je Umgebung
  (`status` / `up` / `down`).
- **Funktionstests der ausgelieferten Software und Fehleranalyse
  anhand des Codes** -> `tests/` deckt Ingest-Parsing und
  Auslastungsberechnung ab; `scripts/healthcheck.js` prüft nach jedem
  simulierten Deployment automatisiert, ob der generierte Report
  strukturell und inhaltlich plausibel ist.
- **Automatisierung von Deployment-Prozessen** -> die gesamte Kette
  (Test -> Migration Staging -> Deploy+Health-Check Staging ->
  manuelles Freigabe-Gate -> Migration Produktion ->
  Deploy+Health-Check Produktion) läuft als GitHub-Actions-Workflow;
  ein zweiter Workflow automatisiert das Rollback.

## Architektur (Kurzüberblick)

```
data/sample-apc-records.csv
        |
        v
src/ingest.js        - CSV parsen, Zeilenfehler statt Abbruch sammeln
        |
        v
src/aggregate.js      - kumulierte Auslastung je Fahrt, Anomalie-
                         Erkennung, stündliches Fahrgastvolumen je Linie
        |
        v
src/report.js         - Tagesreport (JSON) aus Ingest- und
                         Aggregationsergebnissen zusammensetzen
        |
        v
scripts/generate-report.js / scripts/healthcheck.js
                       - Report erzeugen bzw. als Health-Check bewerten

migrations/            - versionierte Schema-Änderungen (up/down) je Umgebung
scripts/rollback.js    - vorherige Version aus release-history.json reaktivieren
```

## Was die Pipeline macht (`.github/workflows/deploy.yml`)

Ausgelöst bei jedem Push auf `main` oder manuell per
`workflow_dispatch`:

1. **Tests und Report** - `npm test` (Unit-Tests für Ingest und
   Aggregation), danach `npm run report`. Schlägt dieser Schritt fehl,
   bricht die Pipeline ab.
2. **Migration Staging** - wendet ausstehende Migrationen auf der
   Staging-Umgebung an.
3. **Deploy + Health-Check Staging** - simuliertes Deployment
   (`echo`, keine reale Infrastruktur), danach `npm run healthcheck`.
4. **Migration Produktion** - läuft erst nach manueller Freigabe
   durch einen Reviewer im GitHub-Environment "production" (Gate).
5. **Deploy + Health-Check Produktion** - wie Schritt 3, auf
   Produktion.

Der separate Workflow `.github/workflows/rollback.yml` (manuell
auslösbar) reaktiviert die vorherige Anwendungsversion, rollt die
letzte Migration zurück und führt anschließend erneut einen
Health-Check aus.

## Technologien

- Node.js (`node:test` für Unit-Tests, keine externen Test-Frameworks)
- Reine JavaScript-Implementierung ohne Laufzeit-Abhängigkeiten
  (`src/`, `scripts/`, `migrations/migrate.js`)
- SQL-Migrationsskripte (schema-agnostisch formuliert, up/down-Paare)
- GitHub Actions für CI/CD (`deploy.yml`, `rollback.yml`)
- GitHub Environments für Staging/Produktion inkl. Freigabe-Regel auf
  Produktion

## Lokale Ausführung

```
npm test                              # Unit-Tests
npm run report                        # Tagesreport aus den Beispieldaten ausgeben
npm run migrate -- status --env=local # Migrationsstatus anzeigen
npm run migrate -- up --env=local     # Migrationen anwenden
npm run migrate -- down --env=local   # letzte Migration zurückrollen
npm run healthcheck                   # Report generieren und als Health-Check bewerten
npm run rollback                      # vorherige Version laut release-history.json aktivieren
```

## Weiterführend

Der vollständige Deployment-Ablauf inklusive Vorbereitung, Freigabe-
und Rollback-Verfahren ist in [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md)
dokumentiert.
