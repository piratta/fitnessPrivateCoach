import { useRef, useState } from 'react';
import '../index.css';

const PHOTO_SLOTS = [
  { key: 'front', label: 'Frontal' },
  { key: 'left', label: 'Lateral Izq.' },
  { key: 'right', label: 'Lateral Der.' },
  { key: 'back', label: 'Espalda' },
];

const MEASURE_FIELDS = [
  { key: 'peso', label: 'Peso (kg)', placeholder: 'Ej. 75.5' },
  { key: 'altura', label: 'Altura (cm)', placeholder: 'Ej. 178' },
  { key: 'edad', label: 'Edad', placeholder: 'Ej. 28' },
  { key: 'cintura', label: 'Cintura (cm)', placeholder: '' },
  { key: 'cadera', label: 'Cadera (cm)', placeholder: '' },
  { key: 'cuello', label: 'Cuello (cm)', placeholder: '' },
  { key: 'biceps', label: 'Bíceps (cm)', placeholder: '' },
  { key: 'antebrazo', label: 'Antebrazo (cm)', placeholder: '' },
  { key: 'pecho', label: 'Pecho (cm)', placeholder: '' },
  { key: 'espalda', label: 'Espalda (cm)', placeholder: '' },
  { key: 'pierna', label: 'Pierna (cm)', placeholder: '' },
  { key: 'gemelo', label: 'Gemelo (cm)', placeholder: '' },
];

export default function InitialQuestionnaire({ onComplete }) {
  const [formData, setFormData] = useState({
    peso: '', altura: '', edad: '',
    cintura: '', cadera: '', cuello: '', biceps: '', antebrazo: '',
    pecho: '', espalda: '', pierna: '', gemelo: '',
    sueno: '7-8', estres: 'Bajo', digestiones: 'Buenas'
  });
  const [photos, setPhotos] = useState({}); // { slot: { file, preview } }
  const fileInputs = useRef({});

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const pickPhoto = (slot, fromCamera) => {
    const ref = fileInputs.current[`${slot}_${fromCamera ? 'cam' : 'lib'}`];
    if (ref) ref.click();
  };

  const onFileSelected = (slot, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    setPhotos((prev) => {
      if (prev[slot]?.preview) URL.revokeObjectURL(prev[slot].preview);
      return { ...prev, [slot]: { file, preview: URL.createObjectURL(file) } };
    });
  };

  const removePhoto = (slot) => setPhotos((prev) => {
    if (prev[slot]?.preview) URL.revokeObjectURL(prev[slot].preview);
    const copy = { ...prev };
    delete copy[slot];
    return copy;
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(formData, photos);
  };

  return (
    <div className="fade-in" style={{ padding: '20px 10px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '24px', borderTop: '4px solid var(--accent-primary)' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px' }}>Bienvenido a tu nueva etapa 💪</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Cuanta más información nos des, más a medida será tu plan. Todos los campos son opcionales — rellena los que conozcas. Solo tu entrenador verá estos datos.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Hidden file inputs */}
          {PHOTO_SLOTS.map(({ key }) => (
            <span key={key}>
              <input ref={(el) => (fileInputs.current[`${key}_cam`] = el)} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onFileSelected(key, e)} />
              <input ref={(el) => (fileInputs.current[`${key}_lib`] = el)} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFileSelected(key, e)} />
            </span>
          ))}

          <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontSize: '0.85rem' }}>Biometría y medidas</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {MEASURE_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>{label}</label>
                <input type="number" step="0.1" className="input-field" style={{ margin: 0, width: '100%' }}
                  value={formData[key]} placeholder={placeholder}
                  onChange={(e) => update(key, e.target.value)} />
              </div>
            ))}
          </div>

          <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontSize: '0.85rem' }}>Tus fotos iniciales</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
            Estas fotos servirán de referencia inicial para tus futuras revisiones. Opcionales.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {PHOTO_SLOTS.map(({ key, label }) => {
              const staged = photos[key];
              return (
                <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--border-light)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ aspectRatio: '3/4', borderRadius: '6px', overflow: 'hidden', background: staged ? `url(${staged.preview}) center/cover` : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {!staged && label}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
                  {staged ? (
                    <button type="button" onClick={() => removePhoto(key)} style={{ width: '100%', padding: '8px', background: 'rgba(255,69,0,0.1)', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Quitar</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button type="button" onClick={() => pickPhoto(key, true)} style={{ flex: 1, padding: '8px', background: 'rgba(224,248,0,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>📷 Cámara</button>
                      <button type="button" onClick={() => pickPhoto(key, false)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>🖼️ Galería</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h4 style={{ color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', fontSize: '0.85rem' }}>Contexto y recuperación</h4>
          <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Horas de sueño</label>
              <select className="input-field" value={formData.sueno} onChange={(e) => update('sueno', e.target.value)}>
                <option value="Menos de 6">Menos de 6 horas</option>
                <option value="6-7">Entre 6 y 7 horas</option>
                <option value="7-8">Entre 7 y 8 horas</option>
                <option value="Mas de 8">Más de 8 horas</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Nivel de estrés</label>
              <select className="input-field" value={formData.estres} onChange={(e) => update('estres', e.target.value)}>
                <option value="Bajo">Bajo</option>
                <option value="Moderado">Moderado</option>
                <option value="Alto">Alto</option>
                <option value="Extremo">Extremo</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold' }}>Digestiones</label>
              <select className="input-field" value={formData.digestiones} onChange={(e) => update('digestiones', e.target.value)}>
                <option value="Muy Buenas">Muy buenas</option>
                <option value="Buenas">Buenas</option>
                <option value="Regulares">Regulares</option>
                <option value="Malas">Malas</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '16px', fontSize: '1.05rem', width: '100%' }}>
            Guardar y ver mi rutina 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
