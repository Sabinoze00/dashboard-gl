'use client';

import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellEditingStoppedEvent } from 'ag-grid-community';
import { useState, useCallback, useMemo } from 'react';
import { ObjectiveWithValues, Department } from '@/lib/types';

interface ObjectiveGridProps {
  objectives: ObjectiveWithValues[];
  department: Department;
  onValueUpdate: (objectiveId: number, month: number, year: number, value: number) => void;
  onObjectiveUpdate?: (objectiveId: number, field: string, value: string) => void;
}

export default function ObjectiveGrid({ objectives, department, onValueUpdate, onObjectiveUpdate }: ObjectiveGridProps) {
  const [gridApi, setGridApi] = useState(null);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    setGridApi(params.api);
  }, []);

  const onCellEditingStopped = useCallback((event: CellEditingStoppedEvent) => {
    const { data, colDef, newValue } = event;
    
    if (colDef.field?.startsWith('month_')) {
      const month = parseInt(colDef.field.split('_')[1]);
      const year = 2025; // Current year
      const value = parseFloat(newValue);
      
      if (!isNaN(value)) {
        onValueUpdate(data.id, month, year, value);
      }
    } else if (['number_format', 'start_date', 'end_date'].includes(colDef.field) && onObjectiveUpdate) {
      onObjectiveUpdate(data.id, colDef.field, newValue);
    }
  }, [onValueUpdate, onObjectiveUpdate]);

  const columnDefs: ColDef[] = useMemo(() => {
    const baseColumns: ColDef[] = [
      {
        headerName: 'Obiettivo',
        field: 'objective_smart',
        width: 300,
        cellStyle: { fontWeight: 'bold' }
      },
      {
        headerName: 'Tipo',
        field: 'type_objective',
        width: 120,
        cellStyle: (params) => {
          switch (params.value) {
            case 'Cumulativo': return { backgroundColor: '#e3f2fd', color: '#1976d2' };
            case 'Mantenimento': return { backgroundColor: '#f3e5f5', color: '#7b1fa2' };
            case 'Ultimo mese': return { backgroundColor: '#fff3e0', color: '#f57c00' };
            default: return {};
          }
        }
      },
      {
        headerName: 'Target',
        field: 'target_numeric',
        width: 100,
        cellStyle: { fontWeight: 'bold', textAlign: 'right' },
        valueFormatter: (params) => {
          const value = params.value;
          if (value > 1000) {
            return (value / 1000).toFixed(1) + 'K';
          }
          return value.toLocaleString();
        }
      },
      {
        headerName: 'Formato',
        field: 'number_format',
        width: 120,
        editable: !!onObjectiveUpdate,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['number', 'currency', 'percentage', 'decimal']
        },
        valueFormatter: (params) => {
          const formatNames = {
            'number': 'Numero',
            'currency': 'Valuta (€)',
            'percentage': 'Percentuale (%)',
            'decimal': 'Decimale'
          };
          return formatNames[params.value] || params.value;
        },
        cellStyle: (params) => ({
          backgroundColor: onObjectiveUpdate ? '#f8fafc' : 'transparent',
          border: onObjectiveUpdate ? '1px solid #e2e8f0' : 'none'
        })
      },
      {
        headerName: 'Data Inizio',
        field: 'start_date',
        width: 130,
        editable: !!onObjectiveUpdate,
        cellEditor: 'agDateStringCellEditor',
        valueFormatter: (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString('it-IT');
          }
          return '';
        },
        cellStyle: (params) => ({
          backgroundColor: onObjectiveUpdate ? '#f8fafc' : 'transparent',
          border: onObjectiveUpdate ? '1px solid #e2e8f0' : 'none'
        })
      },
      {
        headerName: 'Data Fine',
        field: 'end_date',
        width: 130,
        editable: !!onObjectiveUpdate,
        cellEditor: 'agDateStringCellEditor',
        valueFormatter: (params) => {
          if (params.value) {
            return new Date(params.value).toLocaleDateString('it-IT');
          }
          return '';
        },
        cellStyle: (params) => ({
          backgroundColor: onObjectiveUpdate ? '#f8fafc' : 'transparent',
          border: onObjectiveUpdate ? '1px solid #e2e8f0' : 'none'
        })
      }
    ];

    // Add month columns (Gen - Dic)
    const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
    const monthColumns: ColDef[] = months.map((month, index) => ({
      headerName: month,
      field: `month_${index + 1}`,
      width: 80,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: {
        precision: 2,
        min: 0
      },
      valueGetter: (params) => {
        const monthData = params.data.values?.find((v: any) => v.month === index + 1 && v.year === 2025);
        return monthData?.value || 0;
      },
      valueSetter: (params) => {
        // This will be handled by onCellEditingStopped
        return false;
      },
      cellStyle: (params) => {
        const currentMonth = new Date().getMonth() + 1;
        const month = index + 1;
        
        if (month > currentMonth) {
          return { backgroundColor: '#f5f5f5', color: '#666' }; // Future months
        }
        if (month === currentMonth) {
          return { backgroundColor: '#e8f5e8', fontWeight: 'bold' }; // Current month
        }
        return { backgroundColor: 'white' }; // Past months
      },
      cellClass: 'editable-cell'
    }));

    return [...baseColumns, ...monthColumns];
  }, []);

  const rowData = useMemo(() => {
    return objectives.map(objective => ({
      ...objective,
      // We'll use valueGetter for month columns
    }));
  }, [objectives]);

  if (objectives.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-2xl mb-4">📊</div>
        <p className="text-gray-600">Nessun obiettivo da mostrare nella griglia</p>
        <p className="text-sm text-gray-500 mt-2">Aggiungi degli obiettivi per visualizzarli qui</p>
      </div>
    );
  }

  console.log('ObjectiveGrid render:', { objectivesCount: objectives.length, rowDataCount: rowData.length });

  return (
    <div className="w-full bg-white rounded-lg border" style={{ height: '600px' }}>
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Griglia Obiettivi ({objectives.length} obiettivi)
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Clicca su una cella per modificare: valori mensili{onObjectiveUpdate ? ', formato numerico e date' : ''}
        </p>
      </div>
      <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          onGridReady={onGridReady}
          onCellEditingStopped={onCellEditingStopped}
          defaultColDef={{
            resizable: true,
            sortable: true,
            filter: true,
            minWidth: 80,
          }}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          suppressMovableColumns={true}
          animateRows={true}
          domLayout="normal"
        />
      </div>
    </div>
  );
}