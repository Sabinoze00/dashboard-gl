'use client';

import { useState } from 'react';
import { Department, ObjectiveType, NumberFormat } from '@/lib/types';
import { getFormatLabel, getFormatExample, parseFormattedNumber } from '@/lib/formatters';

interface AddObjectiveFormProps {
  department: Department;
  onObjectiveAdded: () => void;
  onCancel: () => void;
}

export default function AddObjectiveForm({ department, onObjectiveAdded, onCancel }: AddObjectiveFormProps) {
  const [formData, setFormData] = useState({
    objective_name: '',
    objective_smart: '',
    type_objective: 'Mantenimento' as ObjectiveType,
    target_numeric: '',
    number_format: 'number' as NumberFormat,
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    reverse_logic: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          department,
          target_numeric: parseFormattedNumber(formData.target_numeric, formData.number_format)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione');
      }

      onObjectiveAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Nuovo Obiettivo - {department}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-brand-primary transition-colors duration-200 p-2 rounded-xl hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nome Obiettivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Obiettivo (abbreviato) *
              </label>
              <input
                type="text"
                name="objective_name"
                value={formData.objective_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="es. Fatturato Annuale, Nuovi Clienti..."
              />
              <div className="mt-1 text-xs text-gray-500">
                Nome breve che sarà mostrato nei grafici e nelle scorecard
              </div>
            </div>

            {/* Descrizione Obiettivo SMART */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrizione Obiettivo SMART *
              </label>
              <textarea
                name="objective_smart"
                value={formData.objective_smart}
                onChange={handleChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="es. Aumentare il fatturato del 20% rispetto al 2024..."
              />
              <div className="mt-1 text-xs text-gray-500">
                Descrizione completa dell'obiettivo secondo i criteri SMART
              </div>
            </div>

            {/* Tipo Obiettivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Obiettivo *
              </label>
              <select
                name="type_objective"
                value={formData.type_objective}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Mantenimento">Mantenimento - Target mensile costante</option>
                <option value="Cumulativo">Cumulativo - Somma progressiva verso target</option>
                <option value="Ultimo mese">Ultimo mese - Solo valore finale</option>
              </select>
              <div className="mt-2 text-xs text-gray-500">
                {formData.type_objective === 'Mantenimento' && 'Il target deve essere raggiunto ogni mese (es. 15 clienti/mese)'}
                {formData.type_objective === 'Cumulativo' && 'I valori si sommano verso il target annuale (es. 500.000€ totali)'}
                {formData.type_objective === 'Ultimo mese' && 'Solo il valore finale conta (es. riduzione costi 10%)'}
              </div>
            </div>

            {/* Formato Numero */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato Visualizzazione *
              </label>
              <select
                name="number_format"
                value={formData.number_format}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="number">Numero (12.5K)</option>
                <option value="currency">Valuta (€12.500)</option>
                <option value="percentage">Percentuale (12,5%)</option>
                <option value="decimal">Decimale (12,50)</option>
              </select>
              <div className="mt-1 text-xs text-gray-500">
                {getFormatExample(formData.number_format)}
              </div>
            </div>

            {/* Target Numerico */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Numerico *
              </label>
              <input
                type="text"
                name="target_numeric"
                value={formData.target_numeric}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  formData.number_format === 'currency' ? 'es. 500000 o €500K' :
                  formData.number_format === 'percentage' ? 'es. 15 (per 15%)' :
                  formData.number_format === 'decimal' ? 'es. 12.50' :
                  'es. 500000 per 500K'
                }
              />
              <div className="mt-1 text-xs text-gray-500">
                Inserisci il valore numerico. Formato: {getFormatLabel(formData.number_format)}
              </div>
            </div>

            {/* Reverse Logic Checkbox */}
            <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                name="reverse_logic"
                checked={formData.reverse_logic}
                onChange={(e) => setFormData({...formData, reverse_logic: e.target.checked})}
                className="mt-1 h-4 w-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
              />
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  🔄 Obiettivo Inverso
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Seleziona se per questo obiettivo <strong>valori più bassi sono migliori</strong> (es. tasso di insoluto, tempo di risposta, costi)
                </p>
                <div className="text-xs text-gray-500 mt-2">
                  <strong>Esempi:</strong> Tasso insoluto 3% con target 5% = 100% raggiunto ✅
                </div>
              </div>
            </div>

            {/* Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inizio *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fine *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
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

            {/* Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Annulla
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creazione...' : 'Crea Obiettivo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}