# Ageri Rekruttering — ATS (Norwegian Applicant Tracking System)

Et komplett rekrutteringssystem på norsk med tre brukerflater:

- **Offentlig jobbside** (`/jobb`) — én side per ledig stilling med stillingsbeskrivelse og søknadsskjema.
- **Kandidatportal** (`/kandidat`) — kandidater logger inn, oppdaterer profil, laster opp CV og ser status på alle søknader.
- **Rekruttererpanel** (`/admin`) — Kanban-tavle, kandidatprofiler, intervjusett, e-postmaler, oppgaver, chat og e-post.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- Postgres + Prisma
- NextAuth.js (e-post + passord)
- Azure Communication Services (utgående + innkommende e-post)
- Azure Web PubSub (sanntidschat)
- Azure Blob Storage (CV-er)
- pg-boss (Postgres-køet jobbsystem for automatiseringer)
- next-intl (norsk Bokmål — `nb-NO`)

## Komme i gang lokalt

```bash
# 1) Postgres lokalt
docker run -d --name ats-pg -e POSTGRES_USER=ats -e POSTGRES_PASSWORD=ats \
  -e POSTGRES_DB=ats -p 5432:5432 postgres:16

# 2) Konfig
cp .env.example .env
# (sett DATABASE_URL og NEXTAUTH_SECRET; resten av Azure-variablene er valgfrie for dev — appen faller tilbake til lokal stub)

# 3) Installer og migrer
npm install
npx prisma migrate dev --name init
npm run db:seed
# Skriv ut admin-passord: standard 'Admin1234!' for admin@ageri.no

# 4) Kjør utviklingsserveren
npm run dev
# i et annet terminalvindu: npm run worker
```

Åpne `http://localhost:3000`.

## Hovedkonsepter

### Rekrutteringsprosesser & Kanban

Hver stilling får sin egen kopi av en `Pipeline` med ordnede `Stage`. Dra-og-slipp-tavlen
(`/admin/stillinger/[id]/kanban`) lar rekrutterere flytte søknader mellom steg. Hver
flytting skriver en `StageTransition` (revisjonslogg) og setter i kø en automatiseringskjøring.

### Automatiseringer

På hvert steg kan du legge til automatiseringer som utløses ved `ON_ENTER` eller `ON_EXIT`.
Fire handlingstyper er støttet:

| Type            | Konfig                                                           |
|-----------------|------------------------------------------------------------------|
| `SEND_EMAIL`    | `{ templateId }` — sender e-postmal til kandidaten.              |
| `NOTIFY_USER`   | `{ userId, message }` — varsler en rekrutterer i appen.          |
| `CREATE_TASK`   | `{ assigneeUserId, title, dueInDays }` — oppretter en oppgave.   |
| `ADD_TAG`       | `{ tag }` — legger til en etikett på kandidaten.                 |

Automatiseringer er idempotente per `(automation, transition)` — re-kjøring oppstår
ikke ved nytt forsøk i køen.

### Chat & e-post

Hver søknad har én `MessageThread` per kanal (`CHAT`, `EMAIL`). Kandidaten ser
chat-tråden i kandidatportalen i sanntid via Azure Web PubSub. Rekruttereren
ser begge kanaler interlevert på kandidatens side. Utgående e-post sendes via
Azure Communication Services. Innkommende svar mappes tilbake til riktig tråd
via `In-Reply-To`-headeren (eller faller tilbake på avsenderens e-postadresse).

### Intervjusett

Definer maler med vektede spørsmål. Hver vurdering lagres med per-spørsmål
score (1-5) og notat, og en samlet vektet score regnes ut og vises på kandidatens
profil.

## Skript

| Skript              | Beskrivelse                                           |
|---------------------|-------------------------------------------------------|
| `npm run dev`       | Utviklingsserver                                      |
| `npm run worker`    | pg-boss arbeider for automatiseringer                 |
| `npm run build`     | Produksjonsbygg (standalone)                          |
| `npm run db:migrate`| `prisma migrate dev`                                  |
| `npm run db:seed`   | Seeder standardprosess + e-postmaler + admin-bruker   |
| `npm test`          | Vitest-tester                                         |
| `npm run typecheck` | TypeScript-typesjekk                                  |

## Azure-deploy

Se `infra/main.bicep` for App Service + PostgreSQL Flexible Server +
Communication Services + Web PubSub + Blob Storage + Key Vault.
GitHub Actions-workflow ligger i `.github/workflows/deploy.yml`.
