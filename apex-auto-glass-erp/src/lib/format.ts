export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date | null | undefined): string {
  // Validar se a data existe e é válida
  if (!date) return '-';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return '-';
    }
    
    return new Intl.DateTimeFormat('pt-BR').format(dateObj);
  } catch (error) {
    console.warn('Erro ao formatar data:', date, error);
    return '-';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  // Validar se a data existe e é válida
  if (!date) return '-';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return '-';
    }
    
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(dateObj);
  } catch (error) {
    console.warn('Erro ao formatar data/hora:', date, error);
    return '-';
  }
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function formatCPFCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  }
  if (cleaned.length === 14) {
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  }
  return value;
}

export function formatPlate(plate: string): string {
  const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  }
  return plate.toUpperCase();
}
