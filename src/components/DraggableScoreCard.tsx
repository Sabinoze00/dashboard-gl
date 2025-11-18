'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ObjectiveWithValues } from '@/lib/types';
import ScoreCard from './ScoreCard';
import { PeriodSelection } from './PeriodSelector';

interface DraggableScoreCardProps {
  objective: ObjectiveWithValues;
  onObjectiveUpdate?: (objectiveId: number, updates: { objective_smart?: string; target_numeric?: number; reverse_logic?: boolean }) => void;
  selectedPeriod?: PeriodSelection;
}

export default function DraggableScoreCard({ objective, onObjectiveUpdate, selectedPeriod }: DraggableScoreCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: objective.id.toString(),
    data: { type: 'scorecard', objective }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative group"
    >
      {/* Score Card with integrated drag handle */}
      <div className="relative">
        <ScoreCard
          objective={objective}
          onObjectiveUpdate={onObjectiveUpdate}
          selectedPeriod={selectedPeriod}
        />
        {/* Drag Handle - visible on hover */}
        <div
          {...listeners}
          className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-grab active:cursor-grabbing bg-white/90 backdrop-blur-sm rounded-lg shadow-md hover:shadow-lg hover:bg-white border border-gray-200"
          title="🔄 Trascina per riordinare"
        >
          <svg 
            className="w-5 h-5 text-gray-500 hover:text-brand-primary transition-colors" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2.5} 
              d="M8 6h.01M8 10h.01M8 14h.01M8 18h.01M12 6h.01M12 10h.01M12 14h.01M12 18h.01M16 6h.01M16 10h.01M16 14h.01M16 18h.01" 
            />
          </svg>
        </div>
      </div>
    </div>
  );
}