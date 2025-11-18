'use client';

import { useState } from 'react';

export interface PeriodSelection {
  startMonth: number;
  endMonth: number;
  year: number;
}

interface PeriodSelectorProps {
  selectedPeriod: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  className?: string;
}

export default function PeriodSelector({ selectedPeriod, onPeriodChange, className = '' }: PeriodSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];
  
  const months = [
    { value: 1, name: 'Gennaio', short: 'Gen' },
    { value: 2, name: 'Febbraio', short: 'Feb' },
    { value: 3, name: 'Marzo', short: 'Mar' },
    { value: 4, name: 'Aprile', short: 'Apr' },
    { value: 5, name: 'Maggio', short: 'Mag' },
    { value: 6, name: 'Giugno', short: 'Giu' },
    { value: 7, name: 'Luglio', short: 'Lug' },
    { value: 8, name: 'Agosto', short: 'Ago' },
    { value: 9, name: 'Settembre', short: 'Set' },
    { value: 10, name: 'Ottobre', short: 'Ott' },
    { value: 11, name: 'Novembre', short: 'Nov' },
    { value: 12, name: 'Dicembre', short: 'Dic' },
  ];

  const formatPeriodLabel = (period: PeriodSelection) => {
    if (period.startMonth === period.endMonth) {
      const month = months.find(m => m.value === period.startMonth);
      return `${month?.name} ${period.year}`;
    } else {
      const startMonth = months.find(m => m.value === period.startMonth);
      const endMonth = months.find(m => m.value === period.endMonth);
      return `${startMonth?.short} - ${endMonth?.short} ${period.year}`;
    }
  };

  const quickSelections = [
    {
      label: 'Anno Corrente',
      period: { startMonth: 1, endMonth: 12, year: currentYear }
    },
    {
      label: 'YTD (Anno a Oggi)',
      period: { startMonth: 1, endMonth: new Date().getMonth() + 1, year: currentYear }
    },
    {
      label: 'Ultimo Trimestre',
      period: (() => {
        const currentMonth = new Date().getMonth() + 1;
        const quarterStart = Math.floor((currentMonth - 1) / 3) * 3 + 1;
        return { startMonth: Math.max(1, quarterStart - 3), endMonth: quarterStart - 1, year: currentMonth <= 3 ? currentYear - 1 : currentYear };
      })()
    },
    {
      label: 'Ultimi 6 Mesi',
      period: (() => {
        const currentMonth = new Date().getMonth() + 1;
        const sixMonthsAgo = currentMonth - 5;
        return {
          startMonth: sixMonthsAgo > 0 ? sixMonthsAgo : 12 + sixMonthsAgo,
          endMonth: currentMonth,
          year: sixMonthsAgo > 0 ? currentYear : currentYear - 1
        };
      })()
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 min-w-48"
      >
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="font-medium text-gray-700">
          {formatPeriodLabel(selectedPeriod)}
        </span>
        <svg className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Selezioni Rapide</h3>
            <div className="space-y-1">
              {quickSelections.map((selection, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onPeriodChange(selection.period);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 rounded transition-colors"
                >
                  {selection.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Periodo Personalizzato</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Anno</label>
                <select
                  value={selectedPeriod.year}
                  onChange={(e) => onPeriodChange({ ...selectedPeriod, year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">Da Mese</label>
                  <select
                    value={selectedPeriod.startMonth}
                    onChange={(e) => onPeriodChange({ ...selectedPeriod, startMonth: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">A Mese</label>
                  <select
                    value={selectedPeriod.endMonth}
                    onChange={(e) => onPeriodChange({ ...selectedPeriod, endMonth: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {months.map(month => (
                      <option key={month.value} value={month.value}>{month.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Applica
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}