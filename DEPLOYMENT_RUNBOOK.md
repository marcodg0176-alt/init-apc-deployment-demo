# Deployment-Runbook - APC Analytics (Demo)

Dieses Runbook beschreibt den Ablauf eines Deployments fuer die
APC-Analytics-Anwendung in diesem Projekt, exemplarisch fuer ein
Kundensystem im OEPNV-Umfeld.

## 1. Vorbereitung

- Release-Version und Aenderungsumfang dokumentieren (Changelog)
- Zielumgebung bestaetigen (Staging vor Produktion, nie ueberspringen)
- Migrationsskripte auf Kompatibilitaet pruefen (npm run migrate -- status --env=<env>)
- Sicherstellen, dass ein Rollback-Pfad fuer jede Migration existiert (*.down.sql)
- Wartungsfenster mit dem Kunden abstimmen, falls noetig

## 2. Staging-Deployment

1. Pipeline auf main ausloesen (oder workflow_dispatch)
2. Automatisierte Tests muessen gruen sein, bevor migriert wird
3. Migration auf Staging anwenden: npm run migrate -- up --env=staging
4. Deployment auf Staging durchfuehren
5. Health-Check ausfuehren: npm run healthcheck
6. Stichprobenartige manuelle Pruefung der generierten Reports (npm run report)

## 3. Freigabe fuer Produktion

- Health-Check auf Staging erfolgreich
- Keine offenen Anomalien im generierten Report, die nicht erklaert werden koennen
- Freigabe durch verantwortliche Person (GitHub Environment Protection Rule "production")

## 4. Produktions-Deployment

1. Migration auf Produktion anwenden: npm run migrate -- up --env=production
2. Deployment auf Produktion durchfuehren
3. Health-Check ausfuehren und Ergebnis dokumentieren
4. Release-Version in der Historie vermerken (scripts/release-history.json)

## 5. Monitoring nach dem Deployment

- Health-Check-Ergebnis fuer mindestens einen vollen Betriebstag beobachten
- Auf ungewoehnliche Anomalie-Haeufungen im Report achten (report.anomalies)
- Bei Auffaelligkeiten: Abschnitt 6 (Rollback) einleiten

## 6. Rollback-Verfahren

1. Workflow rollback.yml manuell ausloesen, Grund angeben
2. Vorherige Anwendungsversion wird aktiviert (scripts/rollback.js)
3. Letzte Migration wird zurueckgerollt (npm run migrate -- down --env=production)
4. Health-Check erneut ausfuehren
5. Vorfall dokumentieren: Ursache, Zeitpunkt, betroffene Komponenten, naechste Schritte

## Grundprinzipien

- Kein Produktions-Deployment ohne vorheriges, erfolgreiches Staging-Deployment
- Jede Migration braucht ein getestetes Rollback-Skript
- Health-Checks sind Teil der Pipeline, nicht ein nachgelagerter Schritt
- Anomalien in den Daten werden genauso ernst genommen wie technische Fehler
