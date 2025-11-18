In seconda battuta voglio aggiungere AI (con deepseek), che aiuti gli utenti a leggere i dati e fare in modo da avere insight veloci e soprattutto precisi, detto questo ad ora voglio concentrami sull'arricchimento delle API

Questo processo di arricchimento trasforma i dati grezzi in un vero e proprio report analitico che l'AI deve solo "leggere" e non interpretare. Ho suddiviso l'elenco in due livelli: i dati da calcolare per ogni singolo obiettivo e i dati di riepilogo per l'intero dipartimento.

Livello 1: Arricchimento per Singolo Obiettivo
Questo è l'elenco completo dei campi che il tuo oggetto JSON per un singolo obiettivo dovrebbe contenere. La logica per molti di questi calcoli si trova già nel tuo componente ScoreCard.tsx.

A) Dati Identificativi
id: L'ID numerico dell'obiettivo.

objectiveName: Il nome breve e pulito dell'obiettivo (es. "Fatturato Annuale").

objectiveSmartDescription: La descrizione SMART completa.

department: Il dipartimento di appartenenza.

objectiveType: Il tipo ('Cumulativo', 'Mantenimento', 'Ultimo mese').

numberFormat: Il formato numerico ('currency', 'percentage', etc.).

B) Dati sul Target
targetValue: Il valore numerico finale da raggiungere.

startDate / endDate: Le date di inizio e fine dell'obiettivo.

C) Dati di Performance Calcolati (i più importanti)
currentValue: Il valore attuale calcolato secondo la logica del objectiveType:

Cumulativo: La somma di tutti i valori mensili fino al mese corrente.

Mantenimento: La media di tutti i valori mensili inseriti fino ad oggi.

Ultimo mese: Il valore dell'ultimo mese per cui sono stati inseriti dati.

progressPercentage: La metrica chiave: (currentValue / targetValue) * 100.

lastUpdate: Un oggetto che contiene i dettagli dell'ultimo valore inserito, per dare contesto. Es: { "month": "Marzo", "value": 5000 }.

D) Dati Analitici e di Contesto (per insight più profondi)
expectedProgressPercentage: Il progresso atteso se l'obiettivo procedesse in modo perfettamente lineare. Es: a fine giugno (6° mese), questo valore sarebbe 50.0 (6/12).

variancePercentage: Lo scostamento tra progresso reale e atteso (progressPercentage - expectedProgressPercentage). Un valore negativo indica un ritardo.

healthStatus: Uno stato di salute più granulare basato sulla varianza. Puoi definire tu le regole, ad esempio:

"Exceeded": Se progressPercentage > 100.

"On Track": Se variancePercentage > -10.

"At Risk": Se variancePercentage è tra -10 e -25.

"Behind": Se variancePercentage < -25.

trend: Un indicatore di tendenza semplice (es. "Improving", "Stable", "Declining"), basato sul confronto tra il valore dell'ultimo mese e quello del mese precedente.

timeElapsedPercentage: La percentuale di tempo trascorso dall'inizio dell'obiettivo. Es: a fine marzo, questo è 25.0.

E) Dati Grezzi per Domande di Dettaglio
monthlyValues: La lista completa dei valori mensili. Utile se l'utente chiede "Qual era il valore a Gennaio?".

Livello 2: Arricchimento di Riepilogo per Dipartimento
Questo è un nuovo oggetto JSON che la tua API dovrebbe generare per fornire una visione d'insieme immediata, rispondendo a domande come "Come sta andando il reparto Sales?".

A) Statistiche Generali
departmentName: Il nome del dipartimento.

totalObjectives: Il numero totale di obiettivi per quel dipartimento.

B) Statistiche di Performance Aggregate
overallProgressAverage: La media di progressPercentage di tutti gli obiettivi del dipartimento. Un singolo "voto" per la salute generale.

objectivesByHealthStatus: Un oggetto con il conteggio degli obiettivi per ogni stato di salute. Es: { "Exceeded": 2, "On Track": 5, "At Risk": 1, "Behind": 0 }.

C) Insight Specifici e Automatizzati
topPerformer: Un oggetto che identifica l'obiettivo migliore. Es: { "name": "Vendere 26 Audit", "progress": 115.0 }.

worstPerformer: Un oggetto che identifica l'obiettivo che richiede più attenzione. Es: { "name": "Fatturato Recurrent", "progress": 35.0 }.

countByType: Un oggetto che mostra come sono distribuiti gli obiettivi. Es: { "Cumulativo": 4, "Mantenimento": 3, "Ultimo mese": 1 }.

Esempio Finale del JSON "Pronto per l'AI"
La tua API, per una richiesta sul reparto Sales, dovrebbe restituire una struttura simile a questa:

JSON

{
  "departmentSummary": {
    "departmentName": "Sales",
    "totalObjectives": 12,
    "overallProgressAverage": 78.5,
    "objectivesByHealthStatus": {
      "Exceeded": 2,
      "On Track": 7,
      "At Risk": 2,
      "Behind": 1
    },
    "topPerformer": {
      "name": "Vendere 26 Audit",
      "progressPercentage": 115.4
    },
    "worstPerformer": {
      "name": "Fatturato recurrent 17.280€",
      "progressPercentage": 35.2
    },
    "countByType": {
      "Cumulativo": 5,
      "Mantenimento": 7,
      "Ultimo mese": 0
    }
  },
  "objectives": [
    {
      "id": 7,
      "objectiveName": "Vendere 26 Audit",
      "objectiveSmartDescription": "Vendere 26 Audit",
      "department": "Sales",
      "objectiveType": "Cumulativo",
      "numberFormat": "number",
      "targetValue": 26,
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "currentValue": 30,
      "progressPercentage": 115.4,
      "lastUpdate": {
        "month": "Agosto",
        "value": 6
      },
      "expectedProgressPercentage": 66.7,
      "variancePercentage": 48.7,
      "healthStatus": "Exceeded",
      "trend": "Improving",
      "timeElapsedPercentage": 66.7,
      "monthlyValues": [
        { "month": "Gennaio", "value": 3 },
        { "month": "Febbraio", "value": 5 },
        { "month": "Marzo", "value": 4 },
        { "month": "Aprile", "value": 4 },
        { "month": "Maggio", "value": 2 },
        { "month": "Giugno", "value": 3 },
        { "month": "Luglio", "value": 3 },
        { "month": "Agosto", "value": 6 }
      ]
    },
    {
      "id": 9,
      "objectiveName": "Fatturato recurrent 17280€",
      "objectiveSmartDescription": "Raggiungere un fatturato recurrent di 17.280€ entro il 31/12/2025",
      "department": "Sales",
      "objectiveType": "Cumulativo",
      "numberFormat": "currency",
      "targetValue": 17280,
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "currentValue": 6080,
      "progressPercentage": 35.2,
      "lastUpdate": {
        "month": "Agosto",
        "value": 800
      },
      "expectedProgressPercentage": 66.7,
      "variancePercentage": -31.5,
      "healthStatus": "Behind",
      "trend": "Stable",
      "timeElapsedPercentage": 66.7,
      "monthlyValues": [
        { "month": "Gennaio", "value": 500 },
        { "month": "Febbraio", "value": 780 },
        { "month": "Marzo", "value": 900 },
        { "month": "Aprile", "value": 1300 },
        { "month": "Maggio", "value": 500 },
        { "month": "Giugno", "value": 500 },
        { "month": "Luglio", "value": 800 },
        { "month": "Agosto", "value": 800 }
      ]
    },
    {
      "id": 8,
      "objectiveName": "Meeting Fissati 36",
      "objectiveSmartDescription": "Raggiungere i 36 meeting al mese fissati in setting",
      "department": "Sales",
      "objectiveType": "Mantenimento",
      "numberFormat": "number",
      "targetValue": 36,
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "currentValue": 34.5,
      "progressPercentage": 95.8,
      "lastUpdate": {
        "month": "Agosto",
        "value": 38
      },
      "expectedProgressPercentage": 100.0,
      "variancePercentage": -4.2,
      "healthStatus": "On Track",
      "trend": "Improving",
      "timeElapsedPercentage": 66.7,
      "monthlyValues": [
        { "month": "Gennaio", "value": 30 },
        { "month": "Febbraio", "value": 32 },
        { "month": "Marzo", "value": 35 },
        { "month": "Aprile", "value": 33 },
        { "month": "Maggio", "value": 35 },
        { "month": "Giugno", "value": 36 },
        { "month": "Luglio", "value": 34 },
        { "month": "Agosto", "value": 38 }
      ]
    }
  ]
}
