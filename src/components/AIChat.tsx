'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface AIDialogProps {
  isOpen: boolean;
  onClose: () => void;
  department?: string; // Optional department filter
}

const getPredefinedQuestions = (department?: string) => {
  const isSpecificDepartment = !!department;
  const deptContext = isSpecificDepartment ? `del dipartimento ${department}` : 'di tutti i dipartimenti';
  
  return [
    {
      category: 'Analisi Generale',
      questions: [
        `Analizza tutti gli obiettivi ${deptContext}`,
        `Mostra gli obiettivi in ritardo ${isSpecificDepartment ? '' : 'per dipartimento'}`,
        `Quali obiettivi sono stati completati ${deptContext}?`,
        `Calcola la performance complessiva ${deptContext}`
      ]
    },
    {
      category: 'Performance Specifica',
      questions: [
        `Analizza gli obiettivi con logica inversa ${deptContext}`,
        `Mostra gli obiettivi scaduti ${deptContext}`,
        `Calcola il progresso medio degli obiettivi attivi ${deptContext}`,
        `Confronta target vs valori attuali ${deptContext}`
      ]
    },
    {
      category: 'Trend Temporali',
      questions: [
        `Analizza i trend mensili ${deptContext}`,
        `Mostra l'evoluzione dei valori nel tempo ${deptContext}`,
        `Identifica i mesi con migliori performance ${deptContext}`,
        `Calcola la crescita mensile ${deptContext}`
      ]
    }
  ];
};

const DEEPSEEK_API_KEY = 'sk-eb20c3da574b4ed8ae713161d88b3797';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

const SYSTEM_PROMPT = `Ruolo e Obiettivo Primario:
Sei un assistente AI esperto, specializzato nell'analisi dei dati provenienti dall'API del "Dashboard GL". Il tuo unico scopo è rispondere alle domande degli utenti analizzando i dati JSON di un obiettivo specifico (ObjectiveWithValues) che ti verrà fornito. Le tue risposte devono essere precise, schematiche, basate esclusivamente sui dati forniti e sulle regole di calcolo definite in questo documento. Non devi mai fare supposizioni, fornire opinioni o informazioni esterne. Il tuo compito non è "interpretare" ma "calcolare e spiegare" seguendo una logica rigorosa.

CONTESTO FONDAMENTALE: REGOLE DI INTERPRETAZIONE DEI DATI
Prima di rispondere a qualsiasi domanda, interiorizza le seguenti regole immutabili derivate dalla documentazione ufficiale dell'API.

1. Struttura Dati Chiave (ObjectiveWithValues)
Quando analizzi un oggetto, focalizzati su questi campi per derivare tutte le informazioni:

department, objective_smart: Per identificare l'obiettivo (NON MOSTRARE MAI GLI ID NUMERICI).

type_objective: Per determinare COME calcolare il valore attuale.

target_numeric: Il valore numerico da raggiungere.

reverse_logic: Per determinare SE la logica di successo è standard o inversa. Questo è il parametro più critico da verificare.

start_date, end_date: Per definire il contesto temporale.

values: L'array dei dati grezzi mensili su cui basare i calcoli.

isExpired, progress, currentValue, status: I campi calcolati che devi verificare e spiegare.

2. Logica di Calcolo del currentValue (Valore Attuale)
Il calcolo del currentValue dipende obbligatoriamente dal campo type_objective. Applica sempre una delle seguenti regole:

Se type_objective = "Cumulativo": Il currentValue è la somma di tutti i value presenti nell'array values.

Se type_objective = "Ultimo mese": Il currentValue è il value dell'ultimo oggetto presente nell'array values (quello con la data più recente).

Se type_objective = "Mantenimento": Il currentValue è la media matematica di tutti i value presenti nell'array values.

3. Logica di Calcolo del progress (Progresso %)
Il calcolo del progress dipende dal tipo di obiettivo E dal campo booleano reverse_logic.

IMPORTANTE: Per obiettivi di tipo "Mantenimento", NON ESISTE un vero "progresso" - ogni mese è indipendente e deve mantenere il target. Il "progress" è solo un indicatore della performance media rispetto al target, non un avanzamento verso un obiettivo.

Se type_objective = "Mantenimento":
- Analizza ogni mese singolarmente: ogni valore mensile dovrebbe rispettare il target
- Il "progress" rappresenta quanti mesi hanno rispettato il target rispetto al totale
- Esempio: "Il valore di giugno (7%) supera il target del 5%, indicando una performance non ottimale per quel mese"
- NON dire "progresso verso l'obiettivo" ma "performance di mantenimento"

Se type_objective = "Cumulativo" o "Ultimo mese":
- reverse_logic = false (Logica Standard): progress = (currentValue / target_numeric) * 100. Valori più alti sono migliori.
- reverse_logic = true (Logica Inversa): principio "più basso è meglio"
  - Se currentValue ≤ target_numeric: progress = 100%
  - Se currentValue > target_numeric: progress diminuisce proporzionalmente

4. Logica di Assegnazione dello status
Lo status è una conseguenza diretta di isExpired e progress. Utilizza questa tabella di verità per determinarlo e spiegarlo:

SE isExpired è true E progress è >= 100 ALLORA status = "Completato" (✅ Obiettivo scaduto e raggiunto).

SE isExpired è true E progress è < 100 ALLORA status = "Non raggiunto" (❌ Obiettivo scaduto e fallito).

SE isExpired è false E progress è >= 100 ALLORA status = "Raggiunto" (🎯 Obiettivo attivo ma già completato in anticipo).

SE isExpired è false E progress è >= 70 E < 100 ALLORA status = "In corso" (🟢 Obiettivo attivo e in linea con le aspettative).

SE isExpired è false E progress è < 70 ALLORA status = "In ritardo" (🟡 Obiettivo attivo ma sotto le aspettative).

ISTRUZIONI OPERATIVE PER LA RISPOSTA
Per ogni domanda dell'utente, segui rigorosamente questo processo in 2 fasi.

FASE 1: Analisi Sistematica (Processo mentale)
Prima di scrivere la risposta, esegui questi passaggi di analisi sul JSON fornito:

Identifica l'Obiettivo: Leggi objective_smart e department (NON USARE MAI GLI ID).

Determina il Metodo di Calcolo: Leggi type_objective. Questo ti dice quale formula usare per il currentValue.

Controlla la Logica di Successo: Leggi reverse_logic. Questo determina come interpretare il progress rispetto al target_numeric.

Verifica i Calcoli: Ricalcola mentalmente currentValue e progress usando i valori grezzi (values) e le regole sopra. Assicurati che corrispondano ai valori forniti.

Determina lo Stato: Applica la tabella di verità dello status basandoti su isExpired e progress.

Contestualizza Temporalmente: Nota i campi start_date, end_date e daysUntilExpiry.

FASE 2: Struttura della Risposta (Output per l'utente)
Struttura ogni tua risposta in modo schematico e chiaro, usando il seguente template.

1. Sintesi Diretta
Inizia con una frase che risponde direttamente alla domanda dell'utente, menzionando lo stato finale dell'obiettivo.

Esempio: "L'obiettivo 'Vendere 1000 prodotti' risulta In ritardo."

2. Dettaglio dell'Analisi (Step-by-Step)
Spiega il "perché" in modo schematico, mostrando i dati e le regole che hai usato.

**Obiettivo**: [objective_smart] - Dipartimento [department]

Stato Attuale: [status] (es. In ritardo 🟡)

Analisi della Performance:

Target da Raggiungere/Mantenere: [target_numeric]

Valore Attuale Calcolato (currentValue): [currentValue]

Performance: [progress]% (per Mantenimento: indica conformità media al target, NON progresso)

Spiegazione del Calcolo:

Tipo di Obiettivo: [type_objective]. Spiega come questo influisce sul calcolo.

Esempio: "Essendo un obiettivo di tipo Cumulativo, il valore attuale (205) è la somma dei valori mensili registrati (50 + 75 + 80)."

Logica di Calcolo: [Standard / Inversa]. Spiega l'impatto sul progresso.

Esempio: "La logica è Standard (più alto è meglio), quindi il progresso del 20.5% è calcolato come (205 / 1000) * 100."

Contesto Temporale:

Periodo: Da [start_date] a [end_date]

Scadenza: [Scaduto / Non Scaduto]. [daysUntilExpiry] giorni rimanenti.

3. Dati Storici (se richiesto o rilevante)
Se l'utente chiede un'analisi del trend, elenca i valori storici in modo chiaro.

Valori Mensili Registrati (values):

Mese [month]/[year]: [value]

Mese [month]/[year]: [value]

...

Non aggiungere mai conclusioni, consigli o informazioni non esplicitamente presenti nel JSON o in queste regole. La tua funzione è essere un traduttore preciso e schematico dal dato grezzo a una spiegazione logica.`;

export default function AIChat({ isOpen, onClose, department }: AIDialogProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [conversationId] = useState(() => `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [savedChatsCount, setSavedChatsCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    // Carica il conteggio delle chat salvate
    if (isOpen) {
      const existingChats = JSON.parse(localStorage.getItem('ai-chat-history') || '[]');
      setSavedChatsCount(existingChats.length);
    }
  }, [isOpen]);

  const fetchObjectivesData = async () => {
    try {
      let url = '/api/objectives';
      // Se siamo in un dipartimento specifico, usa l'API del dipartimento
      if (department) {
        url = `/api/departments/${encodeURIComponent(department)}/objectives`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch objectives');
      const data = await response.json();
      
      // Se non è un dipartimento specifico, restituisci tutti i dati
      if (!department) {
        return data;
      }
      
      // Se è un dipartimento specifico e l'API non restituisce i campi calcolati, li calcoliamo
      return data.map((objective: any) => {
        if (objective.currentValue === undefined) {
          // Calcola i valori se non presenti (per compatibilità)
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          const currentYearValues = objective.values?.filter((v: any) => Number(v.year) === currentYear) || [];
          
          let currentValue = 0;
          switch (objective.type_objective) {
            case 'Cumulativo':
              currentValue = currentYearValues.reduce((sum: number, v: any) => sum + Number(v.value), 0);
              break;
            case 'Mantenimento':
              if (currentYearValues.length > 0) {
                currentValue = currentYearValues.reduce((sum: number, v: any) => sum + Number(v.value), 0) / currentYearValues.length;
              }
              break;
            case 'Ultimo mese':
              if (currentYearValues.length > 0) {
                const sortedValues = currentYearValues.sort((a: any, b: any) => Number(b.month) - Number(a.month));
                currentValue = Number(sortedValues[0]?.value) || 0;
              }
              break;
          }
          
          const targetNumeric = Number(objective.target_numeric);
          let progress = 0;
          
          if (objective.reverse_logic) {
            if (currentValue <= targetNumeric) {
              progress = 100;
            } else {
              progress = Math.max(0, (targetNumeric / currentValue) * 100);
            }
          } else {
            progress = targetNumeric > 0 ? (currentValue / targetNumeric) * 100 : 0;
          }
          
          const endDate = new Date(String(objective.end_date));
          const isExpired = currentDate > endDate;
          const daysUntilExpiry = Math.ceil((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
          
          let status = '';
          if (isExpired && progress >= 100) {
            status = 'Completato';
          } else if (isExpired && progress < 100) {
            status = 'Non raggiunto';
          } else if (!isExpired && progress >= 100) {
            status = 'Raggiunto';
          } else if (!isExpired && progress >= 70) {
            status = 'In corso';
          } else {
            status = 'In ritardo';
          }
          
          return {
            ...objective,
            currentValue: Math.round(currentValue * 100) / 100,
            progress: Math.round(progress * 100) / 100,
            isExpired,
            daysUntilExpiry,
            status
          };
        }
        return objective;
      });
    } catch (error) {
      console.error('Error fetching objectives:', error);
      return null;
    }
  };

  // Funzione per salvare la conversazione
  const saveConversation = (newMessages: Message[]) => {
    const conversationData = {
      id: conversationId,
      department: department || 'global',
      timestamp: new Date().toISOString(),
      messages: newMessages
    };
    
    // Salva nel localStorage
    const existingChats = JSON.parse(localStorage.getItem('ai-chat-history') || '[]');
    const updatedChats = existingChats.filter((chat: any) => chat.id !== conversationId);
    updatedChats.push(conversationData);
    
    // Mantieni solo le ultime 50 conversazioni
    if (updatedChats.length > 50) {
      updatedChats.splice(0, updatedChats.length - 50);
    }
    
    localStorage.setItem('ai-chat-history', JSON.stringify(updatedChats));
    setSavedChatsCount(updatedChats.length);
  };

  const sendToDeepseek = async (userMessage: string, objectivesData: any) => {
    // Aggiunta del contesto dipartimento al prompt
    const departmentContext = department ? 
      `\n\nCONTESTO SPECIFICO: Stai analizzando solo gli obiettivi del dipartimento "${department}". I dati forniti contengono esclusivamente gli obiettivi di questo dipartimento.` : 
      `\n\nCONTESTO GLOBALE: Stai analizzando gli obiettivi di tutti i dipartimenti aziendali. I dati contengono obiettivi di: Grafico, Sales, Financial, Agency, PM Company, Marketing.`;

    const enhancedPrompt = `${SYSTEM_PROMPT}${departmentContext}

REGOLE DI FORMATTAZIONE OBBLIGATORIE:

**STRUTTURA GERARCHICA:**
- Usa **grassetto** per intestazioni principali: **STATO GENERALE**, **OBIETTIVI IN RITARDO**, ecc.
- Ogni bullet point DEVE essere su una nuova riga
- Usa spaziatura doppia tra sezioni diverse
- NON MOSTRARE MAI ID NUMERICI nelle risposte all'utente

**FORMATTAZIONE BULLET POINTS:**
- Ogni obiettivo deve essere su una riga separata con doppia spaziatura
- Formato: [Nome Obiettivo] [Target]: [Valore Attuale] ([Percentuale]) - [Spiegazione Status]
- Usa i bullet point standard (-)

**SPIEGAZIONI OBIETTIVI IN RITARDO:**
Per ogni obiettivo in ritardo, DEVI spiegare:
1. **Cos'è l'obiettivo** (cosa misura/rappresenta)
2. **Cosa significa essere in ritardo** (quanto manca per raggiungerlo)

**INDICATORI STATUS (senza emoji eccessive):**
- RAGGIUNTO per obiettivi completati
- IN CORSO per obiettivi tra 70-99%
- IN RITARDO per obiettivi sotto 70%
- NON RAGGIUNTO per obiettivi scaduti

REGOLE SPECIFICHE PER OBIETTIVI DI MANTENIMENTO:
- NON usare termini come "progresso" o "avanzamento" 
- Usa "performance di mantenimento" o "conformità al target"
- Analizza ogni mese singolarmente: "Il valore di [mese] ([valore]) [rispetta/supera/è sotto] il target del [target]"
- Evidenzia i mesi che non rispettano il target con emoji appropriate`;

    const payload = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `${enhancedPrompt}\n\nDATI DEGLI OBIETTIVI DA ANALIZZARE:\n${JSON.stringify(objectivesData, null, 2)}`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      stream: true
    };

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Deepseek API error: ${response.status}`);
    }

    return response;
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    setInput('');
    setShowSuggestions(false);
    
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: text,
      timestamp: new Date()
    };

    setMessages(prev => {
      const newMessages = [...prev, userMessage];
      saveConversation(newMessages);
      return newMessages;
    });
    setIsLoading(true);

    // Crea il messaggio AI placeholder per streaming
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      type: 'ai',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, aiMessage]);

    try {
      const objectivesData = await fetchObjectivesData();
      
      if (!objectivesData) {
        throw new Error('Impossibile recuperare i dati degli obiettivi');
      }

      const response = await sendToDeepseek(text, objectivesData);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error('No reader available');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullResponse += content;
                
                // Aggiorna il messaggio in streaming
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: fullResponse, isStreaming: true }
                    : msg
                ));
              }
            } catch (parseError) {
              console.warn('Error parsing SSE data:', data);
            }
          }
        }
      }

      // Finalizza il messaggio
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: fullResponse, isStreaming: false }
            : msg
        );
        saveConversation(newMessages);
        return newMessages;
      });

    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: aiMessageId,
        type: 'ai',
        content: `Errore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}. Riprova più tardi.`,
        timestamp: new Date(),
        isStreaming: false
      };
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === aiMessageId ? errorMessage : msg
        );
        saveConversation(newMessages);
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                AI Assistant {department && `- ${department}`}
              </h3>
              <p className="text-sm text-gray-500">
                {department ? 
                  `Analisi obiettivi ${department} con Deepseek` : 
                  'Analisi obiettivi aziendali con Deepseek'
                }
                {savedChatsCount > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    💬 {savedChatsCount} chat salvate
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && showSuggestions && (
            <div className="text-center py-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                {department ? 
                  `Come posso aiutarti ad analizzare i dati del ${department}?` : 
                  'Come posso aiutarti ad analizzare i dati aziendali?'
                }
              </h4>
              <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
                {getPredefinedQuestions(department).map((category) => (
                  <div key={category.category} className="text-left">
                    <h5 className="font-medium text-gray-700 mb-2">{category.category}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {category.questions.map((question) => (
                        <button
                          key={question}
                          onClick={() => handleSend(question)}
                          className="text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}
              >
                {message.type === 'user' ? (
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                ) : (
                  <div className="text-sm prose prose-sm max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="mb-2 pl-4 list-disc last:mb-0">{children}</ul>,
                        ol: ({ children }) => <ol className="mb-2 pl-4 list-decimal last:mb-0">{children}</ol>,
                        li: ({ children }) => <li className="mb-1">{children}</li>,
                        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 text-gray-900">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2 text-gray-900">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-gray-900">{children}</h3>
                      }}
                    >
                      {message.content || (message.isStreaming ? '...' : '')}
                    </ReactMarkdown>
                    {message.isStreaming && (
                      <div className="inline-flex items-center ml-1">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                )}
                <div
                  className={`text-xs mt-1 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                  <span className="text-sm text-gray-600">Analizzando...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Chiedi qualcosa sui dati degli obiettivi..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}