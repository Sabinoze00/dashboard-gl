'use client';

import { useState, useEffect, useRef } from 'react';
import { ObjectiveWithValues, Department } from '@/lib/types';
import { formatNumber } from '@/lib/formatters';

interface AdvancedGridProps {
  objectives: ObjectiveWithValues[];
  department: Department;
  onValueUpdate: (objectiveId: number, month: number, year: number, value: number) => void;
  onObjectiveUpdate: (objectiveId: number, updates: { objective_smart?: string; type_objective?: string; target_numeric?: number; objective_name?: string; number_format?: string; start_date?: string; end_date?: string }) => void;
  onObjectiveDelete: (objectiveId: number) => void;
  onRefresh?: () => void;
  readOnly?: boolean;
}

// type EditMode = 'none' | 'single';
type SelectionRange = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
} | null;
type EditingCell = {
  objectiveId: number;
  field: string;
  month?: number;
} | null;

export default function AdvancedGrid({
  objectives,
  onValueUpdate,
  onObjectiveUpdate,
  onObjectiveDelete,
  onRefresh,
  readOnly = false
}: AdvancedGridProps) {
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const [selectedRange, setSelectedRange] = useState<SelectionRange>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [lastClickTime, setLastClickTime] = useState<{[key: string]: number}>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [objectiveColumnWidth, setObjectiveColumnWidth] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [selectedObjectives, setSelectedObjectives] = useState<Set<number>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const objectiveTypes = ['Mantenimento', 'Cumulativo', 'Ultimo mese'];
  const numberFormats = [
    { value: 'number', label: 'Numero' },
    { value: 'currency', label: 'Valuta (€)' },
    { value: 'percentage', label: 'Percentuale (%)' },
    { value: 'decimal', label: 'Decimale' }
  ];

  // Handle click outside to deselect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (gridRef.current && !gridRef.current.contains(event.target as Node)) {
        setSelectedRange(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle column resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = objectiveColumnWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, Math.min(500, startWidth + (e.clientX - startX)));
      setObjectiveColumnWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle objective selection
  const handleObjectiveSelect = (objectiveId: number, checked: boolean) => {
    const newSelection = new Set(selectedObjectives);
    if (checked) {
      newSelection.add(objectiveId);
    } else {
      newSelection.delete(objectiveId);
    }
    setSelectedObjectives(newSelection);
    setShowBulkActions(newSelection.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedObjectives(new Set(objectives.map(obj => obj.id)));
    } else {
      setSelectedObjectives(new Set());
    }
    setShowBulkActions(checked && objectives.length > 0);
  };

  const handleBulkDelete = async () => {
    if (selectedObjectives.size === 0) return;

    const objectiveNames = objectives
      .filter(obj => selectedObjectives.has(obj.id))
      .map(obj => obj.objective_name || obj.objective_smart)
      .slice(0, 5); // Show max 5 names

    const confirmMessage = `Sei sicuro di voler eliminare ${selectedObjectives.size} obiettivi?\n\n${objectiveNames.join('\n')}${selectedObjectives.size > 5 ? '\n...' : ''}`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setIsUpdating(true);
      const response = await fetch('/api/objectives/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectiveIds: Array.from(selectedObjectives)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete objectives');
      }

      // Reset selection and refresh
      setSelectedObjectives(new Set());
      setShowBulkActions(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting objectives:', error);
      alert('❌ Errore durante l\'eliminazione degli obiettivi');
    } finally {
      setIsUpdating(false);
    }
  };

  const getMonthValue = (objective: ObjectiveWithValues, month: number) => {
    const monthData = objective.values.find(v => v.month === month && v.year === 2025);
    return monthData?.value || 0;
  };

  // Handle double click for editing
  const handleDoubleClick = (objectiveId: number, field: string, month?: number) => {
    if (readOnly) return; // Disable editing in read-only mode
    setEditingCell({ objectiveId, field, month });
    if (field === 'month' && month) {
      setEditValue(getMonthValue(objectives.find(o => o.id === objectiveId)!, month).toString());
    } else {
      const objective = objectives.find(o => o.id === objectiveId);
      if (objective) {
        if (field === 'objective_smart') setEditValue(objective.objective_name || objective.objective_smart);
        else if (field === 'type_objective') setEditValue(objective.type_objective);
        else if (field === 'target_numeric') setEditValue(objective.target_numeric.toString());
        else if (field === 'number_format') setEditValue(objective.number_format || 'number');
        else if (field === 'start_date') setEditValue(objective.start_date || '');
        else if (field === 'end_date') setEditValue(objective.end_date || '');
        else if (field === 'reverse_logic') setEditValue(objective.reverse_logic ? 'true' : 'false');
      }
    }
  };

  // Handle automatic paste on selected range
  const handlePasteToSelection = async (pastedText: string) => {
    if (readOnly) return; // Disable paste in read-only mode
    if (!selectedRange || !pastedText.trim()) return;

    setIsUpdating(true);
    try {
      const lines = pastedText.trim().split('\n');
      const monthUpdates: Array<{objectiveId: number, month: number, value: number}> = [];
      const objectiveUpdates: Array<{objectiveId: number, updates: any}> = [];
      
      const rowCount = selectedRange.endRow - selectedRange.startRow + 1;
      const colCount = selectedRange.endCol - selectedRange.startCol + 1;
      
      // Define column mapping: 0=checkbox, 1=actions, 2=title, 3=type, 4=target, 5=format, 6=start_date, 7=end_date, 8=reverse_logic, 9-20=months
      const getColumnType = (colIndex: number) => {
        if (colIndex === 2) return 'title';
        if (colIndex === 3) return 'type';  
        if (colIndex === 4) return 'target';
        if (colIndex === 5) return 'format';
        if (colIndex === 6) return 'start_date';
        if (colIndex === 7) return 'end_date';
        if (colIndex === 8) return 'reverse_logic';
        if (colIndex >= 9 && colIndex <= 20) return 'month';
        return null;
      };
      
      // Process each line within selection
      for (let lineIndex = 0; lineIndex < Math.min(lines.length, rowCount); lineIndex++) {
        const line = lines[lineIndex];
        const values = line.split('\t');
        
        const rowIndex = selectedRange.startRow + lineIndex;
        if (rowIndex >= objectives.length) break;
        
        const objective = objectives[rowIndex];
        if (!objective) continue;
        
        let objUpdates: any = {};
        
        // Process each value within selection
        for (let valueIndex = 0; valueIndex < Math.min(values.length, colCount); valueIndex++) {
          let rawValue = values[valueIndex].trim();
          
          // Remove surrounding quotes if present (Excel adds them for text with commas)
          if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
            rawValue = rawValue.slice(1, -1).trim();
          }
          
          // Skip empty values after quote removal
          if (!rawValue) continue;
          
          const actualColIndex = selectedRange.startCol + valueIndex;
          const colType = getColumnType(actualColIndex);
          
          if (colType === 'title') {
            objUpdates.objective_name = rawValue;
          } else if (colType === 'type') {
            if (objectiveTypes.includes(rawValue)) {
              objUpdates.type_objective = rawValue;
            }
          } else if (colType === 'target') {
            const numericValue = parseFloat(rawValue.replace(/[^\d.,-]/g, '').replace(',', '.'));
            if (!isNaN(numericValue)) {
              objUpdates.target_numeric = numericValue;
            }
          } else if (colType === 'format') {
            const validFormats = numberFormats.map(f => f.value);
            if (validFormats.includes(rawValue)) {
              objUpdates.number_format = rawValue;
            }
          } else if (colType === 'start_date') {
            // Validate date format
            if (rawValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
              objUpdates.start_date = rawValue;
            }
          } else if (colType === 'end_date') {
            // Validate date format
            if (rawValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
              objUpdates.end_date = rawValue;
            }
          } else if (colType === 'reverse_logic') {
            // Parse boolean values
            const lowerValue = rawValue.toLowerCase();
            if (['true', '1', 'sì', 'si', 'yes', 'inverso'].includes(lowerValue)) {
              objUpdates.reverse_logic = true;
            } else if (['false', '0', 'no', 'normale'].includes(lowerValue)) {
              objUpdates.reverse_logic = false;
            }
          } else if (colType === 'month') {
            const numericValue = parseFloat(rawValue.replace(/[^\d.,-]/g, '').replace(',', '.'));
            if (!isNaN(numericValue)) {
              const month = actualColIndex - 8; // Adjust for checkbox, actions, title, type, target, format, start_date, end_date, reverse_logic columns
              if (month >= 1 && month <= 12) {
                monthUpdates.push({
                  objectiveId: objective.id,
                  month,
                  value: numericValue
                });
              }
            }
          }
        }
        
        if (Object.keys(objUpdates).length > 0) {
          objectiveUpdates.push({
            objectiveId: objective.id,
            updates: objUpdates
          });
        }
      }
      
      let totalUpdates = 0;
      
      // Apply objective updates (without triggering refresh for each)
      for (const update of objectiveUpdates) {
        try {
          const response = await fetch(`/api/objectives/${update.objectiveId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(update.updates),
          });
          
          if (response.ok) {
            totalUpdates++;
          }
        } catch (error) {
          console.error('Error updating objective:', error);
        }
      }
      
      // Apply month value updates (without triggering refresh for each)
      for (const update of monthUpdates) {
        try {
          const response = await fetch(`/api/objectives/${update.objectiveId}/values`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ month: update.month, year: 2025, value: update.value }),
          });
          
          if (response.ok) {
            totalUpdates++;
          }
        } catch (error) {
          console.error('Error updating value:', error);
        }
      }
      
      setSelectedRange(null);
      // Refresh data once at the end
      if (onRefresh) {
        onRefresh();
      }
      // Removed success alert - only show errors
      
    } catch (error) {
      console.error('Errore durante l\'incollaggio:', error);
      alert('❌ Errore durante l\'incollaggio dei dati');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'v') {
      event.preventDefault();
      navigator.clipboard.readText().then(text => {
        if (selectedRange) {
          handlePasteToSelection(text);
        }
      });
    }
  };

  // Handle cell selection for drag & drop
  const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
    setIsSelecting(true);
    setSelectedRange({
      startRow: rowIndex,
      startCol: colIndex,
      endRow: rowIndex,
      endCol: colIndex
    });
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelecting && selectedRange) {
      setSelectedRange({
        ...selectedRange,
        endRow: rowIndex,
        endCol: colIndex
      });
    }
  };

  const handleCellMouseUp = () => {
    setIsSelecting(false);
  };

  // Handle double click detection
  const handleCellClick = (objectiveId: number, field: string, month?: number, rowIndex?: number, colIndex?: number) => {
    const cellKey = `${objectiveId}-${field}-${month || 0}`;
    const currentTime = Date.now();
    const lastClick = lastClickTime[cellKey] || 0;
    
    if (currentTime - lastClick < 500) { // Double click detected (500ms threshold)
      handleDoubleClick(objectiveId, field, month);
      setLastClickTime({ ...lastClickTime, [cellKey]: 0 }); // Reset to prevent triple click
    } else {
      setLastClickTime({ ...lastClickTime, [cellKey]: currentTime });
      
      // Handle single click for selection (for all selectable columns)
      if (typeof rowIndex === 'number' && typeof colIndex === 'number') {
        handleCellMouseDown(rowIndex, colIndex);
      }
    }
  };

  const handleSave = () => {
    if (!editingCell) return;
    
    try {
      if (editingCell.field === 'month' && editingCell.month) {
        const numValue = parseFloat(editValue);
        if (!isNaN(numValue)) {
          onValueUpdate(editingCell.objectiveId, editingCell.month, 2025, numValue);
        }
      } else {
        const updates: any = {};
        if (editingCell.field === 'objective_smart') {
          updates.objective_name = editValue;
        } else if (editingCell.field === 'type_objective') {
          if (objectiveTypes.includes(editValue)) {
            updates.type_objective = editValue;
          }
        } else if (editingCell.field === 'target_numeric') {
          const numValue = parseFloat(editValue);
          if (!isNaN(numValue)) {
            updates.target_numeric = numValue;
          }
        } else if (editingCell.field === 'number_format') {
          const validFormats = numberFormats.map(f => f.value);
          if (validFormats.includes(editValue)) {
            updates.number_format = editValue;
          }
        } else if (editingCell.field === 'start_date') {
          if (editValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            updates.start_date = editValue;
          }
        } else if (editingCell.field === 'end_date') {
          if (editValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            updates.end_date = editValue;
          }
        } else if (editingCell.field === 'reverse_logic') {
          updates.reverse_logic = editValue === 'true';
        }
        
        if (Object.keys(updates).length > 0) {
          onObjectiveUpdate(editingCell.objectiveId, updates);
        }
      }
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Helper function to check if a cell is selected
  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!selectedRange) return false;
    const minRow = Math.min(selectedRange.startRow, selectedRange.endRow);
    const maxRow = Math.max(selectedRange.startRow, selectedRange.endRow);
    const minCol = Math.min(selectedRange.startCol, selectedRange.endCol);
    const maxCol = Math.max(selectedRange.startCol, selectedRange.endCol);
    return rowIndex >= minRow && rowIndex <= maxRow && colIndex >= minCol && colIndex <= maxCol;
  };

  return (
    <div className="space-y-6">
      {/* Loading Bar */}
      {isUpdating && (
        <div className="bg-brand-primary bg-opacity-10 border border-brand-primary rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-primary"></div>
            <span className="text-brand-primary font-medium">Aggiornamento in corso...</span>
          </div>
          <div className="w-full bg-brand-primary bg-opacity-20 rounded-full h-2 mt-3">
            <div className="bg-brand-primary h-2 rounded-full animate-pulse" style={{width: '100%'}}></div>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {!readOnly && showBulkActions && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-blue-800 font-medium">
              {selectedObjectives.size} obiettivi selezionati
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSelectedObjectives(new Set());
                setShowBulkActions(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              Deseleziona tutto
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium flex items-center space-x-2"
              disabled={isUpdating}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Elimina Selezionati</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {readOnly ? 'Griglia Archivio (Sola Lettura)' : 'Griglia Editing Avanzata'}
            </h3>
            <p className="text-brand-text">
              {readOnly
                ? 'Visualizzazione dati storici - Le modifiche sono disabilitate'
                : 'Doppio click per modificare • Seleziona celle e premi Ctrl+V per incollare da Excel'
              }
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {selectedRange && (
              <div className="text-sm text-brand-primary bg-pink-50 px-4 py-2 rounded-xl font-medium">
                📋 {Math.abs(selectedRange.endRow - selectedRange.startRow) + 1} × {Math.abs(selectedRange.endCol - selectedRange.startCol) + 1} celle selezionate
              </div>
            )}
            
            <div className="text-sm text-brand-text bg-gray-50 px-4 py-2 rounded-xl">
              💡 <kbd className="bg-white px-2 py-1 rounded border text-xs font-mono">Ctrl+V</kbd> per incollare nella selezione
            </div>
          </div>
        </div>
        
        <div 
          ref={gridRef}
          className="w-full overflow-x-auto" 
          onKeyDown={handleKeyDown} 
          onMouseUp={handleCellMouseUp}
          tabIndex={0} 
          style={{outline: 'none'}}
        >
          <table className="w-full divide-y divide-gray-200 table-fixed" style={{minWidth: '1900px', width: '100%'}}>
            <thead className="bg-gray-50">
              <tr>
                {!readOnly && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '50px'}}>
                    <input
                      type="checkbox"
                      checked={selectedObjectives.size === objectives.length && objectives.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                    />
                  </th>
                )}
                {!readOnly && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                )}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 relative"
                  style={{width: `${objectiveColumnWidth}px`}}
                >
                  <div className="flex items-center justify-between">
                    <span>Obiettivo</span>
                    <div 
                      className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-brand-primary transition-colors ${isResizing ? 'bg-brand-primary' : ''}`}
                      onMouseDown={handleMouseDown}
                      title="Trascina per ridimensionare la colonna"
                    />
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>
                  Tipo
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>
                  Target
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '110px', minWidth: '110px'}}>
                  Formato
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>
                  Data Inizio
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px', minWidth: '120px'}}>
                  Data Fine
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '90px', minWidth: '90px'}}>
                  Logica
                </th>
                {months.map((month) => (
                  <th key={month} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '90px', minWidth: '90px'}}>
                    {month}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {objectives.map((objective, index) => (
                <tr key={objective.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {/* Selection Checkbox */}
                  {!readOnly && (
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedObjectives.has(objective.id)}
                        onChange={(e) => handleObjectiveSelect(objective.id, e.target.checked)}
                        className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                      />
                    </td>
                  )}
                  {/* Actions */}
                  {!readOnly && (
                    <td className="px-4 py-2">
                      <button
                        onClick={() => {
                          if (confirm('Sei sicuro di voler eliminare questo obiettivo?')) {
                            onObjectiveDelete(objective.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        🗑️ Elimina
                      </button>
                    </td>
                  )}

                  {/* Objective Smart */}
                  <td
                    className={`px-4 py-2 sticky left-0 bg-inherit z-10 ${isCellSelected(index, 0) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}
                    style={{width: `${objectiveColumnWidth}px`}}
                  >
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'objective_smart' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'objective_smart', undefined, index, 2)}
                        onMouseDown={() => handleCellMouseDown(index, 2)}
                        onMouseEnter={() => handleCellMouseEnter(index, 2)}
                        className="w-full text-left hover:bg-blue-50 p-2 rounded cursor-pointer select-none"
                      >
                        <p 
                          className="font-medium break-words leading-relaxed" 
                          title={objective.objective_smart}
                          style={{
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            WebkitLineClamp: objectiveColumnWidth > 300 ? 4 : 2
                          }}
                        >
                          {objective.objective_name || objective.objective_smart}
                        </p>
                      </div>
                    )}
                  </td>

                  {/* Type Objective */}
                  <td className={`px-4 py-2 text-center ${isCellSelected(index, 1) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'type_objective' ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          autoFocus
                        >
                          {objectiveTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'type_objective', undefined, index, 1)}
                        onMouseDown={() => handleCellMouseDown(index, 1)}
                        onMouseEnter={() => handleCellMouseEnter(index, 1)}
                        className="w-full cursor-pointer select-none"
                      >
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          objective.type_objective === 'Cumulativo' 
                            ? 'bg-blue-100 text-blue-800'
                            : objective.type_objective === 'Mantenimento'
                            ? 'bg-purple-100 text-purple-800'  
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {objective.type_objective}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Target Numeric */}
                  <td className={`px-4 py-2 text-center ${isCellSelected(index, 2) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'target_numeric' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-right"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'target_numeric', undefined, index, 2)}
                        onMouseDown={() => handleCellMouseDown(index, 2)}
                        onMouseEnter={() => handleCellMouseEnter(index, 2)}
                        className="w-full text-right hover:bg-blue-50 px-2 py-1 rounded cursor-pointer font-medium select-none"
                      >
                        {formatNumber(objective.target_numeric, objective.number_format || 'number')}
                      </div>
                    )}
                  </td>

                  {/* Number Format */}
                  <td className={`px-4 py-2 text-center ${isCellSelected(index, 3) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'number_format' ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          autoFocus
                        >
                          {numberFormats.map(format => (
                            <option key={format.value} value={format.value}>{format.label}</option>
                          ))}
                        </select>
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'number_format', undefined, index, 3)}
                        onMouseDown={() => handleCellMouseDown(index, 3)}
                        onMouseEnter={() => handleCellMouseEnter(index, 3)}
                        className="w-full cursor-pointer select-none"
                      >
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {numberFormats.find(f => f.value === objective.number_format)?.label || 'Numero'}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Start Date */}
                  <td className={`px-4 py-2 text-center ${isCellSelected(index, 4) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'start_date' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'start_date', undefined, index, 4)}
                        onMouseDown={() => handleCellMouseDown(index, 4)}
                        onMouseEnter={() => handleCellMouseEnter(index, 4)}
                        className="w-full hover:bg-blue-50 px-2 py-1 rounded cursor-pointer select-none text-sm"
                      >
                        {objective.start_date ? new Date(objective.start_date).toLocaleDateString('it-IT') : '-'}
                      </div>
                    )}
                  </td>

                  {/* End Date */}
                  <td className={`px-4 py-2 text-center ${isCellSelected(index, 5) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'end_date' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSave();
                            if (e.key === 'Escape') handleCancel();
                          }}
                        />
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'end_date', undefined, index, 5)}
                        onMouseDown={() => handleCellMouseDown(index, 5)}
                        onMouseEnter={() => handleCellMouseEnter(index, 5)}
                        className="w-full hover:bg-blue-50 px-2 py-1 rounded cursor-pointer select-none text-sm"
                      >
                        {objective.end_date ? new Date(objective.end_date).toLocaleDateString('it-IT') : '-'}
                      </div>
                    )}
                  </td>

                  {/* Reverse Logic */}
                  <td className={`px-4 py-2 text-center ${isCellSelected(index, 8) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                    {editingCell?.objectiveId === objective.id && editingCell?.field === 'reverse_logic' ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary"
                          autoFocus
                        >
                          <option value="false">Normale</option>
                          <option value="true">Inverso</option>
                        </select>
                        <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                        <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleCellClick(objective.id, 'reverse_logic', undefined, index, 8)}
                        onMouseDown={() => handleCellMouseDown(index, 8)}
                        onMouseEnter={() => handleCellMouseEnter(index, 8)}
                        className="w-full hover:bg-blue-50 px-2 py-1 rounded cursor-pointer select-none text-sm"
                      >
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          objective.reverse_logic 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {objective.reverse_logic ? '🔄 Inverso' : '➡️ Normale'}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Monthly Values */}
                  {months.map((month, monthIndex) => {
                    const monthNumber = monthIndex + 1;
                    const value = getMonthValue(objective, monthNumber);
                    const isCurrentMonth = new Date().getMonth() + 1 === monthNumber;
                    const isFutureMonth = monthNumber > new Date().getMonth() + 1;
                    
                    const colIndex = 9 + monthIndex; // 0=checkbox, 1=actions, 2=title, 3=type, 4=target, 5=format, 6=start_date, 7=end_date, 8=reverse_logic, 9-20=months
                    
                    return (
                      <td key={monthNumber} className={`px-3 py-2 text-center ${
                        isCurrentMonth ? 'bg-blue-50' : ''
                      } ${isCellSelected(index, colIndex) ? 'bg-brand-primary bg-opacity-20 border-2 border-brand-primary' : ''}`}>
                        {editingCell?.objectiveId === objective.id && editingCell?.field === 'month' && editingCell?.month === monthNumber ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-brand-primary text-right"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') handleCancel();
                              }}
                            />
                            <button onClick={handleSave} className="text-xs text-green-600 hover:text-green-800">✓</button>
                            <button onClick={handleCancel} className="text-xs text-red-600 hover:text-red-800">✕</button>
                          </div>
                        ) : (
                          <div
                            onClick={() => handleCellClick(objective.id, 'month', monthNumber, index, colIndex)}
                            onMouseDown={() => handleCellMouseDown(index, colIndex)}
                            onMouseEnter={() => handleCellMouseEnter(index, colIndex)}
                            onMouseUp={handleCellMouseUp}
                            className={`w-full text-right hover:bg-blue-50 px-2 py-1 rounded cursor-pointer select-none ${
                              isFutureMonth ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            {formatNumber(value, objective.number_format || 'number')}
                          </div>
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
    </div>
  );
}