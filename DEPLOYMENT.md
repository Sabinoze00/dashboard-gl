# 🚀 Guida al Deployment su Vercel con Turso

Questa guida ti aiuterà a migrare da SQLite locale a Turso e deployare su Vercel.

## 📋 Prerequisiti

1. Account GitHub
2. Account Vercel
3. Account Turso (gratuito)
4. Node.js e npm installati

## 🗄️ Parte 1: Configurazione Turso

### 1. Installa Turso CLI

**Su Windows (PowerShell come Amministratore):**
```powershell
irm get.tur.so/install.ps1 | iex
```

**Su macOS/Linux:**
```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### 2. Autentica con Turso
```bash
turso auth signup
# oppure se hai già un account:
turso auth login
```

### 3. Crea il database Turso
```bash
# Crea il database
turso db create dashboard-gl

# Ottieni l'URL del database
turso db show dashboard-gl

# Genera il token di autenticazione
turso db tokens create dashboard-gl
```

### 4. Configura le variabili d'ambiente
Copia i valori ottenuti nel file `.env.local`:

```env
USE_TURSO=true
TURSO_DATABASE_URL=libsql://dashboard-gl-[your-username].turso.io
TURSO_AUTH_TOKEN=eyJ...[il-tuo-token]
INIT_TURSO_DB=true
```

## 🔄 Parte 2: Migrazione dei Dati

### 1. Migra i dati da SQLite a Turso
```bash
node migrate-to-turso.js
```

Se vedi errori, controlla che:
- Il file `database.sqlite` esista
- Le credenziali Turso siano corrette
- Hai connessione internet

### 2. Testa localmente con Turso
```bash
npm run dev:turso
```

Verifica che l'applicazione funzioni correttamente con Turso.

## ☁️ Parte 3: Deployment su Vercel

### 1. Prepara il repository
```bash
# Aggiungi i file al repository
git add .
git commit -m "Add Turso configuration for production deployment

🚀 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Pusha su GitHub
git push origin main
```

### 2. Collega a Vercel
1. Vai su [vercel.com](https://vercel.com)
2. Fai login con GitHub
3. Clicca "New Project"
4. Seleziona il repository `dashboard-gl`
5. Configura le variabili d'ambiente:
   - `USE_TURSO=true`
   - `TURSO_DATABASE_URL=libsql://dashboard-gl-[your-username].turso.io`
   - `TURSO_AUTH_TOKEN=[il-tuo-token]`

### 3. Deploy
1. Clicca "Deploy"
2. Attendi il completamento
3. Testa l'applicazione live

## 🔧 Comandi Utili

```bash
# Sviluppo locale con SQLite
npm run dev

# Sviluppo locale con Turso
npm run dev:turso

# Build per produzione
npm run build

# Visualizza log Turso
turso db shell dashboard-gl

# Lista database Turso
turso db list

# Backup database Turso
turso db dump dashboard-gl --output backup.sql
```

## 🐛 Troubleshooting

### Errore: "table already exists"
```bash
# Elimina e ricrea il database
turso db destroy dashboard-gl
turso db create dashboard-gl
# Poi riesegui la migrazione
```

### Errore: "unauthorized"
```bash
# Rigenera il token
turso db tokens create dashboard-gl
# Aggiorna .env.local
```

### Errore durante build su Vercel
1. Controlla i log di Vercel
2. Verifica che le variabili d'ambiente siano configurate
3. Assicurati che `USE_TURSO=true` sia impostato

## 📊 Monitoraggio

- **Dashboard Turso**: Monitora le query e l'utilizzo
- **Vercel Analytics**: Traccia le performance dell'app
- **Logs**: Controlla i log di Vercel per errori

## 🔒 Sicurezza

✅ **Fatto:**
- Token Turso configurati come variabili d'ambiente
- Database accessibile solo con autenticazione
- HTTPS automatico su Vercel

⚠️ **Da fare:**
- Rotazione periodica dei token Turso
- Backup regolari del database
- Monitoring degli accessi

## 📈 Scalabilità

Con questa configurazione puoi gestire:
- **Database**: Fino a 500MB gratuiti su Turso
- **Traffico**: Illimitato su Vercel
- **API Calls**: Fino a 1M query/mese gratis su Turso

Per maggiori risorse, considera gli upgrade a pagamento di Turso e Vercel.