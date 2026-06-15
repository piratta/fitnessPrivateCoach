export const getClientBillingStatus = (client) => {
  if (client.status === 'Inactivo') return { text: 'Desactivado', color: '#ff4500', bg: 'rgba(255, 69, 0, 0.15)' };
  if (client.gracePeriod === 'Gratuito') return { text: 'Gratuito', color: '#00e676', bg: 'rgba(0, 230, 118, 0.1)' };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const paymentDate = new Date(client.nextPaymentDate);
  paymentDate.setHours(0, 0, 0, 0);

  if (client.gracePeriod) {
    const graceDate = new Date(client.gracePeriod);
    graceDate.setHours(0, 0, 0, 0);
    if (today <= graceDate) {
      return { text: 'En Gracia', color: '#ffaa00', bg: 'rgba(255, 170, 0, 0.1)' };
    } else {
      return { text: 'BAJA', color: '#ff0000', bg: 'rgba(255, 0, 0, 0.2)' };
    }
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
