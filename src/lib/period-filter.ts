import { ObjectiveWithValues } from './types';
import { PeriodSelection } from '@/components/PeriodSelector';

// Filter objective values based on selected period
export function filterObjectivesByPeriod(
  objectives: ObjectiveWithValues[],
  period: PeriodSelection
): ObjectiveWithValues[] {
  return objectives.map(objective => {
    // Filter values to only include the selected period
    const filteredValues = objective.values.filter(value => {
      const valueYear = typeof value.year === 'string' ? parseInt(value.year) : value.year;
      const valueMonth = typeof value.month === 'string' ? parseInt(value.month) : value.month;
      
      // Check if the value falls within the selected period
      if (valueYear !== period.year) return false;
      
      // Handle period spanning across months
      if (period.startMonth <= period.endMonth) {
        return valueMonth >= period.startMonth && valueMonth <= period.endMonth;
      } else {
        // Handle period spanning across years (e.g., Nov-Feb)
        return valueMonth >= period.startMonth || valueMonth <= period.endMonth;
      }
    });

    return {
      ...objective,
      values: filteredValues
    };
  });
}

// Calculate current value for filtered period
export function calculateCurrentValueForPeriod(
  objective: ObjectiveWithValues,
  period: PeriodSelection
): number {
  const filteredValues = objective.values.filter(value => {
    const valueYear = typeof value.year === 'string' ? parseInt(value.year) : value.year;
    const valueMonth = typeof value.month === 'string' ? parseInt(value.month) : value.month;
    
    if (valueYear !== period.year) return false;
    
    if (period.startMonth <= period.endMonth) {
      return valueMonth >= period.startMonth && valueMonth <= period.endMonth;
    } else {
      return valueMonth >= period.startMonth || valueMonth <= period.endMonth;
    }
  });

  switch (objective.type_objective) {
    case 'Cumulativo':
      return filteredValues.reduce((sum, v) => sum + (typeof v.value === 'string' ? parseFloat(v.value) : v.value), 0);
      
    case 'Mantenimento':
      if (filteredValues.length === 0) return 0;
      return filteredValues.reduce((sum, v) => sum + (typeof v.value === 'string' ? parseFloat(v.value) : v.value), 0) / filteredValues.length;
      
    case 'Ultimo mese':
      if (filteredValues.length === 0) return 0;
      const sortedValues = filteredValues.sort((a, b) => {
        const monthA = typeof a.month === 'string' ? parseInt(a.month) : a.month;
        const monthB = typeof b.month === 'string' ? parseInt(b.month) : b.month;
        return monthB - monthA;
      });
      const lastValue = sortedValues[0]?.value;
      return typeof lastValue === 'string' ? parseFloat(lastValue) : lastValue || 0;
      
    default:
      return 0;
  }
}

// Calculate progress percentage for filtered period
export function calculateProgressForPeriod(
  objective: ObjectiveWithValues,
  period: PeriodSelection
): number {
  const currentValue = calculateCurrentValueForPeriod(objective, period);
  const target = typeof objective.target_numeric === 'string' ? parseFloat(objective.target_numeric) : objective.target_numeric;
  
  if (target === 0) return 0;
  
  const progress = (currentValue / target) * 100;
  
  // Handle reverse logic objectives (where lower is better)
  if (objective.reverse_logic) {
    return Math.max(0, ((target - currentValue) / target) * 100);
  }
  
  return Math.max(0, progress);
}

// Calculate time elapsed percentage for the selected period
export function calculateTimeElapsedForPeriod(
  objective: ObjectiveWithValues,
  period: PeriodSelection
): number {
  const startDate = new Date(objective.start_date);
  const endDate = new Date(objective.end_date);
  const currentDate = new Date();
  
  // Calculate the selected period dates
  const periodStartDate = new Date(period.year, period.startMonth - 1, 1);
  const periodEndDate = new Date(period.year, period.endMonth, 0); // Last day of end month
  
  // Use the intersection of objective period and selected period
  const effectiveStartDate = startDate > periodStartDate ? startDate : periodStartDate;
  const effectiveEndDate = endDate < periodEndDate ? endDate : periodEndDate;
  const effectiveCurrentDate = currentDate < effectiveEndDate ? currentDate : effectiveEndDate;
  
  const totalDays = (effectiveEndDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24);
  const elapsedDays = (effectiveCurrentDate.getTime() - effectiveStartDate.getTime()) / (1000 * 60 * 60 * 24);
  
  if (totalDays <= 0) return 100;
  
  return Math.max(0, Math.min(100, (elapsedDays / totalDays) * 100));
}

// Get period label for display
export function getPeriodLabel(period: PeriodSelection): string {
  const months = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  if (period.startMonth === period.endMonth) {
    return `${months[period.startMonth - 1]} ${period.year}`;
  } else if (period.startMonth === 1 && period.endMonth === 12) {
    return `Anno ${period.year}`;
  } else {
    const startMonth = months[period.startMonth - 1];
    const endMonth = months[period.endMonth - 1];
    return `${startMonth} - ${endMonth} ${period.year}`;
  }
}