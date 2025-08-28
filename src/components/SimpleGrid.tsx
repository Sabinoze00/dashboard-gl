'use client';

import { useState } from 'react';
import { ObjectiveWithValues, Department } from '@/lib/types';

interface SimpleGridProps {
  objectives: ObjectiveWithValues[];
  department: Department;
  onValueUpdate: (objectiveId: number, month: number, year: number, value: number) => void;
}

export default function SimpleGrid({ objectives, department, onValueUpdate }: SimpleGridProps) {
  const [editingCell, setEditingCell] = useState<{objectiveId: number, month: number} | null>(null);
  const [editValue, setEditValue] = useState('');

  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  const getMonthValue = (objective: ObjectiveWithValues, month: number) => {
    const monthData = objective.values.find(v => v.month === month && v.year === 2025);
    return monthData?.value || 0;
  };

  const handleCellClick = (objectiveId: number, month: number) => {
    const objective = objectives.find(o => o.id === objectiveId);
    if (objective) {
      const currentValue = getMonthValue(objective, month);
      setEditingCell({ objectiveId, month });
      setEditValue(currentValue.toString());
    }
  };

  const handleSave = () => {
    if (editingCell) {
      const value = parseFloat(editValue);
      if (!isNaN(value)) {
        onValueUpdate(editingCell.objectiveId, editingCell.month, 2025, value);
      }
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  if (objectives.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-lg border">
        <div className="text-gray-400 text-2xl mb-4">📊</div>
        <p className="text-gray-600">Nessun obiettivo da mostrare nella griglia</p>
        <p className="text-sm text-gray-500 mt-2">Aggiungi degli obiettivi per visualizzarli qui</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          Griglia Obiettivi ({objectives.length} obiettivi)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Clicca su una cella mensile per modificare il valore
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Obiettivo
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target
              </th>
              {months.map((month, index) => (
                <th key={month} className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {objectives.map((objective) => (
              <tr key={objective.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900 sticky left-0 bg-white z-10 border-r">
                  <div className="max-w-xs">
                    <p className="font-medium truncate">{objective.objective_smart}</p>
                  </div>
                </td>
                <td className="px-3 py-4 text-sm text-gray-500">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    objective.type_objective === 'Cumulativo' 
                      ? 'bg-blue-100 text-blue-800'
                      : objective.type_objective === 'Mantenimento'
                      ? 'bg-purple-100 text-purple-800'  
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {objective.type_objective}
                  </span>
                </td>
                <td className="px-3 py-4 text-sm text-gray-900 text-right font-medium">
                  {objective.target_numeric.toLocaleString()}
                </td>
                {months.map((month, monthIndex) => {
                  const monthNumber = monthIndex + 1;
                  const value = getMonthValue(objective, monthNumber);
                  const isEditing = editingCell?.objectiveId === objective.id && editingCell?.month === monthNumber;
                  const isCurrentMonth = new Date().getMonth() + 1 === monthNumber;
                  const isFutureMonth = monthNumber > new Date().getMonth() + 1;
                  
                  return (
                    <td key={month} className={`px-3 py-4 text-sm text-right ${
                      isFutureMonth 
                        ? 'bg-gray-50 text-gray-400'
                        : isCurrentMonth 
                        ? 'bg-green-50' 
                        : 'bg-white'
                    }`}>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-20 px-1 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave();
                              if (e.key === 'Escape') handleCancel();
                            }}
                          />
                          <button
                            onClick={handleSave}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleCellClick(objective.id, monthNumber)}
                          className="w-full text-right hover:bg-blue-50 px-2 py-1 rounded cursor-pointer"
                          disabled={isFutureMonth}
                        >
                          {value > 1000 ? (value / 1000).toFixed(1) + 'K' : value.toLocaleString()}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}