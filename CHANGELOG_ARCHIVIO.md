# 📁 Sistema Archivio Obiettivi - Changelog

**Branch**: `Test/Abbiettivi_2026`
**Data**: 18 Novembre 2025
**Versione**: 1.0.0

---

## 🎯 Obiettivo della Feature

Implementare un sistema di **gestione storica** degli obiettivi aziendali che:
- ✅ Mantiene lo storico di tutti gli obiettivi passati
- ✅ Separa obiettivi attivi da quelli scaduti
- ✅ Protegge i dati storici da modifiche accidentali
- ✅ Permette inserimento annuale di nuovi obiettivi senza perdere i precedenti

---

## 🚀 Nuove Funzionalità

### 1. **Tab "Obiettivi Attivi" e "Archivio"**

Ogni dashboard reparto ora ha **due tab**:

```
┌─────────────────────────────────────────┐
│ [📊 Obiettivi Attivi (6)] [📁 Archivio (12)] │
└─────────────────────────────────────────┘
```

#### **Obiettivi Attivi**
- Mostra solo obiettivi con `end_date >= data odierna`
- Modalità **modifica completa** abilitata
- Bottoni "Aggiungi Obiettivo" e "Crea in Blocco" visibili
- Drag & drop scorecard attivo
- Editing celle griglia abilitato

#### **Archivio**
- Mostra obiettivi con `end_date < data odierna`
- Modalità **sola lettura** (no modifiche)
- Bottoni "Aggiungi/Crea in Blocco" nascosti
- Drag & drop disabilitato
- Editing celle disabilitato
- Checkbox selezione e bottoni elimina nascosti

---

### 2. **Filtro Automatico per Data**

Il sistema filtra automaticamente gli obiettivi in base alla data:

```typescript
const today = new Date();
const activeObjectives = objectives.filter(obj => new Date(obj.end_date) >= today);
const archivedObjectives = objectives.filter(obj => new Date(obj.end_date) < today);
```

**Esempio:**
- **Oggi**: 18 Novembre 2025
- **Obiettivo A**: `end_date = 2025-12-31` → **Attivo**
- **Obiettivo B**: `end_date = 2024-12-31` → **Archiviato**

---

### 3. **Modalità Sola Lettura (Read-Only)**

Quando si visualizza l'Archivio:

#### **Banner Informativo**
```
ℹ️ Modalità Archivio - Sola Lettura
Stai visualizzando obiettivi scaduti (data fine passata).
Le modifiche sono disabilitate per preservare lo storico.
```

#### **Componenti Modificati**

**`DepartmentDashboard.tsx`**
- Nasconde bottoni "Aggiungi Obiettivo" e "Crea in Blocco"
- Usa `ScoreCard` statico invece di `DraggableScoreCard`
- Passa prop `readOnly={true}` ad `AdvancedGrid`

**`ScoreCard.tsx`**
- Accetta prop `readOnly?: boolean`
- Disabilita `handleClick` e `handleDoubleClick`
- Rimuove classi `cursor-pointer` e `hover:bg-gray-50`
- Cambia tooltip da "Doppio click per modificare" a nessun tooltip

**`AdvancedGrid.tsx`**
- Accetta prop `readOnly?: boolean`
- Disabilita `handleDoubleClick`, `handlePasteToSelection`
- Nasconde colonne "Checkbox selezione" e "Azioni"
- Nasconde toolbar "Bulk Actions"
- Cambia testo da "Griglia Editing Avanzata" a "Griglia Archivio (Sola Lettura)"

---

## 📊 Workflow Annuale

### **Scenario: Fine Anno 2025 → Inizio Anno 2026**

#### **31 Dicembre 2025**
```
Tab "Obiettivi Attivi": 6 obiettivi
  - Fatturato 2025 (end_date: 2025-12-31) ← Ancora attivo
  - Nuovi Clienti 2025 (end_date: 2025-12-31) ← Ancora attivo
  ...

Tab "Archivio": 12 obiettivi (anni precedenti)
```

#### **1 Gennaio 2026** (Filtro automatico!)
```
Tab "Obiettivi Attivi": 0 obiettivi
  (Tutti gli obiettivi 2025 sono ora scaduti)

Tab "Archivio": 18 obiettivi
  - Tutti gli obiettivi 2025 ✅
  - Tutti gli obiettivi anni precedenti ✅
```

#### **Azione Utente: Inserimento Nuovi Obiettivi 2026**
1. Click su tab "Obiettivi Attivi"
2. Click "Aggiungi Obiettivo" o "Crea in Blocco"
3. Inserire 5-6 nuovi obiettivi con:
   - `start_date: 2026-01-01`
   - `end_date: 2026-12-31`
4. Salvare

#### **Risultato Finale**
```
Tab "Obiettivi Attivi": 6 nuovi obiettivi 2026 ✅
Tab "Archivio": 18 obiettivi passati (2024-2025) ✅
```

---

## 🔧 Modifiche Tecniche

### **File Modificati**

| File | Modifiche | LOC |
|------|-----------|-----|
| `src/components/DepartmentDashboard.tsx` | Tab Archivio/Attivi, filtro automatico, banner | +120 |
| `src/components/ScoreCard.tsx` | Prop readOnly, disabilita editing | +15 |
| `src/components/AdvancedGrid.tsx` | Prop readOnly, nascondi azioni | +67 |
| **Totale** | | **+202** |

### **Nuove Props**

```typescript
// ScoreCard.tsx
interface ScoreCardProps {
  objective: ObjectiveWithValues;
  onObjectiveUpdate?: (...) => void;
  selectedPeriod?: PeriodSelection;
  readOnly?: boolean; // ← NUOVO
}

// AdvancedGrid.tsx
interface AdvancedGridProps {
  objectives: ObjectiveWithValues[];
  department: Department;
  onValueUpdate: (...) => void;
  onObjectiveUpdate: (...) => void;
  onObjectiveDelete: (...) => void;
  onRefresh?: () => void;
  readOnly?: boolean; // ← NUOVO
}
```

---

## ✅ Testing Checklist

### **Test da Eseguire**

- [ ] Aprire dashboard reparto (es. Sales)
- [ ] Verificare presenza tab "Obiettivi Attivi" e "Archivio"
- [ ] Verificare conteggio obiettivi nei badge
- [ ] Creare obiettivo di test con `end_date` passata
- [ ] Verificare che appaia in "Archivio"
- [ ] Aprire tab "Archivio"
- [ ] Verificare banner informativo sola lettura
- [ ] Verificare bottoni "Aggiungi" nascosti
- [ ] Tentare doppio click su scorecard → nessuna modifica
- [ ] Aprire vista "Griglia"
- [ ] Verificare colonne "Checkbox" e "Azioni" nascoste
- [ ] Tentare doppio click su cella → nessuna modifica
- [ ] Tornare a tab "Obiettivi Attivi"
- [ ] Verificare modifica funzionante normalmente

---

## 📝 Note per lo Sviluppatore

### **Design Decisioni**

1. **Filtro basato su `end_date`**
   - Pro: Automatico, nessun input utente
   - Contro: Se end_date errata, obiettivo va in archivio prematuramente

2. **Modalità Read-Only totale**
   - Pro: Protegge dati storici, nessuna modifica accidentale
   - Contro: Impossibile correggere errori passati
   - **Soluzione**: Se serve modifica, tornare temporaneamente a `main` branch

3. **Tab invece di pagina separata**
   - Pro: UX immediato, stesso contesto
   - Contro: Carica tutti gli obiettivi sempre
   - **Nota**: Se performance issue, passare a lazy loading

### **Estensioni Future (Opzionali)**

- [ ] Filtro per anno in Archivio (dropdown 2024, 2025, 2026...)
- [ ] Export CSV obiettivi archiviati
- [ ] Grafici comparativi anno su anno
- [ ] Ricerca full-text in archivio
- [ ] Permessi utente (admin può modificare archivio)

---

## 🐛 Bug Noti

Nessuno al momento.

---

## 📞 Supporto

Per domande o problemi:
- GitHub Issues: `Sabinoze00/dashboard-gl`
- Branch: `Test/Abbiettivi_2026`
- Commit: `6732c56`

---

**Generato con Claude Code** 🤖
