'use client';

import Link from 'next/link';
import Image from 'next/image';

const departments = [
  { name: 'Grafico', href: '/grafico' },
  { name: 'Sales', href: '/sales' },
  { name: 'Financial', href: '/financial' },
  { name: 'Agency', href: '/agency' },
  { name: 'PM Company', href: '/pm-company' },
  { name: 'Marketing', href: '/marketing' }
];

// Function to get department image path
const getDepartmentImage = (deptName: string): string => {
  const imageMap: { [key: string]: string } = {
    'Grafico': '/departments/Grafico.png',
    'Sales': '/departments/Sales.png',
    'Financial': '/departments/Financial.png',
    'Agency': '/departments/Agency.png',
    'PM Company': '/departments/PmCompany.png',
    'Marketing': '/departments/Marketing.png'
  };
  return imageMap[deptName] || '';
};

export default function HomePage() {

  return (
    <div className="min-h-screen bg-brand-background">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Dashboard Obiettivi GrowthLabb
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-700">
                ✓ Database Attivo
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Seleziona un Reparto
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Visualizza e gestisci gli obiettivi per ciascun Reparto.
          </p>
        </div>

        {/* Department Grid */}
        <div className="grid grid-cols-fluid-320 gap-8 max-w-none">
          {departments.map((dept) => (
            <Link
              key={dept.name}
              href={dept.href}
              className="group bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 border border-gray-100 hover:border-gray-200 p-8"
            >
              <div className="flex items-center space-x-5">
                <div className="w-16 h-16 group-hover:scale-105 transition-transform duration-200">
                  <Image
                    src={getDepartmentImage(dept.name)}
                    alt={`Logo ${dept.name}`}
                    width={64}
                    height={64}
                    className="w-full h-full object-contain rounded-2xl shadow-lg"
                    priority
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-primary transition-colors duration-200">
                    {dept.name}
                  </h3>
                  <p className="text-base text-brand-text mt-2 font-medium">
                    Visualizza obiettivi
                  </p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-6 h-6 text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p className="mt-1">From Bino with ❤️</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
