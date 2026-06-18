import { useEffect, useState } from 'react';
import { exercisesApi } from '../utils/api';
import { useDialog } from './ui/Dialog';
import { refreshCustomExerciseCache } from './SearchableExerciseSelect';

/**
 * CRUD panel for the coach-curated exercise catalogue. Used from the coach dashboard.
 * Reads /api/exercises, lets the coach add, rename and delete entries, and forces
 * SearchableExerciseSelect to refetch on every mutation so the routine builder stays
 * in sync without a page reload.
 */
export default function ExercisesManager() {
  const dialog = useDialog();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await exercisesApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      dialog.toast('No se pudo cargar el catálogo', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = search.trim()
    ? items.filter(ex => ex.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items;

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await exercisesApi.create(name, '');
      refreshCustomExerciseCache();
      setNewName('');
      dialog.toast(`Añadido "${name}"`, { variant: 'success' });
      await load();
    } catch (e) {
      await dialog.alert(e.message || 'No se pudo crear el ejercicio.', { title: 'Error' });
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (ex) => {
    setEditingId(ex.id);
    setEditingName(ex.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveEdit = async () => {
    const name = editingName.trim();
    if (!name) {
      await dialog.alert('El nombre no puede estar vacío.', { title: 'Faltan datos' });
      return;
    }
    try {
      await exercisesApi.update(editingId, { name });
      refreshCustomExerciseCache();
      dialog.toast('Ejercicio actualizado', { variant: 'success' });
      setEditingId(null);
      setEditingName('');
      await load();
    } catch (e) {
      await dialog.alert(e.message || 'No se pudo actualizar.', { title: 'Error' });
    }
  };

  const handleDelete = async (ex) => {
    const ok = await dialog.confirm(`¿Eliminar "${ex.name}" del catálogo? Las rutinas que ya lo usan no se ven afectadas.`,
      { title: 'Eliminar ejercicio', confirmText: 'Eliminar', danger: true });
    if (!ok) return;
    try {
      await exercisesApi.remove(ex.id);
      refreshCustomExerciseCache();
      dialog.toast('Eliminado', { variant: 'success' });
      await load();
    } catch (e) {
      await dialog.alert(e.message || 'No se pudo eliminar.', { title: 'Error' });
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <div className="manager-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', gap: '15px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem' }}>Catálogo de Ejercicios</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '5px' }}>
            Ejercicios personalizados disponibles al crear rutinas y plantillas.
          </p>
        </div>
        <input
          type="text"
          className="input-field"
          placeholder="🔍 Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: '0', width: '260px', maxWidth: '100%' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text"
          className="input-field"
          placeholder="Nombre del nuevo ejercicio..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={{ marginBottom: 0, flex: '1 1 240px', minWidth: 0 }}
        />
        <button
          onClick={handleCreate}
          disabled={!newName.trim() || creating}
          className="btn-primary"
          style={{ padding: '10px 18px', opacity: (!newName.trim() || creating) ? 0.6 : 1 }}
        >
          {creating ? 'Añadiendo…' : '+ Añadir'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px', border: '1px dashed var(--border-light)', borderRadius: '12px' }}>
          {items.length === 0 ? 'Aún no hay ejercicios personalizados. Añade uno arriba.' : 'No se encontraron resultados.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {filtered.map(ex => (
            <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '10px 14px' }}>
              {editingId === ex.id ? (
                <>
                  <input
                    autoFocus
                    type="text"
                    className="input-field"
                    style={{ flex: 1, marginBottom: 0 }}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      else if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button onClick={saveEdit} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>💾 Guardar</button>
                  <button onClick={cancelEdit} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Cancelar</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: '600' }}>{ex.name}</span>
                  <button onClick={() => startEdit(ex)} title="Editar"
                    style={{ background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
                  <button onClick={() => handleDelete(ex)} title="Eliminar"
                    style={{ background: 'transparent', border: '1px solid #ff4500', color: '#ff4500', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
