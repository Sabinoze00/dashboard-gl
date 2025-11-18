import { NumberFormat } from './types';

export const formatNumber = (value: number, format: NumberFormat = 'number'): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }

  // Arrotonda a 1 cifra decimale, tranne per percentuali e valute che restano intere
  const roundedValue = format === 'currency' || format === 'percentage' ? Math.round(value) : Math.round(value * 10) / 10;

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(roundedValue);
      
    case 'percentage':
      return new Intl.NumberFormat('it-IT', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(roundedValue / 100);
      
    case 'decimal':
      return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(roundedValue);
      
    case 'number':
    default:
      // Smart formatting: show K/M for large numbers, con 1 cifra decimale
      if (Math.abs(roundedValue) >= 1000000) {
        return (Math.round(roundedValue / 100000) / 10) + 'M';
      } else if (Math.abs(roundedValue) >= 1000) {
        return (Math.round(roundedValue / 100) / 10) + 'K';
      }
      return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(roundedValue);
  }
};

export const formatNumberCompact = (value: number, format: NumberFormat = 'number'): string => {
  if (isNaN(value) || value === null || value === undefined) {
    return '0';
  }

  // Arrotonda a 1 cifra decimale, tranne per percentuali e valute che restano intere
  const roundedValue = format === 'currency' || format === 'percentage' ? Math.round(value) : Math.round(value * 10) / 10;

  // For small displays, always use compact format
  switch (format) {
    case 'currency':
      if (Math.abs(roundedValue) >= 1000000) {
        return '€' + Math.round(roundedValue / 1000000) + 'M';
      } else if (Math.abs(roundedValue) >= 1000) {
        return '€' + Math.round(roundedValue / 1000) + 'K';
      }
      return '€' + new Intl.NumberFormat('it-IT').format(Math.round(roundedValue));
      
    case 'percentage':
      return Math.round(roundedValue) + '%';
      
    case 'decimal':
      if (Math.abs(roundedValue) >= 1000) {
        return (Math.round(roundedValue / 100) / 10) + 'K';
      }
      return roundedValue.toFixed(1);
      
    case 'number':
    default:
      return formatNumber(roundedValue, format);
  }
};

export const parseFormattedNumber = (input: string, format: NumberFormat = 'number'): number => {
  if (!input || input.trim() === '') return 0;
  
  // Remove formatting characters but preserve the original number structure
  let cleanInput = input.trim();
  
  // Remove currency and percentage symbols
  cleanInput = cleanInput.replace(/[€%]/g, '');
  
  // Remove spaces and non-numeric characters except dots, commas, and minus
  cleanInput = cleanInput.replace(/[^\d.,-]/g, '');
  
  // Handle Italian number format (1.000.000,50) vs English (1,000,000.50)
  // If there are multiple dots or commas, treat the last one as decimal separator
  const lastDotIndex = cleanInput.lastIndexOf('.');
  const lastCommaIndex = cleanInput.lastIndexOf(',');
  
  if (lastDotIndex > lastCommaIndex && lastDotIndex > 0) {
    // Likely English format: 1,000.50
    cleanInput = cleanInput.replace(/,/g, ''); // Remove thousand separators
  } else if (lastCommaIndex > lastDotIndex && lastCommaIndex > 0) {
    // Likely Italian format: 1.000,50
    // Replace dots (thousand separators) and convert comma to dot
    cleanInput = cleanInput.substring(0, lastCommaIndex).replace(/\./g, '') + 
                 '.' + cleanInput.substring(lastCommaIndex + 1);
  } else if (lastDotIndex === lastCommaIndex) {
    // No decimal separator, just remove any thousand separators
    // If only dots, remove them (e.g., "270.200" -> "270200")
    // If only commas, remove them (e.g., "270,200" -> "270200")
    if (cleanInput.includes('.') && !cleanInput.includes(',')) {
      // Only dots - treat as thousand separators unless it's a small decimal
      const dotCount = (cleanInput.match(/\./g) || []).length;
      if (dotCount === 1 && cleanInput.split('.')[1].length <= 2) {
        // Single dot with 1-2 digits after = decimal
        // Keep as is
      } else {
        // Multiple dots or single dot with >2 digits = thousand separators
        cleanInput = cleanInput.replace(/\./g, '');
      }
    } else if (cleanInput.includes(',') && !cleanInput.includes('.')) {
      // Only commas - remove as thousand separators
      cleanInput = cleanInput.replace(/,/g, '');
    }
  }
  
  const value = parseFloat(cleanInput);
  if (isNaN(value)) return 0;
  
  // Handle percentage (convert to decimal for storage)
  if (format === 'percentage' && input.includes('%')) {
    return value; // Store as percentage value, not decimal
  }
  
  return value;
};

export const getFormatLabel = (format: NumberFormat): string => {
  switch (format) {
    case 'currency': return 'Valuta (€)';
    case 'percentage': return 'Percentuale (%)';
    case 'decimal': return 'Decimale (2 cifre)';
    case 'number': 
    default: return 'Numero';
  }
};

export const getFormatExample = (format: NumberFormat): string => {
  const sampleValue = 12345.67;
  return `es. ${formatNumber(sampleValue, format)}`;
};