import db, { createObjective, updateObjectiveValue } from './db';

const seedData = () => {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  db.exec('DELETE FROM objective_values');
  db.exec('DELETE FROM objectives');
  
  const departments = ['Grafico', 'Sales', 'Financial', 'Agency', 'PM Company', 'Marketing'];
  
  const sampleObjectives = [
    // Grafico Department
    {
      department: 'Grafico',
      objective_name: 'Progetti Grafici',
      objective_smart: 'Aumentare progetti grafici completati del 20% rispetto al 2024',
      type_objective: 'Cumulativo',
      target_numeric: 120,
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    {
      department: 'Grafico', 
      objective_name: 'Qualità Progetti',
      objective_smart: 'Mantenere qualità media progetti sopra 4.5/5',
      type_objective: 'Mantenimento',
      target_numeric: 4.5,
      number_format: 'decimal',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    // Sales Department
    {
      department: 'Sales',
      objective_name: 'Fatturato Annuale',
      objective_smart: 'Raggiungere fatturato annuale di €500,000',
      type_objective: 'Cumulativo',
      target_numeric: 500000,
      number_format: 'currency',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    {
      department: 'Sales',
      objective_name: 'Nuovi Clienti Premium',
      objective_smart: 'Acquisire 15 nuovi clienti premium al mese',
      type_objective: 'Mantenimento',
      target_numeric: 15,
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    // Financial Department
    {
      department: 'Financial',
      objective_name: 'Riduzione Costi',
      objective_smart: 'Ridurre costi operativi del 10% entro dicembre',
      type_objective: 'Ultimo mese',
      target_numeric: -10,
      number_format: 'percentage',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    {
      department: 'Financial',
      objective_name: 'Margine Profitto',
      objective_smart: 'Mantenere margine di profitto sopra il 25%',
      type_objective: 'Mantenimento',
      target_numeric: 25,
      number_format: 'percentage',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    // Agency Department
    {
      department: 'Agency',
      objective_name: 'Campagne Marketing',
      objective_smart: 'Completare 200 campagne marketing digitale',
      type_objective: 'Cumulativo',
      target_numeric: 200,
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    {
      department: 'Agency',
      objective_name: 'CTR Campagne',
      objective_smart: 'Raggiungere CTR medio del 3.5% sulle campagne',
      type_objective: 'Mantenimento',
      target_numeric: 3.5,
      number_format: 'percentage',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    // PM Company Department
    {
      department: 'PM Company',
      objective_name: 'Progetti in Tempo',
      objective_smart: 'Consegnare 95% dei progetti entro deadline',
      type_objective: 'Mantenimento',
      target_numeric: 95,
      number_format: 'percentage',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    {
      department: 'PM Company',
      objective_name: 'Tempo Medio Progetto',
      objective_smart: 'Ridurre tempo medio progetto a 30 giorni',
      type_objective: 'Ultimo mese',
      target_numeric: 30,
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    // Marketing Department
    {
      department: 'Marketing',
      objective_name: 'Lead Qualificati',
      objective_smart: 'Generare 10,000 lead qualificati',
      type_objective: 'Cumulativo',
      target_numeric: 10000,
      number_format: 'number',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    },
    {
      department: 'Marketing',
      objective_name: 'Engagement Social',
      objective_smart: 'Mantenere engagement rate social sopra 5%',
      type_objective: 'Mantenimento',
      target_numeric: 5,
      number_format: 'percentage',
      start_date: '2025-01-01',
      end_date: '2025-12-31'
    }
  ];

  // Insert objectives and get IDs
  const objectiveIds: number[] = [];
  sampleObjectives.forEach(objective => {
    const result = createObjective(objective);
    objectiveIds.push(result.lastInsertRowid as number);
  });

  // Generate sample values for each objective (Jan-Aug 2025)
  objectiveIds.forEach((objectiveId, index) => {
    const objective = sampleObjectives[index];
    const currentMonth = 8; // August 2025
    
    for (let month = 1; month <= currentMonth; month++) {
      let value: number;
      
      if (objective.type_objective === 'Cumulativo') {
        // Progressive values toward target
        const monthlyTarget = objective.target_numeric / 12;
        value = Math.round(monthlyTarget * month * (0.8 + Math.random() * 0.4));
      } else if (objective.type_objective === 'Mantenimento') {
        // Values around target with some variation
        value = objective.target_numeric * (0.85 + Math.random() * 0.3);
      } else { // Ultimo mese
        // Current performance that should improve over time
        if (objective.target_numeric < 0) { // Reduction target
          value = Math.abs(objective.target_numeric) * (1.5 - (month * 0.05));
        } else {
          value = objective.target_numeric * (1.2 - (month * 0.02));
        }
      }
      
      updateObjectiveValue(objectiveId, month, 2025, Math.round(value * 100) / 100);
    }
  });

  console.log('✅ Database seeding completed!');
  console.log(`📊 Created ${sampleObjectives.length} objectives`);
  console.log(`📈 Generated ${objectiveIds.length * 8} value entries`);
};

export default seedData;