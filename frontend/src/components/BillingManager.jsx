import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { getClientBillingStatus } from '../utils/statusUtils';
import { useDialog } from './ui/Dialog';
import '../index.css';

export default function BillingManager({ clients, setClients, billingPlans, setBillingPlans }) {
  const dialog = useDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', months: 1 });

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    const billStatus = getClientBillingStatus(c).text;
    
    if (statusFilter === 'Al Día') {
      matchesStatus = c.status === 'Activo' && (['Al Día', 'Gratuito', 'Vence Hoy'].includes(billStatus) || billStatus.includes('restante'));
    } else if (statusFilter === 'Desactivado') {
      matchesStatus = c.status === 'Inactivo' || billStatus === 'Desactivado';
    } else if (statusFilter === 'En Gracia') {
      matchesStatus = c.status === 'Activo' && billStatus === 'En Gracia';
    }
    
    return matchesSearch && matchesStatus;
  });

  const getStatus = getClientBillingStatus;

  const [toast, setToast] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleRenovar = (clientId, paymentMethod) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        const plan = billingPlans.find(p => p.id === c.billingPlanId) || billingPlans[0];
        const monthsToAdd = plan ? plan.months : 1;
        
        const currentDate = new Date(c.nextPaymentDate);
        currentDate.setMonth(currentDate.getMonth() + monthsToAdd);
        const newDateString = currentDate.toISOString().split('T')[0];
        
        showToast(`✅ Suscripción renovada para ${c.name} hasta el ${newDateString}`);
        
        return { 
          ...c, 
          status: 'Activo',
          nextPaymentDate: newDateString, 
          lastPaymentDate: new Date().toISOString().split('T')[0],
          lastPaymentMethod: paymentMethod,
          gracePeriod: null // Clear grace period on renew
        };
      }
      return c;
    }));
  };

  const handleApplyGrace = (clientId, periodString) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        if (periodString === 'Gratuito') {
          showToast(`✅ Periodo gratuito infinito aplicado a ${c.name}`);
          return { ...c, gracePeriod: 'Gratuito' };
        }
        
        const days = parseInt(periodString);
        const graceDate = new Date();
        graceDate.setDate(graceDate.getDate() + days);
        const graceDateString = graceDate.toISOString().split('T')[0];
        
        showToast(`✅ Periodo de gracia aplicado a ${c.name} hasta el ${graceDateString}`);
        return { ...c, gracePeriod: graceDateString };
      }
      return c;
    }));
  };

  const handleDateChange = (clientId, newDate) => {
    setClients(prev => prev.map(c => {
      if (c.id === clientId) {
        return { ...c, nextPaymentDate: newDate };
      }
      return c;
    }));
  };

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <div className="mobile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem' }}>Facturación y Suscripciones</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>Gestiona los pagos, renovaciones y periodos de gracia. Puedes editar la fecha del próximo pago para migrar clientes.</p>
        </div>
        <div className="mobile-header-actions" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowPlansModal(true)}
            style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 16px', borderRadius: '6px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            ⚙️ Gestionar Planes
          </button>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ marginBottom: '0', width: '150px' }}
          >
            <option value="Todos">Todos</option>
            <option value="Al Día">Al Día</option>
            <option value="Desactivado">Desactivado</option>
            <option value="En Gracia">En Gracia</option>
          </select>
          <input 
            type="text" 
            className="input-field" 
            placeholder="🔍 Buscar cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ marginBottom: '0', width: '250px' }}
          />
        </div>
      </div>

      <div className="table-responsive">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
          <tr style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.85rem', letterSpacing: '1px' }}>
            <th style={{ padding: '15px' }}>Cliente</th>
            <th style={{ padding: '15px' }}>Próximo Pago</th>
            <th style={{ padding: '15px' }}>Estado</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Renovación (Método de Pago)</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Acciones</th>
            <th style={{ padding: '15px', textAlign: 'right' }}>Periodo de Gracia</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map(client => {
            const status = getStatus(client);
            const isPending = status.text === 'Pendiente' || status.text === 'BAJA' || status.text === 'Desactivado';
            
            return (
              <tr key={client.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '15px', fontWeight: '600' }}>
                  {client.name}
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'normal', marginBottom: '5px' }}>{client.email}</div>
                  <select 
                    value={client.billingPlanId || 'bp1'} 
                    onChange={(e) => setClients(prev => prev.map(c => c.id === client.id ? { ...c, billingPlanId: e.target.value } : c))}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: 'var(--text-main)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}
                  >
                    {billingPlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {client.lastPaymentDate && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '4px' }}>
                      Último pago: {client.lastPaymentDate} ({client.lastPaymentMethod})
                    </div>
                  )}
                </td>
                <td style={{ padding: '15px', fontWeight: 'bold' }}>
                  {client.gracePeriod === 'Gratuito' ? '∞' : (
                    <input 
                      type="date" 
                      value={client.nextPaymentDate || ''} 
                      onChange={(e) => handleDateChange(client.id, e.target.value)}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-main)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        fontFamily: 'Outfit',
                        cursor: 'pointer',
                        width: '135px'
                      }}
                    />
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold',
                    background: status.bg, color: status.color 
                  }}>
                    {status.text}
                  </span>
                </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                        <select 
                          id={`payment-method-${client.id}`}
                          className="input-field" 
                          style={{ width: '150px', marginBottom: 0, padding: '6px' }}
                          defaultValue={client.lastPaymentMethod || 'Tarjeta'}
                        >
                          <option value="Tarjeta">Tarjeta</option>
                          <option value="Transferencia">Transferencia</option>
                          <option value="Bizum">Bizum</option>
                          <option value="Efectivo">Efectivo</option>
                        </select>
                        <button 
                          style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}
                          onClick={() => {
                            const method = document.getElementById(`payment-method-${client.id}`).value;
                            handleRenovar(client.id, method);
                          }}
                        >
                          Renovar
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '15px', textAlign: 'right' }}>
                      {(status.text === 'BAJA' || status.text === 'Pendiente' || status.text === 'Desactivado') ? (
                        <button onClick={async () => {
                          const ok = await dialog.confirm(`⚠️ ¿Estás seguro de eliminar PERMANENTEMENTE a ${client.name}?\n\nSu suscripción ha caducado. Esta acción no se puede deshacer y se borrarán todos sus datos.`, { title: 'Eliminar cliente' });
                          if (ok) {
                            setClients(prev => prev.filter(c => c.id !== client.id));
                            showToast(`🗑️ Cliente ${client.name} eliminado permanentemente`);
                          }
                        }} style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid #ff0000', color: '#ff0000', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.8rem' }}>❌ Borrar</button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>🔒 Activo</span>
                      )}
                    </td>
                <td style={{ padding: '15px', textAlign: 'right' }}>
                  {isPending ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                      <select 
                        id={`grace-period-${client.id}`}
                        className="input-field" 
                        style={{ width: '150px', marginBottom: 0, padding: '6px' }}
                      >
                        <option value="3">+ 3 Días</option>
                        <option value="7">+ 7 Días</option>
                        <option value="15">+ 15 Días</option>
                        <option value="Gratuito">Gratuito (Infinito)</option>
                        {status.text === 'Desactivado' ? (
                          <option value="Reactivar">🟢 Reactivar</option>
                        ) : (
                          <option value="Desactivar">🛑 Desactivar</option>
                        )}
                      </select>
                      <button 
                        style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', color: '#ffaa00', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}
                        onClick={async () => {
                          const period = document.getElementById(`grace-period-${client.id}`).value;
                          if (period === 'Desactivar') {
                            const ok = await dialog.confirm(`¿Desactivar a ${client.name}? No podrá acceder a sus rutinas hasta que renueve.`, { title: 'Desactivar cliente' });
                            if (ok) {
                              setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: 'Inactivo' } : c));
                              showToast(`🛑 Cliente ${client.name} desactivado`);
                            }
                          } else if (period === 'Reactivar') {
                            setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: 'Activo' } : c));
                            showToast(`🟢 Cliente ${client.name} reactivado manualmente`);
                          } else {
                            handleApplyGrace(client.id, period);
                          }
                        }}
                      >
                        Aplicar
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {client.gracePeriod === 'Gratuito' ? 'Activo (Gratis)' : (client.gracePeriod ? `Hasta ${client.gracePeriod}` : 'No necesario')}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          {filteredClients.length === 0 && (
            <tr>
              <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se encontraron clientes.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--accent-primary)',
          color: '#000',
          padding: '15px 25px',
          borderRadius: '8px',
          fontWeight: 'bold',
          boxShadow: '0 5px 15px rgba(224, 248, 0, 0.4)',
          zIndex: 9999,
          animation: 'fadeIn 0.3s ease-in-out'
        }}>
          {toast}
        </div>
      )}

      {/* Modal Planes de Facturación */}
      {showPlansModal && createPortal(
        <div className="fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Planes de Facturación</h3>
              <button onClick={() => setShowPlansModal(false)} style={{ background: 'none', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>Tus Planes Actuales</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {billingPlans.map(plan => (
                  <li key={plan.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', marginBottom: '5px' }}>
                    <span>{plan.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({plan.months} meses)</span></span>
                    <button onClick={() => setBillingPlans(prev => prev.filter(p => p.id !== plan.id))} style={{ background: 'none', border: 'none', color: '#ff4500', cursor: 'pointer' }}>🗑️</button>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>Añadir Nuevo Plan</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input type="text" className="input-field" placeholder="Nombre (Ej. Anual)" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} style={{ flex: '1 1 150px', minWidth: '150px', marginBottom: 0, background: 'rgba(255,255,255,0.1)' }} />
                <input type="number" min="1" className="input-field" placeholder="Meses" value={newPlan.months} onChange={e => setNewPlan({...newPlan, months: parseInt(e.target.value) || 1})} style={{ flex: '0 0 80px', width: '80px', marginBottom: 0, background: 'rgba(255,255,255,0.1)' }} />
                <button className="btn-primary" style={{ flex: '0 0 auto', padding: '0 15px', height: '45px' }} onClick={() => {
                  if(newPlan.name) {
                    setBillingPlans([...billingPlans, { id: Date.now().toString(), name: newPlan.name, months: newPlan.months }]);
                    setNewPlan({ name: '', months: 1 });
                  }
                }}>Añadir</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
