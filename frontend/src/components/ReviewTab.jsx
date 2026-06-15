import { useEffect, useRef, useState } from 'react';
import { reviewsApi } from '../utils/api';
import { useDialog } from './ui/Dialog';
import AuthImage from './ui/AuthImage';

const PHOTO_SLOTS = [
  { key: 'front', label: 'Frontal' },
  { key: 'left', label: 'Lateral Izq.' },
  { key: 'right', label: 'Lateral Der.' },
  { key: 'back', label: 'Espalda' },
];

const MEASURES = [
  { key: 'weight', label: 'Peso', unit: 'kg' },
  { key: 'waist', label: 'Cintura', unit: 'cm' },
  { key: 'hip', label: 'Cadera', unit: 'cm' },
  { key: 'neck', label: 'Cuello', unit: 'cm' },
  { key: 'biceps', label: 'Bíceps', unit: 'cm' },
  { key: 'leg', label: 'Pierna', unit: 'cm' },
];

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return '0d 0h 0m';
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function LockedView({ secondsLeft, nextReviewAt }) {
  const nextDate = nextReviewAt ? new Date(nextReviewAt) : null;
  return (
    <div className="glass-panel fade-in" style={{ padding: '50px 24px', textAlign: 'center', borderTop: '4px solid #ffaa00' }}>
      <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>🔒</div>
      <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Revisión bloqueada</h3>
      <p style={{ color: 'var(--text-muted)', maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.6 }}>
        Tu próxima revisión todavía no está disponible. Sigue entrenando y vuelve cuando termine la cuenta atrás.
      </p>
      <div style={{ display: 'inline-block', background: 'rgba(255,170,0,0.12)', border: '1px solid #ffaa00', borderRadius: '16px', padding: '20px 30px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Disponible en</div>
        <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffaa00', fontVariantNumeric: 'tabular-nums' }}>{formatCountdown(secondsLeft)}</div>
        {nextDate && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            {nextDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewTab({ onLockChange }) {
  const dialog = useDialog();
  const [loading, setLoading] = useState(true);
  const [lock, setLock] = useState({ locked: false, secondsRemaining: 0, nextReviewAt: null });
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Create form state
  const [form, setForm] = useState({ weight: '', waist: '', hip: '', neck: '', biceps: '', leg: '', clientComments: '' });
  const [photos, setPhotos] = useState({}); // { slot: { file, preview } }
  const fileInputs = useRef({});

  const refresh = async () => {
    setLoading(true);
    try {
      const [lockStatus, activeReview, hist] = await Promise.all([
        reviewsApi.lockStatus(),
        reviewsApi.active(),
        reviewsApi.history(),
      ]);
      setLock(lockStatus || { locked: false });
      setSecondsLeft(lockStatus?.secondsRemaining || 0);
      setActive(activeReview);
      setHistory(hist || []);
      if (onLockChange) onLockChange(!!lockStatus?.locked);
    } catch (e) {
      dialog.toast('No se pudo cargar la revisión', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, []);

  // Live countdown while locked.
  useEffect(() => {
    if (!lock.locked) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [lock.locked]);

  const pickPhoto = (slot, fromCamera) => {
    const input = fileInputs.current[`${slot}_${fromCamera ? 'cam' : 'lib'}`];
    if (input) input.click();
  };

  const onFileSelected = (slot, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      dialog.toast('Selecciona una imagen', { variant: 'error' });
      return;
    }
    setPhotos((prev) => {
      if (prev[slot]?.preview) URL.revokeObjectURL(prev[slot].preview);
      return { ...prev, [slot]: { file, preview: URL.createObjectURL(file) } };
    });
  };

  const removeStagedPhoto = (slot) => {
    setPhotos((prev) => {
      if (prev[slot]?.preview) URL.revokeObjectURL(prev[slot].preview);
      const copy = { ...prev };
      delete copy[slot];
      return copy;
    });
  };

  const submitReview = async () => {
    if (!form.weight || form.weight.toString().trim() === '') {
      await dialog.alert('Introduce al menos el peso para enviar la revisión.', { title: 'Faltan datos' });
      return;
    }
    setSubmitting(true);
    try {
      const measurements = {};
      MEASURES.forEach(({ key }) => {
        if (form[key] !== '' && form[key] !== null && form[key] !== undefined) measurements[key] = parseFloat(form[key]);
      });
      measurements.clientComments = form.clientComments || null;

      const review = await reviewsApi.create(measurements);
      const entries = Object.entries(photos);
      for (const [slot, { file }] of entries) {
        await reviewsApi.uploadImage(review.id, file, slot);
      }
      Object.values(photos).forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setPhotos({});
      setForm({ weight: '', waist: '', hip: '', neck: '', biceps: '', leg: '', clientComments: '' });
      dialog.toast('Revisión enviada a tu entrenador', { variant: 'success' });
      await refresh();
    } catch (e) {
      if (e.status === 423) {
        await dialog.alert('La próxima revisión todavía no está disponible.', { title: 'Bloqueado' });
      } else {
        await dialog.alert(e.message || 'No se pudo enviar la revisión.', { title: 'Error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const acknowledge = async () => {
    const ok = await dialog.confirm('Al confirmar, esta revisión se archivará en tu historial y se activará la cuenta atrás para la siguiente. ¿Continuar?', { title: 'Feedback recibido', confirmText: 'Sí, recibido' });
    if (!ok) return;
    try {
      await reviewsApi.feedbackReceived(active.id);
      dialog.toast('Revisión archivada', { variant: 'success' });
      await refresh();
    } catch (e) {
      await dialog.alert(e.message || 'No se pudo completar.', { title: 'Error' });
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Cargando revisión...</div>;
  }

  return (
    <div className="fade-in">
      {/* Hidden file inputs (camera + library per slot) */}
      {PHOTO_SLOTS.map(({ key }) => (
        <span key={key}>
          <input ref={(el) => (fileInputs.current[`${key}_cam`] = el)} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onFileSelected(key, e)} />
          <input ref={(el) => (fileInputs.current[`${key}_lib`] = el)} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFileSelected(key, e)} />
        </span>
      ))}

      {active ? (
        <ActiveReview review={active} onAcknowledge={acknowledge} refresh={refresh} />
      ) : lock.locked ? (
        <LockedView secondsLeft={secondsLeft} nextReviewAt={lock.nextReviewAt} />
      ) : (
        <>
          <div style={{ background: 'rgba(224, 248, 0, 0.1)', border: '1px solid var(--accent-primary)', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3 style={{ color: 'var(--accent-primary)', marginBottom: '5px' }}>📝 Preparar Revisión</h3>
            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Envía tus medidas y fotos actuales a tu entrenador para que evalúe tu progreso.</p>
          </div>

          <h4 style={{ marginBottom: '10px' }}>Tus Medidas Actuales</h4>
          <div className="responsive-grid-2" style={{ gap: '10px', marginBottom: '20px' }}>
            {MEASURES.map(({ key, label, unit }) => (
              <input key={key} type="number" step="0.1" className="input-field" style={{ margin: 0 }}
                placeholder={`${label} (${unit})`} value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            ))}
          </div>

          <h4 style={{ marginBottom: '10px' }}>Tus Fotos</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
            {PHOTO_SLOTS.map(({ key, label }) => {
              const staged = photos[key];
              return (
                <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--border-light)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ aspectRatio: '3/4', borderRadius: '6px', overflow: 'hidden', background: staged ? `url(${staged.preview}) center/cover` : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {!staged && label}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
                  {staged ? (
                    <button onClick={() => removeStagedPhoto(key)} style={{ width: '100%', padding: '8px', background: 'rgba(255,69,0,0.1)', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Quitar</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => pickPhoto(key, true)} style={{ flex: 1, padding: '8px', background: 'rgba(224,248,0,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>📷 Cámara</button>
                      <button onClick={() => pickPhoto(key, false)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🖼️ Galería</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <h4 style={{ marginBottom: '10px' }}>Comentarios adicionales</h4>
          <textarea className="input-field" style={{ width: '100%', minHeight: '100px', resize: 'vertical' }}
            placeholder="¿Cómo te has sentido? ¿Alguna molestia o sugerencia?"
            value={form.clientComments} onChange={(e) => setForm({ ...form, clientComments: e.target.value })} />

          <button className="btn-primary" disabled={submitting} style={{ width: '100%', padding: '15px', marginTop: '10px', fontSize: '1.1rem', opacity: submitting ? 0.6 : 1 }} onClick={submitReview}>
            {submitting ? 'Enviando...' : '📤 Enviar Revisión'}
          </button>
        </>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '15px' }}>📅 Historial de Revisiones</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {history.map((r) => <HistoryItem key={r.id} review={r} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function MeasuresGrid({ review }) {
  const present = MEASURES.filter(({ key }) => review[key] !== null && review[key] !== undefined);
  if (present.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px' }}>
      {present.map(({ key, label, unit }) => (
        <div key={key} style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{review[key]}{unit}</div>
        </div>
      ))}
    </div>
  );
}

function PhotoStrip({ images }) {
  if (!images || images.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, images.length)}, 1fr)`, gap: '10px' }}>
      {images.map((img) => (
        <div key={img.id} style={{ aspectRatio: '3/4', borderRadius: '8px', overflow: 'hidden' }}>
          <AuthImage imageId={img.id} alt={img.view || 'foto'} style={{ width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
}

function ActiveReview({ review, onAcknowledge, refresh }) {
  const dialog = useDialog();
  const validated = review.status === 'VALIDATED';
  const fileInputs = useRef({});

  const pickPhoto = (slot, fromCamera) => {
    const input = fileInputs.current[`${slot}_${fromCamera ? 'cam' : 'lib'}`];
    if (input) input.click();
  };

  const onFileSelected = async (slot, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      dialog.toast('Selecciona una imagen', { variant: 'error' });
      return;
    }
    try {
      dialog.toast('Subiendo imagen...', { variant: 'info' });
      await reviewsApi.uploadImage(review.id, file, slot);
      dialog.toast('Imagen subida correctamente', { variant: 'success' });
      if (refresh) refresh();
    } catch (err) {
      dialog.toast('No se pudo subir la imagen', { variant: 'error' });
    }
  };

  const handleRemove = async (imageId) => {
    try {
      await reviewsApi.deleteImage(imageId);
      dialog.toast('Imagen eliminada', { variant: 'success' });
      if (refresh) refresh();
    } catch (err) {
      dialog.toast('No se pudo eliminar la imagen', { variant: 'error' });
    }
  };

  return (
    <>
      {/* Hidden file inputs for ActiveReview pending state */}
      {!validated && PHOTO_SLOTS.map(({ key }) => (
        <span key={key}>
          <input ref={(el) => (fileInputs.current[`${key}_cam`] = el)} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => onFileSelected(key, e)} />
          <input ref={(el) => (fileInputs.current[`${key}_lib`] = el)} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onFileSelected(key, e)} />
        </span>
      ))}

      <div style={{ background: validated ? 'rgba(0,230,118,0.1)' : 'rgba(224,248,0,0.1)', border: `1px solid ${validated ? '#00e676' : 'var(--accent-primary)'}`, padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3 style={{ color: validated ? '#00e676' : 'var(--accent-primary)', marginBottom: '5px' }}>
          {validated ? '✅ Evaluación Recibida' : '⏳ Revisión Enviada'}
        </h3>
        <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>
          {validated
            ? 'Tu entrenador ha analizado tu revisión. Lee el feedback y márcalo como recibido.'
            : 'Tu entrenador está evaluando tus progresos. Te avisaremos cuando termine.'}
        </p>
      </div>

      {validated && review.coachFeedback && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', borderLeft: '4px solid var(--accent-primary)' }}>
          <h4 style={{ color: 'var(--accent-primary)', marginBottom: '10px' }}>💬 Feedback del Entrenador</h4>
          <p style={{ fontStyle: 'italic', lineHeight: 1.5, whiteSpace: 'pre-line' }}>"{review.coachFeedback}"</p>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '15px', marginBottom: '20px' }}>
        <MeasuresGrid review={review} />
        {review.clientComments && (
          <p style={{ margin: '12px 0 0', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-muted)' }}>"{review.clientComments}"</p>
        )}
      </div>

      {!validated ? (
        <>
          <h4 style={{ marginBottom: '10px' }}>Tus Fotos (Puedes modificarlas mientras está pendiente)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px', marginBottom: '20px' }}>
            {PHOTO_SLOTS.map(({ key, label }) => {
              const img = review.images?.find((i) => i.view === key);
              return (
                <div key={key} style={{ background: 'rgba(255,255,255,0.03)', border: '2px dashed var(--border-light)', borderRadius: '8px', padding: '10px' }}>
                  <div style={{ aspectRatio: '3/4', borderRadius: '6px', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    {img ? (
                      <AuthImage imageId={img.id} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      label
                    )}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</div>
                  {img ? (
                    <button onClick={() => handleRemove(img.id)} style={{ width: '100%', padding: '8px', background: 'rgba(255,69,0,0.1)', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Quitar</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => pickPhoto(key, true)} style={{ flex: 1, padding: '8px', background: 'rgba(224,248,0,0.1)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>📷 Cámara</button>
                      <button onClick={() => pickPhoto(key, false)} style={{ flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>🖼️ Galería</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ marginBottom: '20px' }}><PhotoStrip images={review.images} /></div>
      )}

      {validated && (
        <button className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }} onClick={onAcknowledge}>
          👍 Marcar Feedback como Recibido
        </button>
      )}
    </>
  );
}

function HistoryItem({ review }) {
  const [open, setOpen] = useState(false);
  const date = review.archivedAt || review.createdAt;
  return (
    <div className="glass-panel" style={{ padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setOpen((o) => !o)}>
        <div>
          <h4 style={{ color: '#fff', marginBottom: '4px' }}>Revisión del {date ? new Date(date).toLocaleDateString('es-ES') : '—'}</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Evaluada por tu entrenador</p>
        </div>
        <span style={{ color: 'var(--accent-primary)', fontSize: '1.2rem' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: '15px', display: 'grid', gap: '15px' }}>
          {review.coachFeedback && (
            <div style={{ background: 'rgba(224,248,0,0.05)', border: '1px dashed var(--accent-primary)', borderRadius: '8px', padding: '12px', fontSize: '0.9rem', fontStyle: 'italic' }}>
              💬 "{review.coachFeedback}"
            </div>
          )}
          <MeasuresGrid review={review} />
          {review.clientComments && <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>"{review.clientComments}"</p>}
          <PhotoStrip images={review.images} />
        </div>
      )}
    </div>
  );
}
