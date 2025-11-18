'use client';

import { useState } from 'react';
import { Department, ObjectiveType, NumberFormat } from '@/lib/types';
import { parseFormattedNumber } from '@/lib/formatters';

interface BulkObjective {
  id: string;
  objective_name: string;
  objective_smart: string;
  type_objective: ObjectiveType;
  target_numeric: string;
  number_format: NumberFormat;
  start_date: string;
  end_date: string;
  reverse_logic: boolean;
}

interface BulkObjectiveFormProps {
  department: Department;
  onObjectivesAdded: () => void;
  onCancel: () => void;
}

export default function BulkObjectiveForm({ department, onObjectivesAdded, onCancel }: BulkObjectiveFormProps) {
  const [objectives, setObjectives] = useState<BulkObjective[]>([
    {
      id: '1',
      objective_name: '',
      objective_smart: '',
      type_objective: 'Mantenimento',
      target_numeric: '',
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      reverse_logic: false
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasteHelper, setShowPasteHelper] = useState(false);
  const [recentlyPasted, setRecentlyPasted] = useState<Set<string>>(new Set());

  const addRow = () => {
    const newId = (Math.max(...objectives.map(o => parseInt(o.id))) + 1).toString();
    setObjectives([...objectives, {
      id: newId,
      objective_name: '',
      objective_smart: '',
      type_objective: 'Mantenimento',
      target_numeric: '',
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      reverse_logic: false
    }]);
  };

  const removeRow = (id: string) => {
    if (objectives.length > 1) {
      setObjectives(objectives.filter(obj => obj.id !== id));
    }
  };

  const updateObjective = (id: string, field: keyof BulkObjective, value: string) => {
    setObjectives(objectives.map(obj => 
      obj.id === id ? { ...obj, [field]: value } : obj
    ));
  };

  const handlePaste = (e: React.ClipboardEvent, field: keyof BulkObjective, rowIndex: number) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    
    // Verifica se sono dati multi-riga (colonna copiata)
    // Supporta sia newline che tab/spazi come separatori
    let lines = pasteData.split(/\r?\n/).filter(line => line.trim() !== '');
    
    // Se non ci sono newline, prova con tab (tipico di Excel)
    if (lines.length === 1 && pasteData.includes('\t')) {
      lines = pasteData.split('\t').filter(line => line.trim() !== '');
    }
    
    if (lines.length > 1) {
      // Dati multi-riga: crea automaticamente le righe necessarie
      const currentObjectiveCount = objectives.length;
      const neededRows = Math.max(0, lines.length - (currentObjectiveCount - rowIndex));
      
      // Aggiungi righe se necessario
      const newObjectives = [...objectives];
      for (let i = 0; i < neededRows; i++) {
        const newId = (Math.max(...newObjectives.map(o => parseInt(o.id))) + 1).toString();
        newObjectives.push({
          id: newId,
          objective_name: '',
          objective_smart: '',
          type_objective: 'Mantenimento',
          target_numeric: '',
          number_format: 'number',
          start_date: '2025-01-01',
          end_date: '2025-12-31',
          reverse_logic: false
        });
      }
      
      // Applica i dati incollati
      lines.forEach((line, index) => {
        const targetIndex = rowIndex + index;
        if (targetIndex < newObjectives.length) {
          newObjectives[targetIndex] = {
            ...newObjectives[targetIndex],
            [field]: line.trim()
          };
        }
      });
      
      setObjectives(newObjectives);
      setShowPasteHelper(true);
      
      // Evidenzia i campi appena incollati
      const pastedKeys = new Set<string>();
      lines.forEach((_, index) => {
        const targetIndex = rowIndex + index;
        pastedKeys.add(`${targetIndex}-${field}`);
      });
      setRecentlyPasted(pastedKeys);
      
      setTimeout(() => {
        setShowPasteHelper(false);
        setRecentlyPasted(new Set());
      }, 3000);
    } else {
      // Dato singolo: incolla normalmente
      const targetObjective = objectives[rowIndex];
      if (targetObjective) {
        updateObjective(targetObjective.id, field, pasteData.trim());
      }
    }
  };

  const duplicateRow = (id: string) => {
    const objectiveToDuplicate = objectives.find(obj => obj.id === id);
    if (objectiveToDuplicate) {
      const newId = (Math.max(...objectives.map(o => parseInt(o.id))) + 1).toString();
      const duplicatedObjective = { ...objectiveToDuplicate, id: newId };
      const index = objectives.findIndex(obj => obj.id === id);
      setObjectives([
        ...objectives.slice(0, index + 1),
        duplicatedObjective,
        ...objectives.slice(index + 1)
      ]);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      // Rileva il separatore (virgola, punto e virgola, o tab)
      const separator = text.includes('\t') ? '\t' : text.includes(';') ? ';' : ',';
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length === 0) return;

      // Se c'è un header, lo salta
      const hasHeader = lines[0].toLowerCase().includes('nome') || 
                       lines[0].toLowerCase().includes('obiettivo') || 
                       lines[0].toLowerCase().includes('target');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      // Crea gli obiettivi dal file
      const importedObjectives: BulkObjective[] = dataLines.map((line, index) => {
        const columns = line.split(separator).map(col => col.trim());
        const newId = (Math.max(...objectives.map(o => parseInt(o.id))) + index + 1).toString();
        
        return {
          id: newId,
          objective_name: columns[0] || '',
          objective_smart: columns[1] || '',
          type_objective: (columns[2] as ObjectiveType) || 'Mantenimento',
          target_numeric: columns[3] || '',
          number_format: (columns[4] as NumberFormat) || 'number',
          start_date: columns[5] || '2025-01-01',
          end_date: columns[6] || '2025-12-31',
          reverse_logic: columns[7] === 'true' || false
        };
      });

      // Sostituisce gli obiettivi esistenti o li aggiunge
      setObjectives(importedObjectives);
      setShowPasteHelper(true);
      
      // Evidenzia tutti i campi importati
      const pastedKeys = new Set<string>();
      importedObjectives.forEach((_, index) => {
        pastedKeys.add(`${index}-objective_name`);
        pastedKeys.add(`${index}-objective_smart`);
        pastedKeys.add(`${index}-target_numeric`);
      });
      setRecentlyPasted(pastedKeys);
      
      setTimeout(() => {
        setShowPasteHelper(false);
        setRecentlyPasted(new Set());
      }, 5000);
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate all objectives
      const validObjectives = objectives.filter(obj => 
        obj.objective_name.trim() !== '' && obj.objective_smart.trim() !== '' && obj.target_numeric.trim() !== ''
      );

      if (validObjectives.length === 0) {
        throw new Error('Almeno un obiettivo deve essere completato');
      }

      // Create all objectives
      for (const objective of validObjectives) {
        const response = await fetch('/api/objectives', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            department,
            objective_name: objective.objective_name,
            objective_smart: objective.objective_smart,
            type_objective: objective.type_objective,
            target_numeric: parseFormattedNumber(objective.target_numeric, objective.number_format),
            number_format: objective.number_format,
            start_date: objective.start_date,
            end_date: objective.end_date,
            reverse_logic: objective.reverse_logic
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Errore nell'obiettivo "${objective.objective_smart}": ${errorData.error}`);
        }
      }

      onObjectivesAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Creazione Obiettivi in Blocco - {department}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-brand-text mt-2">
            Crea più obiettivi contemporaneamente. Doppio click per modificare • Seleziona celle e premi Ctrl+V per incollare da Excel
          </p>
          <div className="flex items-center space-x-2 mt-4 p-4 bg-brand-primary bg-opacity-10 rounded-xl">
            <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-brand-primary font-medium">
              💡 <strong>Funzionalità avanzate:</strong><br/>
              • Copia dati da Excel e incolla direttamente - righe create automaticamente<br/>
              • Importa file CSV/TXT per creazione massiva<br/>
              • Trascina per selezionare più celle e incolla in blocco
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200 table-fixed bg-white rounded-xl shadow-sm border border-gray-100" style={{minWidth: '1400px'}}>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '50px'}}>
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10" style={{width: '200px'}}>
                    Nome Obiettivo *
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '300px', minWidth: '300px'}}>
                    Descrizione SMART *
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '150px'}}>
                    Tipo *
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                    Formato *
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                    Target *
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '130px'}}>
                    Data Inizio
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '130px'}}>
                    Data Fine
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '100px'}}>
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {objectives.map((objective, index) => (
                  <tr key={objective.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white">
                      <input
                        type="text"
                        value={objective.objective_name}
                        onChange={(e) => updateObjective(objective.id, 'objective_name', e.target.value)}
                        onPaste={(e) => handlePaste(e, 'objective_name', index)}
                        className={`w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 ${
                          recentlyPasted.has(`${index}-objective_name`) ? 'bg-green-50 border-green-300' : 'hover:border-gray-300'
                        }`}
                        placeholder="es. Fatturato Annuale"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <textarea
                        value={objective.objective_smart}
                        onChange={(e) => updateObjective(objective.id, 'objective_smart', e.target.value)}
                        onPaste={(e) => handlePaste(e, 'objective_smart', index)}
                        className={`w-full h-20 px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none transition-all duration-200 ${
                          recentlyPasted.has(`${index}-objective_smart`) ? 'bg-green-50 border-green-300' : 'hover:border-gray-300'
                        }`}
                        placeholder="es. Aumentare il fatturato del 20% rispetto al 2024..."
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={objective.type_objective}
                        onChange={(e) => updateObjective(objective.id, 'type_objective', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white hover:border-gray-300 transition-all duration-200"
                      >
                        <option value="Mantenimento">Mantenimento</option>
                        <option value="Cumulativo">Cumulativo</option>
                        <option value="Ultimo mese">Ultimo mese</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={objective.number_format}
                        onChange={(e) => updateObjective(objective.id, 'number_format', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white hover:border-gray-300 transition-all duration-200"
                      >
                        <option value="number">Numero</option>
                        <option value="currency">Valuta (€)</option>
                        <option value="percentage">Percentuale (%)</option>
                        <option value="decimal">Decimale</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={objective.target_numeric}
                        onChange={(e) => updateObjective(objective.id, 'target_numeric', e.target.value)}
                        onPaste={(e) => handlePaste(e, 'target_numeric', index)}
                        className={`w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all duration-200 text-center font-medium ${
                          recentlyPasted.has(`${index}-target_numeric`) ? 'bg-green-50 border-green-300' : 'hover:border-gray-300'
                        }`}
                        placeholder={
                          objective.number_format === 'currency' ? 'es. 500000' :
                          objective.number_format === 'percentage' ? 'es. 15' :
                          objective.number_format === 'decimal' ? 'es. 12.50' :
                          'es. 500000'
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="date"
                        value={objective.start_date}
                        onChange={(e) => updateObjective(objective.id, 'start_date', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary hover:border-gray-300 transition-all duration-200"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="date"
                        value={objective.end_date}
                        onChange={(e) => updateObjective(objective.id, 'end_date', e.target.value)}
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary hover:border-gray-300 transition-all duration-200"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          type="button"
                          onClick={() => duplicateRow(objective.id)}
                          className="p-2 text-brand-primary hover:text-brand-secondary hover:bg-brand-primary hover:bg-opacity-10 rounded-lg transition-all duration-200"
                          title="Duplica riga"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        {objectives.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(objective.id)}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Elimina riga"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center px-6 py-3 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Aggiungi Riga
            </button>
            
            <div className="relative">
              <input
                type="file"
                accept=".csv,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileImport}
              />
              <button
                type="button"
                className="inline-flex items-center px-6 py-3 border border-brand-primary rounded-xl shadow-sm bg-brand-primary text-white text-sm font-medium hover:bg-brand-secondary transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3 3-3M12 12l0 9" />
                </svg>
                Importa CSV/TXT
              </button>
            </div>
          </div>

          {showPasteHelper && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">
                    ✅ <strong>Dati importati!</strong> Ho creato automaticamente le righe corrispondenti. Controlla i dati e compila i campi mancanti.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="text-red-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-brand-primary bg-opacity-10 rounded-full">
                <svg className="w-4 h-4 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-sm text-brand-text font-medium">
                <span className="text-brand-primary font-bold">
                  {objectives.filter(obj => obj.objective_name.trim() !== '' && obj.objective_smart.trim() !== '' && obj.target_numeric.trim() !== '').length}
                </span> di {objectives.length} obiettivi compilati
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-8 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-brand-primary to-brand-secondary border border-transparent rounded-xl hover:from-brand-secondary hover:to-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Creazione...</span>
                  </div>
                ) : (
                  `Crea ${objectives.filter(obj => obj.objective_name.trim() !== '' && obj.objective_smart.trim() !== '' && obj.target_numeric.trim() !== '').length} Obiettivi`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}