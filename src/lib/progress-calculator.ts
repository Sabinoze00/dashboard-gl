import { ObjectiveWithValues, ObjectiveType } from './types';

export interface ProgressResult {
  progress: number;
  status: 'In corso' | 'Raggiunto' | 'In ritardo' | 'Completato' | 'Non raggiunto';
  currentValue: number;
  isOnTrack: boolean;
  isExpired: boolean;
  daysUntilExpiry: number;
}

export const calculateObjectiveProgress = (objective: ObjectiveWithValues): ProgressResult => {
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const currentYear = new Date().getFullYear();
  const today = new Date();
  
  // Check if objective is expired
  const endDate = new Date(objective.end_date);
  const isExpired = endDate < today;
  const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  let currentValue = 0;
  let progress = 0;
  let isOnTrack = false;

  // Get current value based on objective type
  if (objective.type_objective === 'Cumulativo') {
    // Sum all values up to current month
    currentValue = objective.values
      .filter(v => v.year === currentYear && v.month <= currentMonth)
      .reduce((sum, v) => sum + v.value, 0);
  } else if (objective.type_objective === 'Ultimo mese') {
    // Only the last month matters
    const lastValue = objective.values
      .filter(v => v.year === currentYear)
      .sort((a, b) => b.month - a.month)[0];
    currentValue = lastValue?.value || 0;
  } else {
    // Mantenimento - average of values
    const values = objective.values
      .filter(v => v.year === currentYear && v.month <= currentMonth);
    if (values.length > 0) {
      currentValue = values.reduce((sum, v) => sum + v.value, 0) / values.length;
    }
  }

  // Calculate progress based on reverse_logic
  if (objective.reverse_logic) {
    // For reverse logic objectives (like "tasso insoluto"), lower is better
    if (currentValue <= objective.target_numeric) {
      progress = 100; // Perfect - we're at or below target
      isOnTrack = true;
    } else {
      // Calculate how much over target we are (inverted progress)
      const overage = currentValue - objective.target_numeric;
      const maxReasonableOverage = Math.abs(objective.target_numeric * 0.5); // 50% over target is 0% progress
      progress = Math.max(0, 100 - (overage / maxReasonableOverage * 100));
      isOnTrack = progress >= 70; // On track if within reasonable range
    }
  } else {
    // Standard logic - higher is better
    if (objective.target_numeric === 0) {
      progress = currentValue > 0 ? 100 : 0;
    } else {
      progress = Math.min(100, (currentValue / objective.target_numeric) * 100);
    }
    isOnTrack = progress >= 70;
  }

  // Determine status
  let status: 'In corso' | 'Raggiunto' | 'In ritardo' | 'Completato' | 'Non raggiunto';
  
  if (isExpired) {
    if (progress >= 100) {
      status = 'Completato'; // Completed before expiry (with green border)
    } else {
      status = 'Non raggiunto'; // Expired without completion (with red border)
    }
  } else if (progress >= 100) {
    status = 'Raggiunto';
  } else if (isOnTrack) {
    status = 'In corso';
  } else {
    status = 'In ritardo';
  }

  return {
    progress: Math.round(progress * 100) / 100, // Round to 2 decimal places
    status,
    currentValue: Math.round(currentValue * 100) / 100,
    isOnTrack,
    isExpired,
    daysUntilExpiry
  };
};

export const getProgressColor = (progress: number, status: string): string => {
  if (status === 'Raggiunto' || status === 'Completato') return 'bg-green-500';
  if (status === 'In corso') return 'bg-blue-500';
  if (status === 'Non raggiunto') return 'bg-red-500';
  return 'bg-red-500';
};

export const getProgressTextColor = (progress: number, status: string): string => {
  if (status === 'Raggiunto' || status === 'Completato') return 'text-green-700';
  if (status === 'In corso') return 'text-blue-700';
  if (status === 'Non raggiunto') return 'text-red-700';
  return 'text-red-700';
};

export const getProgressBgColor = (progress: number, status: string): string => {
  if (status === 'Raggiunto' || status === 'Completato') return 'bg-green-50';
  if (status === 'In corso') return 'bg-blue-50';
  if (status === 'Non raggiunto') return 'bg-red-50';
  return 'bg-red-50';
};