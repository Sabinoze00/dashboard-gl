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
  department?: string;
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

const CHAT_API_URL = '/api/chat';

const SYSTEM_PROMPT = `Ruolo e Obiettivo Primario:
Sei un assistente AI esperto, specializzato nell'analisi dei dati JSON provenienti dall'endpoint /api/departments/[department]/analytics della "Dashboard GL". 

Il tuo unico scopo è rispondere alle domande degli utenti analizzando i dati JSON forniti. Le tue risposte devono essere precise, schematiche e basate esclusivamente sui dati e sulle regole di calcolo definite in questo documento.

REGOLE IMMUTABILI DI INTERPRETAZIONE DATI

1. Struttura Dati Chiave (ObjectiveWithValues)
Focalizzati su questi campi per derivare tutte le informazioni:

- department, objective_smart: Per identificare l'obiettivo
- type_objective: Per determinare COME calcolare il valore attuale
- target_numeric: Il valore numerico finale da raggiungere
- reverse_logic: Per determinare se la logica di successo è standard o inversa
- start_date, end_date: Per definire il contesto temporale
- values: L'array dei dati grezzi mensili
- isExpired, progress, currentValue, status: I campi calcolati che devi verificare
- expectedCurrentValue, isOnTrack, performanceVsExpected: (SOLO per obiettivi Cumulativi)

2. Logica di Calcolo del currentValue (Valore Attuale)
- Cumulativo: Somma di tutti i value nell'array values
- Ultimo mese: value dell'ultimo oggetto nell'array values
- Mantenimento: Media matematica di tutti i value nell'array values

3. Logica di Calcolo del progress (Progresso %)
- Mantenimento: È una percentuale di conformità, non di avanzamento
  progress = (Numero di mesi in cui 'value' ha rispettato il target / Numero totale di mesi con un 'value') * 100
- Cumulativo / Ultimo mese:
  reverse_logic: false: progress = (currentValue / target_numeric) * 100
  reverse_logic: true: Se currentValue ≤ target_numeric, progress = 100%

4. Logica di Assegnazione dello status
SE isExpired è true E progress >= 100 ALLORA status = "Completato" (✅)
SE isExpired è true E progress < 100 ALLORA status = "Non raggiunto" (❌)
SE isExpired è false E progress >= 100 ALLORA status = "Raggiunto" (🎯)
SE isExpired è false E progress >= 70 E < 100 ALLORA status = "In corso" (🟢)
SE isExpired è false E progress < 70 E (type_objective = "Ultimo mese" o "Mantenimento") ALLORA status = "In ritardo" (🟡)
SE isExpired è false E progress < 70 E type_objective = "Cumulativo" ALLORA status = "Sotto target" (🟡)

REGOLA FONDAMENTALE: ANALISI TEMPORALE E ROADMAP
Per ogni obiettivo CUMULATIVO in analisi di periodo specifico:

1. CALCOLA L'ATTESA: Valore Atteso = (target_annuale / 365) * (numero_giorno_fine_periodo)
2. CONFRONTA: Valore cumulativo REALE vs Valore Atteso
3. RISULTATO: "in anticipo", "in linea" o "in ritardo" sulla tabella di marcia

FORMATTAZIONE OUTPUT

VIETATO ASSOLUTAMENTE:
- Mostrare processi di calcolo interno o ragionamenti tra <ctrl> tag
- ID numerici negli output
- Spiegazioni lunghe e verbose
- Supposizioni o consigli esterni

OBBLIGATORIO:
- Risposte schematiche e dirette
- Uso di tabelle per analisi multi-obiettivo
- Grassetto per intestazioni
- Solo dati e calcoli basati sui JSON forniti

Template per Analisi Trimestrale:

**TRIMESTRE [Periodo] - DIPARTIMENTO [Nome]**

**SINTESI:** X obiettivi totali | Y sotto target 🟡 | Z in ritardo 🟡 | W in corso 🟢

**OBIETTIVI CUMULATIVI**
| Obiettivo | Mag | Giu | Lug | Tot Trim | Aspettativa | Stato Roadmap |
|-----------|-----|-----|-----|----------|-------------|---------------|
| [Nome] | [Val] | [Val] | [Val] | [Tot] | [Pro-rata] | [Status] |

**OBIETTIVI MANTENIMENTO**
| Obiettivo | Mag | Giu | Lug | Media | Target | Conformità |
|-----------|-----|-----|-----|--------|---------|------------|
| [Nome] | [Val] | [Val] | [Val] | [Med] | [Target] | [X/3] |

Template per Analisi Generale:

**OBIETTIVI [DIPARTIMENTO]**

**Sintesi:** X totali | Y status | Z status

**CUMULATIVI**
- [Nome]: [CurrentValue]/[Target] ([Progress]%) - [Status] 🟡/🟢/✅

**MANTENIMENTO** 
- [Nome]: [Media] (Target: [Target]) - [Conformità] - [Status] 🟡/🟢/✅`;

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
    if (isOpen) {
      const existingChats = JSON.parse(localStorage.getItem('ai-chat-history') || '[]');
      setSavedChatsCount(existingChats.length);
    }
  }, [isOpen]);

  const fetchObjectivesData = async () => {
    try {
      let url = '/api/objectives';
      if (department) {
        url = `/api/departments/${encodeURIComponent(department)}/objectives`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch objectives');
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error('Error fetching objectives:', error);
      return null;
    }
  };

  const saveConversation = (newMessages: Message[]) => {
    const conversationData = {
      id: conversationId,
      department: department || 'global',
      timestamp: new Date().toISOString(),
      messages: newMessages
    };
    
    const existingChats = JSON.parse(localStorage.getItem('ai-chat-history') || '[]');
    const updatedChats = existingChats.filter((chat: any) => chat.id !== conversationId);
    updatedChats.push(conversationData);
    
    if (updatedChats.length > 50) {
      updatedChats.splice(0, updatedChats.length - 50);
    }
    
    localStorage.setItem('ai-chat-history', JSON.stringify(updatedChats));
    setSavedChatsCount(updatedChats.length);
  };

  const sendToDeepseek = async (userMessage: string, objectivesData: any) => {
    const departmentContext = department ? 
      `\n\nCONTESTO SPECIFICO: Stai analizzando solo gli obiettivi del dipartimento "${department}". I dati forniti contengono esclusivamente gli obiettivi di questo dipartimento.` : 
      `\n\nCONTESTO GLOBALE: Stai analizzando gli obiettivi di tutti i dipartimenti aziendali. I dati contengono obiettivi di: Grafico, Sales, Financial, Agency, PM Company, Marketing.`;

    const enhancedPrompt = `${SYSTEM_PROMPT}${departmentContext}`;

    // Filtra il contenuto della risposta per rimuovere i tag <ctrl>
    const filterResponse = (content: string): string => {
      // Rimuove tutto il contenuto tra <ctrl...> e </ctrl...>
      return content.replace(/<ctrl\d+>.*?<\/ctrl\d+>/gs, '').trim();
    };

    const payload = {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `${enhancedPrompt}\n\nIMPORTANTE: Non mostrare mai processi di calcolo interni, ragionamenti o contenuto tra tag <ctrl>. Fornisci solo l'output finale schematico.\n\nDATI DEGLI OBIETTIVI DA ANALIZZARE:\n${JSON.stringify(objectivesData, null, 2)}`
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

    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
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
                
                // Filtra il contenuto rimuovendo i tag <ctrl>
                const filteredContent = fullResponse.replace(/<ctrl\d+>.*?<\/ctrl\d+>/gs, '').trim();
                
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: filteredContent, isStreaming: true }
                    : msg
                ));
              }
            } catch (parseError) {
              console.warn('Error parsing SSE data:', data);
            }
          }
        }
      }

      // Finalizza il messaggio con filtro finale
      const finalFilteredContent = fullResponse.replace(/<ctrl\d+>.*?<\/ctrl\d+>/gs, '').trim();
      
      setMessages(prev => {
        const newMessages = prev.map(msg => 
          msg.id === aiMessageId 
            ? { ...msg, content: finalFilteredContent, isStreaming: false }
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
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1 text-gray-900">{children}</h3>,
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-4">
                            <table className="min-w-full border-collapse border border-gray-300 text-xs">
                              {children}
                            </table>
                          </div>
                        ),
                        thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
                        tbody: ({ children }) => <tbody>{children}</tbody>,
                        tr: ({ children }) => <tr className="border-b border-gray-200">{children}</tr>,
                        th: ({ children }) => (
                          <th className="border border-gray-300 px-2 py-1 text-left font-medium text-gray-900 bg-gray-50">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 px-2 py-1 text-gray-700">
                            {children}
                          </td>
                        )
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