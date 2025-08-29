'use client';

import { useState } from 'react';
import { ObjectiveWithValues } from '@/lib/types';
import { formatNumber } from '@/lib/formatters';
import { calculateObjectiveProgress, getProgressColor, getProgressTextColor, getProgressBgColor } from '@/lib/progress-calculator';

interface ScoreCardProps {
  objective: ObjectiveWithValues;
  onObjectiveUpdate?: (objectiveId: number, updates: { objective_smart?: string; target_numeric?: number; objective_name?: string; reverse_logic?: boolean }) => void;
}

export default function ScoreCard({ objective, onObjectiveUpdate }: ScoreCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [editTitle, setEditTitle] = useState(objective.objective_name || objective.objective_smart);
  const [editTarget, setEditTarget] = useState(objective.target_numeric.toString());
  const [lastClickTime, setLastClickTime] = useState<{[key: string]: number}>({});
  // Use the new progress calculator
  const progressResult = calculateObjectiveProgress(objective);
  const { currentValue, progress, status, isExpired, daysUntilExpiry } = progressResult;
  const targetValue = objective.target_numeric;
  
  // Get last update month for display
  const getLastUpdateMonth = () => {
    const currentYear = new Date().getFullYear();
    const availableValues = objective.values.filter(v => v.year === currentYear);
    if (availableValues.length === 0) return null;
    return Math.max(...availableValues.map(v => v.month));
  };
  
  const lastUpdateMonth = getLastUpdateMonth();
  
  const getStatusInfo = () => {
    return {
      status,
      color: getProgressTextColor(progress, status),
      bgColor: getProgressBgColor(progress, status),
      borderColor: status === 'Raggiunto' || status === 'Completato' ? 'border-green-500' : 
                   status === 'In corso' ? 'border-blue-500' : 
                   status === 'Non raggiunto' ? 'border-red-500' : 'border-red-500'
    };
  };

  const statusInfo = getStatusInfo();

  const formatValue = (value: number) => {
    return formatNumber(value, objective.number_format || 'number');
  };

  const getMonthName = (month: number | null) => {
    if (!month) return 'N/A';
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    return months[month - 1] || 'N/A';
  };

  const getCurrentValueLabel = () => {
    switch (objective.type_objective) {
      case 'Cumulativo': return 'Valore Cumulativo';
      case 'Mantenimento': return 'Media Attuale';
      case 'Ultimo mese': return 'Ultimo Valore';
      default: return 'Valore Attuale';
    }
  };

  const getTypeColor = () => {
    switch (objective.type_objective) {
      case 'Cumulativo': return 'bg-blue-50 text-blue-600';
      case 'Mantenimento': return 'bg-pink-50 text-brand-primary';
      case 'Ultimo mese': return 'bg-orange-50 text-brand-secondary';
      default: return 'bg-gray-50 text-brand-text';
    }
  };

  // Handle double click detection
  const handleDoubleClick = (field: 'title' | 'target') => {
    if (field === 'title') {
      setIsEditingTitle(true);
      setEditTitle(objective.objective_name || objective.objective_smart);
    } else if (field === 'target') {
      setIsEditingTarget(true);
      setEditTarget(objective.target_numeric.toString());
    }
  };

  const handleClick = (field: 'title' | 'target') => {
    const currentTime = Date.now();
    const lastClick = lastClickTime[field] || 0;
    
    if (currentTime - lastClick < 500) { // Double click detected
      handleDoubleClick(field);
      setLastClickTime({ ...lastClickTime, [field]: 0 });
    } else {
      setLastClickTime({ ...lastClickTime, [field]: currentTime });
    }
  };

  const handleSave = (field: 'title' | 'target') => {
    if (!onObjectiveUpdate) return;

    try {
      if (field === 'title') {
        onObjectiveUpdate(objective.id, { objective_name: editTitle });
        setIsEditingTitle(false);
      } else if (field === 'target') {
        const numValue = parseFloat(editTarget);
        if (!isNaN(numValue)) {
          onObjectiveUpdate(objective.id, { target_numeric: numValue });
          setIsEditingTarget(false);
        }
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleCancel = (field: 'title' | 'target') => {
    if (field === 'title') {
      setIsEditingTitle(false);
      setEditTitle(objective.objective_name || objective.objective_smart);
    } else if (field === 'target') {
      setIsEditingTarget(false);
      setEditTarget(objective.target_numeric.toString());
    }
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border-2 group ${
      statusInfo.borderColor
    }`}>
      {/* Status Badge */}
      {status === 'Completato' ? (
        <div className="relative">
          <div className="absolute -top-2 -right-2 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            ✅ COMPLETATO
          </div>
        </div>
      ) : status === 'Non raggiunto' ? (
        <div className="relative">
          <div className="absolute -top-2 -right-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            ❌ NON RAGGIUNTO
          </div>
        </div>
      ) : daysUntilExpiry <= 30 && daysUntilExpiry > 0 ? (
        <div className="relative">
          <div className="absolute -top-2 -right-2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10">
            ⚠️ {daysUntilExpiry}gg
          </div>
        </div>
      ) : null}
      
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="mb-3">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-lg font-semibold border border-brand-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave('title');
                    if (e.key === 'Escape') handleCancel('title');
                  }}
                />
                <div className="flex items-center space-x-2 mt-2">
                  <button 
                    onClick={() => handleSave('title')} 
                    className="px-3 py-1 text-sm bg-brand-primary text-white rounded hover:bg-pink-600"
                  >
                    ✓ Salva
                  </button>
                  <button 
                    onClick={() => handleCancel('title')} 
                    className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    ✕ Annulla
                  </button>
                </div>
              </div>
            ) : (
              <h3 
                onClick={() => handleClick('title')}
                className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-brand-primary transition-colors duration-200 cursor-pointer hover:bg-gray-50 p-2 rounded-lg" 
                title={`${objective.objective_smart} (Doppio click per modificare)`}
              >
                {objective.objective_name || objective.objective_smart.substring(0, 50) + (objective.objective_smart.length > 50 ? '...' : '')}
              </h3>
            )}
            <div className="flex space-x-2">
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getTypeColor()}`}>
                {objective.type_objective}
              </span>
              <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                {statusInfo.status}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar - Only for Cumulative objectives */}
        {objective.type_objective === 'Cumulativo' && (
          <div className="mb-6">
            <div className="flex justify-between text-base text-gray-700 mb-3">
              <span className="font-medium">Progresso</span>
              <span className="font-bold text-lg">{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress, status)}`}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            {objective.reverse_logic && (
              <div className="text-xs text-gray-500 mt-1 italic">
                ⬇️ Obiettivo inverso: migliore se sotto il target
              </div>
            )}
          </div>
        )}

        {/* Values */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="flex flex-col justify-center">
            <div className="text-sm text-brand-text mb-2 font-medium">
              {getCurrentValueLabel()}
            </div>
            <div className={`font-bold text-gray-900 ${
              objective.type_objective === 'Cumulativo' ? 'text-3xl' : 'text-4xl'
            }`}>
              {formatValue(currentValue)}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="text-sm text-brand-text mb-2 font-medium">Target Finale</div>
            {isEditingTarget ? (
              <div>
                <input
                  type="text"
                  value={editTarget}
                  onChange={(e) => setEditTarget(e.target.value)}
                  className={`w-full px-2 py-1 font-bold border border-brand-primary rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-right ${
                    objective.type_objective === 'Cumulativo' ? 'text-3xl' : 'text-4xl'
                  }`}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave('target');
                    if (e.key === 'Escape') handleCancel('target');
                  }}
                />
                <div className="flex items-center space-x-1 mt-2">
                  <button 
                    onClick={() => handleSave('target')} 
                    className="px-2 py-1 text-xs bg-brand-primary text-white rounded hover:bg-pink-600"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={() => handleCancel('target')} 
                    className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => handleClick('target')}
                className={`font-bold text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors ${
                  objective.type_objective === 'Cumulativo' ? 'text-3xl' : 'text-4xl'
                }`}
                title="Doppio click per modificare"
              >
                {formatValue(targetValue)}
              </div>
            )}
          </div>
        </div>

        {/* Date and Status Info */}
        <div className="mb-4 pb-4 border-b border-gray-50 space-y-2">
          <div className="flex justify-between items-center text-sm text-brand-text">
            <span>Ultimo aggiornamento:</span>
            <span className="font-semibold">
              {lastUpdateMonth ? getMonthName(lastUpdateMonth) + ' 2025' : 'Nessun dato'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-brand-text">Scadenza:</span>
            <span className={`font-semibold ${
              status === 'Completato' ? 'text-green-600' :
              status === 'Non raggiunto' ? 'text-red-600' :
              daysUntilExpiry <= 7 ? 'text-red-600' :
              daysUntilExpiry <= 30 ? 'text-orange-600' :
              'text-gray-600'
            }`}>
              {new Date(objective.end_date).toLocaleDateString('it-IT')}
              {status === 'Completato' ? ' (Completato)' :
               status === 'Non raggiunto' ? ' (Non raggiunto)' :
               daysUntilExpiry <= 1 ? ' (Domani!)' :
               daysUntilExpiry <= 7 ? ` (${daysUntilExpiry} giorni!)` :
               daysUntilExpiry <= 30 ? ` (${daysUntilExpiry} giorni)` :
               ''}
            </span>
          </div>
        </div>

        {/* Comparison */}
        <div className="">
          <div className="flex justify-between items-center text-base">
            <span className="text-brand-text font-medium">vs Target:</span>
            <span className={`font-bold text-lg ${
              objective.reverse_logic
                ? (currentValue <= targetValue ? 'text-green-600' : 'text-red-600')
                : (currentValue >= targetValue ? 'text-green-600' : 'text-orange-600')
            }`}>
              {objective.reverse_logic ? '' : (currentValue >= targetValue ? '+' : '')}
              {formatValue(currentValue - targetValue)}
              <span className="text-sm ml-2 opacity-75">
                ({currentValue >= targetValue ? '+' : ''}
                {((currentValue / targetValue - 1) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>
          {objective.reverse_logic && (
            <div className="text-xs text-gray-500 mt-1">
              {currentValue <= targetValue 
                ? '✅ Sotto il target - ottimo!' 
                : '⚠️ Sopra il target - da migliorare'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  );
}