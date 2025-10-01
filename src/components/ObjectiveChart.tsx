'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  LineElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  PointElement
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useState } from 'react';
import { ObjectiveWithValues, ObjectiveType } from '@/lib/types';
import { formatNumber } from '@/lib/formatters';
import { PeriodSelection } from './PeriodSelector';
import { calculateCurrentValueForPeriod, calculateProgressForPeriod } from '@/lib/period-filter';

ChartJS.register(CategoryScale, LinearScale, BarElement, BarController, LineElement, LineController, Title, Tooltip, Legend, PointElement);

interface ObjectiveChartProps {
  objective: ObjectiveWithValues;
  selectedPeriod?: PeriodSelection;
}

export default function ObjectiveChart({ objective, selectedPeriod }: ObjectiveChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [viewMode, setViewMode] = useState<'monthly' | 'quarterly'>('monthly');

  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
  
  // Calculate values for each month
  const getMonthlyValues = () => {
    const values: number[] = [];
    const targets: number[] = [];
    let cumulativeSum = 0;
    
    for (let month = 1; month <= 12; month++) {
      const monthData = objective.values.find(v => v.month === month && v.year === 2025);
      const monthValue = monthData?.value || 0;
      
      let displayValue: number;
      let targetValue: number;
      
      switch (objective.type_objective) {
        case 'Cumulativo':
          // Cumulative sum for values
          cumulativeSum += monthValue;
          displayValue = cumulativeSum;
          // Fixed final target for all months (flat line)
          targetValue = objective.target_numeric;
          break;
        case 'Mantenimento':
          // Individual month values for maintenance
          displayValue = monthValue;
          targetValue = objective.target_numeric;
          break;
        case 'Ultimo mese':
          // Individual month values to show progression
          displayValue = monthValue;
          targetValue = objective.target_numeric;
          break;
        default:
          displayValue = monthValue;
          targetValue = 0;
      }
      
      values.push(displayValue);
      targets.push(targetValue);
    }
    
    return { values, targets };
  };

  // Calculate quarterly values
  const getQuarterlyValues = () => {
    const values: number[] = [];
    const targets: number[] = [];
    
    // Quarter month mappings: Q1=1-3, Q2=4-6, Q3=7-9, Q4=10-12
    const quarterMonths = [
      [1, 2, 3], // Q1
      [4, 5, 6], // Q2  
      [7, 8, 9], // Q3
      [10, 11, 12] // Q4
    ];
    
    for (let q = 0; q < 4; q++) {
      const quarterData = quarterMonths[q];
      let quarterValue = 0;
      let targetValue = 0;
      
      if (objective.type_objective === 'Cumulativo') {
        // For cumulative: sum all values up to the end of the quarter
        const endMonth = quarterData[2]; // Last month of quarter
        let cumulativeSum = 0;
        for (let month = 1; month <= endMonth; month++) {
          const monthData = objective.values.find(v => v.month === month && v.year === 2025);
          cumulativeSum += monthData?.value || 0;
        }
        quarterValue = cumulativeSum;
        targetValue = objective.target_numeric;
      } else {
        // For maintenance/last month: average or sum of quarter months
        let quarterSum = 0;
        let monthsWithData = 0;
        
        quarterData.forEach(month => {
          const monthData = objective.values.find(v => v.month === month && v.year === 2025);
          if (monthData && monthData.value > 0) {
            quarterSum += monthData.value;
            monthsWithData++;
          }
        });
        
        if (objective.type_objective === 'Mantenimento') {
          quarterValue = monthsWithData > 0 ? quarterSum / monthsWithData : 0; // Average
        } else {
          quarterValue = quarterSum; // Sum for ultimo mese
        }
        targetValue = objective.target_numeric;
      }
      
      values.push(quarterValue);
      targets.push(targetValue);
    }
    
    return { values, targets };
  };

  const { values, targets } = viewMode === 'monthly' ? getMonthlyValues() : getQuarterlyValues();

  const data = {
    labels: viewMode === 'monthly' ? months : quarters,
    datasets: [
      {
        label: 'Valori Reali',
        data: values,
        backgroundColor: chartType === 'bar' ? 'rgba(226, 4, 91, 0.8)' : undefined, // brand-primary
        borderColor: '#E2045B', // brand-primary
        borderWidth: chartType === 'line' ? 2 : 0,
        type: chartType,
        fill: false,
        tension: 0.3,
        pointRadius: chartType === 'line' ? 4 : 0,
        pointBackgroundColor: '#E2045B',
      },
      {
        label: 'Target',
        data: targets,
        backgroundColor: 'rgba(255, 153, 44, 0.2)', // brand-secondary with opacity
        borderColor: '#FF992C', // brand-secondary
        borderWidth: 2,
        type: 'line',
        fill: false,
        borderDash: [6, 4],
        pointRadius: 3,
        pointBackgroundColor: '#FF992C',
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            family: 'DM Sans',
            size: 14,
            weight: 500,
          },
          color: '#374151', // gray-700
          padding: 20,
          boxWidth: 12,
          boxHeight: 12,
        }
      },
      title: {
        display: false, // Remove chart title, we'll handle it in the container
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          family: 'DM Sans',
          size: 14,
          weight: 600,
        },
        bodyFont: {
          family: 'DM Sans',
          size: 13,
          weight: 500,
        },
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = formatNumber(context.raw, objective.number_format || 'number');
            return `${label}: ${value}`;
          },
          footer: function(tooltipItems: any[]) {
            if (tooltipItems.length === 2) {
              const actual = tooltipItems[0].raw;
              const target = tooltipItems[1].raw;
              const progress = target > 0 ? ((actual / target) * 100).toFixed(1) : '0';
              return `Progress: ${progress}%`;
            }
            return '';
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'DM Sans',
            size: 12,
            weight: 500,
          },
          color: '#8A8A93', // brand-text
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          lineWidth: 1,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            family: 'DM Sans',
            size: 12,
            weight: 500,
          },
          color: '#8A8A93', // brand-text
          callback: function(value: any) {
            return formatNumber(value, objective.number_format || 'number');
          }
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  // Calculate current progress using selected period
  const getCurrentProgress = () => {
    if (selectedPeriod) {
      // Use the selected period for calculation
      const currentValue = calculateCurrentValueForPeriod(objective, selectedPeriod);
      const currentTarget = objective.target_numeric;
      const progress = calculateProgressForPeriod(objective, selectedPeriod);
      return { currentValue, currentTarget, progress };
    } else {
      // Fallback to current month/quarter
      if (viewMode === 'monthly') {
        const currentMonth = Math.min(new Date().getMonth() + 1, 12);
        const currentValue = values[currentMonth - 1] || 0;
        const currentTarget = targets[currentMonth - 1] || 0;
        return { currentValue, currentTarget, progress: currentTarget > 0 ? ((currentValue / currentTarget) * 100) : 0 };
      } else {
        // Quarterly view - get current quarter
        const currentMonth = new Date().getMonth() + 1;
        const currentQuarter = Math.ceil(currentMonth / 3) - 1; // 0-based
        const currentValue = values[currentQuarter] || 0;
        const currentTarget = targets[currentQuarter] || 0;
        return { currentValue, currentTarget, progress: currentTarget > 0 ? ((currentValue / currentTarget) * 100) : 0 };
      }
    }
  };

  const { currentValue, currentTarget, progress } = getCurrentProgress();

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 border border-gray-100 hover:border-gray-200 group">
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-brand-primary transition-colors duration-200" title={objective.objective_smart}>
              {objective.objective_name || objective.objective_smart}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  objective.type_objective === 'Cumulativo'
                    ? 'bg-blue-50 text-blue-600'
                    : objective.type_objective === 'Mantenimento'
                    ? 'bg-pink-50 text-brand-primary'
                    : 'bg-orange-50 text-brand-secondary'
                }`}>
                  {objective.type_objective}
                </span>
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  progress >= 100
                    ? 'bg-pink-50 text-brand-primary'
                    : 'bg-orange-50 text-brand-secondary'
                }`}>
                  {progress >= 100 ? 'Raggiunto' : 'In corso'}
                </span>
              </div>
              <div className="text-xs text-gray-500 italic">
                {objective.type_objective === 'Cumulativo'
                  ? '📊 Valore calcolato: somma progressiva dei valori mensili'
                  : objective.type_objective === 'Mantenimento'
                  ? '📊 Valore calcolato: media dei valori nel periodo selezionato'
                  : '📊 Valore calcolato: ultimo valore del periodo selezionato'}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-2 ml-4">
            {/* Chart Type Toggle */}
            <div className="flex space-x-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  chartType === 'bar' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                Colonne
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  chartType === 'line' 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                Linea
              </button>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('monthly')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  viewMode === 'monthly' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                Mensile
              </button>
              <button
                onClick={() => setViewMode('quarterly')}
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 ${
                  viewMode === 'quarterly' 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                Trimestrale
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 mb-6">
          <Chart type="bar" data={data} options={options} />
        </div>
        
        {/* Footer Stats */}
        <div className="pt-6 border-t border-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-left">
              <div className="text-sm text-brand-text font-medium mb-1">Progresso Attuale</div>
              <div className="text-2xl font-bold text-gray-900">{progress.toFixed(1)}%</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-brand-text font-medium mb-1">Target</div>
              <div className="text-2xl font-bold text-gray-700">{formatNumber(currentTarget, objective.number_format || 'number')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}