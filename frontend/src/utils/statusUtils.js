/**
 * Parse a date string (YYYY-MM-DD or ISO) into a local-midnight Date.
 * Avoids the timezone pitfall where `new Date("2026-06-20")` is parsed
 * as UTC midnight and can shift to the previous day in negative-offset
 * timezones.
 */
function parseLocalDate(dateStr) {
  if (!dateStr) return new Date(NaN);
  // If it's a pure YYYY-MM-DD string, split to avoid UTC parsing
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // Fallback for other formats
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const getClientBillingStatus = (client) => {
  if (client.status === 'Inactivo') return { text: 'Desactivado', color: '#ff4500', bg: 'rgba(255, 69, 0, 0.15)' };
  if (client.gracePeriod === 'Gratuito') return { text: 'Gratuito', color: '#00e676', bg: 'rgba(0, 230, 118, 0.1)' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paymentDate = parseLocalDate(client.nextPaymentDate);

  if (client.gracePeriod) {
    const graceDate = parseLocalDate(client.gracePeriod);
    if (today <= graceDate) {
      return { text: 'En Gracia', color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.1)' };
    } else {
      return { text: 'BAJA', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.2)' };
    }
  }

  // Guard against invalid / missing payment date
  if (isNaN(paymentDate.getTime())) {
    return { text: 'Sin fecha', color: 'var(--text-muted)', bg: 'rgba(255,255,255,0.05)' };
  }

  if (paymentDate < today) {
    return { text: 'Pendiente', color: '#ff4500', bg: 'rgba(255, 69, 0, 0.1)' };
  }
  
  const diffTime = paymentDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 7 && diffDays > 0) {
    return { text: `${diffDays} ${diffDays === 1 ? 'día restante' : 'días restantes'}`, color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.1)' };
  } else if (diffDays === 0) {
    return { text: 'Vence Hoy', color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.1)' };
  }
  
  return { text: 'Al Día', color: '#00e676', bg: 'rgba(0, 230, 118, 0.1)' };
};
