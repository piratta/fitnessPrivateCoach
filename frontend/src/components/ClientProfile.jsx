import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { authApi, usersApi } from '../utils/api';
import { useDialog } from './ui/Dialog';

const PLANS = [
  { id: 'bp1', name: 'Mensual', months: 1 },
  { id: 'bp2', name: 'Trimestral', months: 3 },
  { id: 'bp3', name: 'Semestral', months: 6 },
  { id: 'bp4', name: 'Anual', months: 12 },
];

/**
 * Reuses the same logic as CoachDashboard so the date shown to the client matches what the
 * trainer sees. Walks `createdAt` forward by the plan duration until it lands in the future.
 */
function computeNextPayment(createdAt, planId) {
  const plan = PLANS.find((p) => p.id === planId) || PLANS[0];
  const months = plan.months || 1;
  const base = createdAt ? new Date(createdAt) : new Date();
  const now = new Date();
  const date = new Date(base);
  let guard = 0;
  while (date <= now && guard < 240) {
    date.setMonth(date.getMonth() + months);
    guard++;
  }
  return date;
}

export default function ClientProfile({ user, onClose, onUpdated }) {
  const dialog = useDialog();
  const [form, setForm] = useState({ name: '', lastName: '', birthDate: '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      lastName: user.lastName || '',
      birthDate: user.birthDate || '',
    });
  }, [user]);

  const renewalDate = computeNextPayment(user?.createdAt, user?.billingPlanId);
  const planName = (PLANS.find((p) => p.id === (user?.billingPlanId || 'bp1')) || PLANS[0]).name;

  const saveProfile = async () => {
    if (!form.name.trim()) {
      await dialog.alert('El nombre no puede estar vacío.', { title: 'Faltan datos' });
      return;
    }
    setSaving(true);
    try {
      const updated = await usersApi.updateMe({
        name: form.name.trim(),
        lastName: form.lastName.trim() || null,
        birthDate: form.birthDate || null,
      });
      dialog.toast('Perfil actualizado', { variant: 'success' });
      if (onUpdated) onUpdated(updated);
    } catch (e) {
      await dialog.alert(e.message || 'No se pudo actualizar el perfil.', { title: 'Error' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwd.current) {
      await dialog.alert('Introduce tu contraseña actual.', { title: 'Faltan datos' });
      return;
    }
    if (!pwd.next || pwd.next.length < 4) {
      await dialog.alert('La nueva contraseña debe tener al menos 4 caracteres.', { title: 'Contraseña inválida' });
      return;
    }
    if (pwd.next !== pwd.confirm) {
      await dialog.alert('La confirmación no coincide.', { title: 'Contraseña inválida' });
      return;
    }
    setChangingPwd(true);
    try {
      await authApi.changePassword(pwd.current, pwd.next);
      setPwd({ current: '', next: '', confirm: '' });
      dialog.toast('Contraseña actualizada', { variant: 'success' });
    } catch (e) {
      await dialog.alert(e.message || 'No se pudo cambiar la contraseña.', { title: 'Error' });
    } finally {
      setChangingPwd(false);
    }
  };

  return createPortal(
    <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 3500, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }} onClick={onClose}>
      <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '520px', background: 'rgba(20,20,24,0.98)', padding: '28px', borderTop: '4px solid var(--accent-primary)', marginTop: '40px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Mi Perfil</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Datos personales */}
        <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontSize: '0.8rem' }}>Datos personales</h4>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Nombre</label>
            <input className="input-field" style={{ margin: 0, width: '100%' }} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Apellidos</label>
            <input className="input-field" style={{ margin: 0, width: '100%' }} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Fecha de nacimiento</label>
            <input type="date" className="input-field" style={{ margin: 0, width: '100%', colorScheme: 'dark' }} value={form.birthDate || ''} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
          </div>
        </div>
        <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{ width: '100%', padding: '12px', marginBottom: '24px', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Guardando...' : '💾 Guardar cambios'}
        </button>

        {/* Suscripción (solo lectura) */}
        <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontSize: '0.8rem' }}>Suscripción</h4>
        <div style={{ background: 'rgba(224,248,0,0.05)', border: '1px dashed var(--accent-primary)', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Plan</span>
            <span style={{ fontWeight: 'bold' }}>{planName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Próxima renovación</span>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>
              {renewalDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '10px', marginBottom: 0 }}>
            Esta fecha la gestiona tu entrenador. Si tienes dudas sobre el cobro, contáctale por el chat.
          </p>
        </div>

        {/* Cambio de contraseña */}
        <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontSize: '0.8rem' }}>Cambiar contraseña</h4>
        <div style={{ display: 'grid', gap: '12px', marginBottom: '14px' }}>
          <input type="password" className="input-field" style={{ margin: 0 }} placeholder="Contraseña actual" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          <input type="password" className="input-field" style={{ margin: 0 }} placeholder="Nueva contraseña" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          <input type="password" className="input-field" style={{ margin: 0 }} placeholder="Repite la nueva contraseña" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
        </div>
        <button onClick={changePassword} disabled={changingPwd} style={{ width: '100%', padding: '12px', background: 'rgba(255,170,0,0.15)', border: '1px solid #ffaa00', color: '#ffaa00', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', opacity: changingPwd ? 0.7 : 1 }}>
          {changingPwd ? 'Cambiando...' : '🔑 Cambiar contraseña'}
        </button>

      </div>
    </div>,
    document.body
  );
}
