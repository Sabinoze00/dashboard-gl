# Dashboard GL - Guida API per Analisi AI

## Panoramica

Questa guida fornisce una spiegazione dettagliata delle API del Dashboard GL per l'estrazione e l'analisi dei dati degli obiettivi aziendali tramite AI.

## Endpoint Principali

### 1. Obiettivi per Reparto
```
GET /api/departments/{department}/objectives
```

**Reparti disponibili:**
- `Grafico`
- `Sales`
- `Financial`
- `Agency`
- `PM Company`
- `Marketing`

---

## Struttura Dati Obiettivo

### Oggetto Base `ObjectiveWithValues`

```typescript
{
  // Identificativo e metadati
  id: number,                    // ID univoco obiettivo
  department: Department,        // Reparto di appartenenza
  objective_name?: string,       // Nome breve (opzionale)
  objective_smart: string,       // Descrizione SMART completa
  
  // Configurazione obiettivo
  type_objective: ObjectiveType, // Tipo calcolo (vedi sezione dedicata)
  target_numeric: number,        // Valore target da raggiungere
  number_format: NumberFormat,   // Formato visualizzazione
  
  // Temporalità
  start_date: string,           // Data inizio (YYYY-MM-DD)
  end_date: string,             // Data fine (YYYY-MM-DD)
  
  // Metadati sistema
  order_index: number,          // Ordine visualizzazione
  reverse_logic: boolean,       // Se true, minore è meglio
  created_at: string,          // Data creazione
  
  // Valori storici
  values: ObjectiveValue[]     // Array valori mensili
}
```

---

## Tipi di Obiettivo (`type_objective`)

### 1. **Cumulativo**
- **Calcolo**: Somma progressiva di tutti i valori dal mese di inizio fino al mese corrente
- **Esempio**: "Vendere 1000 prodotti nell'anno"
- **Formula**: `currentValue = sum(values[gennaio...mese_corrente])`

### 2. **Ultimo mese** 
- **Calcolo**: Considera solo l'ultimo valore registrato
- **Esempio**: "Mantenere tasso di conversione al 15%"
- **Formula**: `currentValue = values[ultimo_mese].value`

### 3. **Mantenimento**
- **Calcolo**: Media di tutti i valori registrati nel periodo
- **Esempio**: "Mantenere customer satisfaction sopra 4.5"
- **Formula**: `currentValue = avg(values[tutti_i_mesi])`

---

## Formati Numerici (`number_format`)

| Formato | Descrizione | Esempio Display |
|---------|-------------|-----------------|
| `number` | Numero intero | 1,250 |
| `currency` | Valuta (EUR) | €12,500.00 |
| `percentage` | Percentuale | 85.5% |
| `decimal` | Numero decimale | 4.75 |

---

## Logica Reverse (`reverse_logic`)

### Standard Logic (`false`)
- **Principio**: Più alto è meglio
- **Calcolo Progress**: `(currentValue / target) * 100`
- **Esempio**: Vendite, ricavi, progetti completati

### Reverse Logic (`true`)
- **Principio**: Più basso è meglio  
- **Calcolo Progress**: Se `currentValue <= target` → 100%, altrimenti progress diminuisce
- **Esempio**: Tasso insoluto, costi, tempi di risposta

---

## Calcolo Status e Progress

### Status Possibili

| Status | Condizione | Significato |
|--------|------------|-------------|
| `Completato` | `isExpired = true` + `progress >= 100` | ✅ Obiettivo scaduto e raggiunto |
| `Non raggiunto` | `isExpired = true` + `progress < 100` | ❌ Obiettivo scaduto e NON raggiunto |
| `Raggiunto` | `isExpired = false` + `progress >= 100` | 🎯 Obiettivo attivo già completato |
| `In corso` | `isExpired = false` + `progress >= 70` | 🟢 Obiettivo attivo on-track |
| `In ritardo` | `isExpired = false` + `progress < 70` | 🟡 Obiettivo attivo sotto-performance |

### Campi Chiave per l'Analisi

```typescript
{
  // Stato temporale
  isExpired: boolean,           // true se end_date < oggi
  daysUntilExpiry: number,      // Giorni rimanenti (negativo se scaduto)
  
  // Performance
  progress: number,             // Percentuale completamento (0-100)
  currentValue: number,         // Valore attuale calcolato
  status: string,              // Status finale (vedi tabella sopra)
  isOnTrack: boolean          // true se progress >= 70%
}
```

---

## Valori Storici (`ObjectiveValue`)

```typescript
{
  id: number,           // ID univoco valore
  objective_id: number, // FK verso obiettivo
  month: number,        // Mese (1-12)
  year: number,         // Anno (es. 2025)
  value: number,        // Valore registrato
  updated_at: string    // Timestamp ultimo aggiornamento
}
```

### Pattern Temporali
- **Frequenza**: Un valore per mese per obiettivo
- **Periodo**: Da `start_date` a `end_date` dell'obiettivo
- **Calcolo**: Il sistema calcola automaticamente il `currentValue` basandosi su `type_objective`

---

## Esempi di Lettura API

### Esempio 1: Obiettivo Cumulativo Attivo
```json
{
  "id": 1,
  "department": "Sales",
  "objective_smart": "Vendere 1000 prodotti entro dicembre 2025",
  "type_objective": "Cumulativo",
  "target_numeric": 1000,
  "start_date": "2025-01-01",
  "end_date": "2025-12-31",
  "reverse_logic": false,
  "values": [
    {"month": 1, "year": 2025, "value": 50},
    {"month": 2, "year": 2025, "value": 75},
    {"month": 3, "year": 2025, "value": 80}
  ],
  // Calcoli automatici:
  "currentValue": 205,        // 50+75+80 (somma cumulativa)
  "progress": 20.5,           // (205/1000)*100
  "status": "In ritardo",     // progress < 70%
  "isExpired": false,
  "daysUntilExpiry": 125
}
```

### Esempio 2: Obiettivo Scaduto Non Raggiunto
```json
{
  "id": 2,
  "department": "Financial",
  "objective_smart": "Mantenere budget sotto €100,000",
  "type_objective": "Ultimo mese",
  "target_numeric": 100000,
  "start_date": "2024-01-01",
  "end_date": "2024-12-31",
  "reverse_logic": true,      // Più basso è meglio!
  "values": [
    {"month": 12, "year": 2024, "value": 105000}
  ],
  // Calcoli automatici:
  "currentValue": 105000,     // Ultimo valore
  "progress": 60,             // Penalizzato perché sopra target
  "status": "Non raggiunto",  // Scaduto senza successo
  "isExpired": true,
  "daysUntilExpiry": -59
}
```

---

## API per Analytics

### Endpoint Analytics
```
GET /api/departments/{department}/analytics
```

**Response aggiuntive:**
- Metriche aggregate per reparto
- Trend storici
- KPI performance summary

---

## Raccomandazioni per AI

### 1. **Focus sui Campi Chiave**
```typescript
// Per analisi rapida, concentrati su:
{
  status,           // Stato finale
  progress,         // % completamento  
  isExpired,        // Se concluso
  currentValue,     // Valore attuale
  target_numeric,   // Target da raggiungere
  type_objective    // Modalità calcolo
}
```

### 2. **Interpretazione Status**
- `Completato` / `Raggiunto` = 🟢 **Successo**
- `In corso` = 🟡 **Monitoraggio** 
- `In ritardo` / `Non raggiunto` = 🔴 **Intervento necessario**

### 3. **Analisi Trend**
- Usa array `values[]` per trend storici
- Calcola velocità progressione: `Δvalue / Δtime`
- Predici completamento: `(target - current) / velocity`

### 4. **Logica Reverse**
- **ATTENZIONE**: Se `reverse_logic = true`, invertire interpretazione
- Target basso = obiettivo positivo
- Progress alto con valore alto = problema (in reverse logic)

---

## Endpoint Aggiuntivi

### Altri endpoint utili per context:
- `GET /api/expired-objectives` - Solo obiettivi scaduti
- `GET /api/objectives/{id}` - Singolo obiettivo
- `GET /api/objectives/{id}/values` - Solo valori storici

---

## Note Implementative

1. **Timestamp**: Tutti i timestamp sono in formato ISO 8601
2. **Encoding**: UTF-8 per caratteri speciali nei nomi
3. **Paginazione**: Non implementata, tutti i risultati in un'unica response
4. **Cache**: Nessuna cache lato client, dati sempre aggiornati
5. **Errori**: HTTP status codes standard (400, 404, 500)

---

*Ultimo aggiornamento: 2025-08-29*