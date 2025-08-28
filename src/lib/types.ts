export type Department = 'Grafico' | 'Sales' | 'Financial' | 'Agency' | 'PM Company' | 'Marketing';

export type ObjectiveType = 'Mantenimento' | 'Cumulativo' | 'Ultimo mese';
export type NumberFormat = 'number' | 'currency' | 'percentage' | 'decimal';

export interface Objective {
  id: number;
  department: Department;
  objective_name?: string;
  objective_smart: string;
  type_objective: ObjectiveType;
  target_numeric: number;
  number_format?: NumberFormat;
  start_date: string;
  end_date: string;
  order_index: number;
  reverse_logic: boolean;
  created_at: string;
}

export interface ObjectiveValue {
  id: number;
  objective_id: number;
  month: number;
  year: number;
  value: number;
  updated_at: string;
}

export interface ObjectiveWithValues extends Objective {
  values: ObjectiveValue[];
}

export interface ScoreCardData {
  id: number;
  title: string;
  progress: number;
  status: 'In corso' | 'Raggiunto' | 'In ritardo';
  currentValue: number;
  targetValue: number;
  type: ObjectiveType;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    type?: 'line' | 'bar';
  }[];
}