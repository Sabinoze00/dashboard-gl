'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ObjectiveWithValues, Department } from '@/lib/types';
import ScoreCard from './ScoreCard';
import DraggableScoreCard from './DraggableScoreCard';
import ObjectiveChart from './ObjectiveChart';
// import ObjectiveGrid from './ObjectiveGrid';
// import SimpleGrid from './SimpleGrid';
import AdvancedGrid from './AdvancedGrid';
import AddObjectiveForm from './AddObjectiveForm';
import BulkObjectiveForm from './BulkObjectiveForm';
import PeriodSelector, { PeriodSelection } from './PeriodSelector';
import { filterObjectivesByPeriod, calculateCurrentValueForPeriod, calculateProgressForPeriod } from '@/lib/period-filter';
import AIChat from './AIChat';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

interface DepartmentDashboardProps {
  department: Department;
}

export default function DepartmentDashboard({ department }: DepartmentDashboardProps) {
  const [objectives, setObjectives] = useState<ObjectiveWithValues[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'grid'>('overview');
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodSelection>({
    startMonth: 1,
    endMonth: new Date().getMonth() + 1, // Current month
    year: new Date().getFullYear()
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchObjectives = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/departments/${encodeURIComponent(department)}/objectives`);
      if (!response.ok) {
        throw new Error('Failed to fetch objectives');
      }
      const data = await response.json();
      setObjectives(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [department]);

  const handleValueUpdate = useCallback(async (objectiveId: number, month: number, year: number, value: number) => {
    try {
      const response = await fetch(`/api/objectives/${objectiveId}/values`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ month, year, value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update value');
      }

      // Refresh objectives to reflect the update
      await fetchObjectives();
    } catch (err) {
      console.error('Error updating value:', err);
    }
  }, [fetchObjectives]);

  const handleObjectiveUpdate = useCallback(async (objectiveId: number, updates: { objective_smart?: string; type_objective?: string; target_numeric?: number; number_format?: string; start_date?: string; end_date?: string }) => {
    try {
      const response = await fetch(`/api/objectives/${objectiveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update objective');
      }

      // Refresh objectives to reflect the update
      await fetchObjectives();
    } catch (err) {
      console.error('Error updating objective:', err);
    }
  }, [fetchObjectives]);

  const handleFieldUpdate = useCallback(async (objectiveId: number, field: string, value: string) => {
    const updates = { [field]: value };
    await handleObjectiveUpdate(objectiveId, updates);
  }, [handleObjectiveUpdate]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = objectives.findIndex(obj => obj.id.toString() === active.id);
    const newIndex = objectives.findIndex(obj => obj.id.toString() === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      // Optimistically update local state
      const newObjectives = arrayMove(objectives, oldIndex, newIndex);
      setObjectives(newObjectives);

      try {
        // Send reorder request to server
        const orderedIds = newObjectives.map(obj => obj.id);
        const response = await fetch('/api/objectives/reorder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            department,
            orderedIds
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reorder objectives');
        }
      } catch (error) {
        console.error('Error reordering objectives:', error);
        // Revert on error
        await fetchObjectives();
      }
    }
  }, [objectives, department, fetchObjectives]);

  const handleObjectiveDelete = useCallback(async (objectiveId: number) => {
    try {
      const response = await fetch(`/api/objectives/${objectiveId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete objective');
      }

      // Refresh objectives to reflect the update
      await fetchObjectives();
    } catch (err) {
      console.error('Error deleting objective:', err);
    }
  }, [fetchObjectives]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  // Filter objectives based on active/archive tab
  const today = new Date();
  const activeObjectives = objectives.filter(obj => new Date(obj.end_date) >= today);
  const archivedObjectives = objectives.filter(obj => new Date(obj.end_date) < today);

  // Select objectives based on active tab
  const tabFilteredObjectives = activeTab === 'active' ? activeObjectives : archivedObjectives;

  // Filter objectives based on selected period
  const filteredObjectives = filterObjectivesByPeriod(tabFilteredObjectives, selectedPeriod);

  const getDepartmentColor = () => {
    const colors = {
      'Grafico': 'bg-blue-500',
      'Sales': 'bg-green-500', 
      'Financial': 'bg-purple-500',
      'Agency': 'bg-orange-500',
      'PM Company': 'bg-red-500',
      'Marketing': 'bg-pink-500'
    };
    return colors[department] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento obiettivi {department}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Errore</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchObjectives}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className={`w-10 h-10 rounded-lg ${getDepartmentColor()} flex items-center justify-center`}>
                <span className="text-white font-bold">
                  {department.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Dashboard {department}
                </h1>
                <p className="text-gray-600">
                  {filteredObjectives.length} obiettivi nel periodo selezionato
                </p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center space-x-4">
              <PeriodSelector
                selectedPeriod={selectedPeriod}
                onPeriodChange={setSelectedPeriod}
                className="hidden sm:block"
              />
              <button
                onClick={() => setIsAIChatOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>AI</span>
              </button>
            </div>
            
            <div className="flex space-x-3">
              {/* Hide add buttons in archive mode */}
              {activeTab === 'active' && (
                <>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-5 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-pink-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Aggiungi Obiettivo</span>
                  </button>

                  <button
                    onClick={() => setShowBulkForm(true)}
                    className="px-5 py-2.5 bg-brand-secondary text-white rounded-xl text-sm font-semibold hover:bg-orange-600 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                    </svg>
                    <span>Crea in Blocco</span>
                  </button>
                </>
              )}

              <button
                onClick={() => setActiveView('overview')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeView === 'overview'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveView('grid')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  activeView === 'grid'
                    ? 'bg-brand-primary text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm'
                }`}
              >
                Griglia
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Active/Archive Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'active'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Obiettivi Attivi</span>
                <span className="bg-brand-primary text-white text-xs px-2 py-0.5 rounded-full">
                  {activeObjectives.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'archive'
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Archivio</span>
                <span className="bg-gray-400 text-white text-xs px-2 py-0.5 rounded-full">
                  {archivedObjectives.length}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Archive Info Banner */}
        {activeTab === 'archive' && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-gray-900">Modalità Archivio - Sola Lettura</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Stai visualizzando obiettivi scaduti (data fine passata). Le modifiche sono disabilitate per preservare lo storico.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeView === 'overview' ? (
          <>
            {/* Score Cards - Draggable only in active mode */}
            {filteredObjectives.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Score Cards</h2>
                  {activeTab === 'active' && (
                    <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                      🔄 Trascina le card per riordinarle
                    </div>
                  )}
                </div>
                {activeTab === 'active' ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={filteredObjectives.map(obj => obj.id.toString())} strategy={rectSortingStrategy}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-none">
                        {filteredObjectives.map((objective) => (
                          <DraggableScoreCard
                            key={objective.id}
                            objective={objective}
                            onObjectiveUpdate={handleObjectiveUpdate}
                            selectedPeriod={selectedPeriod}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-none">
                    {filteredObjectives.map((objective) => (
                      <ScoreCard
                        key={objective.id}
                        objective={objective}
                        onObjectiveUpdate={handleObjectiveUpdate}
                        selectedPeriod={selectedPeriod}
                        readOnly={true}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Charts */}
            {filteredObjectives.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Grafici Andamento</h2>
                <div className="grid grid-cols-fluid-480 gap-8 max-w-none">
                  {filteredObjectives.map((objective) => (
                    <ObjectiveChart key={objective.id} objective={objective} selectedPeriod={selectedPeriod} />
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {activeTab === 'archive' ? 'Griglia Archivio (Sola Lettura)' : 'Griglia Editing Avanzata'}
            </h2>
            <AdvancedGrid
              objectives={filteredObjectives}
              department={department}
              onValueUpdate={handleValueUpdate}
              onObjectiveUpdate={handleObjectiveUpdate}
              onObjectiveDelete={handleObjectiveDelete}
              onRefresh={fetchObjectives}
              readOnly={activeTab === 'archive'}
            />
          </section>
        )}

        {objectives.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nessun obiettivo trovato
            </h3>
            <p className="text-gray-600">
              Non ci sono obiettivi configurati per il dipartimento {department}.
            </p>
          </div>
        )}
      </div>

      {/* Add Objective Modal */}
      {showAddForm && (
        <AddObjectiveForm
          department={department}
          onObjectiveAdded={() => {
            setShowAddForm(false);
            fetchObjectives(); // Refresh the objectives list
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Bulk Add Objectives Modal */}
      {showBulkForm && (
        <BulkObjectiveForm
          department={department}
          onObjectivesAdded={() => {
            setShowBulkForm(false);
            fetchObjectives(); // Refresh the objectives list
          }}
          onCancel={() => setShowBulkForm(false)}
        />
      )}

      {/* AI Chat Dialog */}
      <AIChat 
        isOpen={isAIChatOpen} 
        onClose={() => setIsAIChatOpen(false)}
        department={department}
      />
    </div>
  );
}