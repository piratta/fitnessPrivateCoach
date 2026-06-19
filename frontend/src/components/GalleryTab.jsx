import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { reviewsApi } from '../utils/api';
import AuthImage from './ui/AuthImage';
import { useDialog } from './ui/Dialog';

const VIEW_LABELS = { front: 'Frontal', left: 'Lateral Izq.', right: 'Lateral Der.', back: 'Espalda' };

export default function GalleryTab() {
  const dialog = useDialog();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(null);

  const handleDelete = async (id) => {
    if (!await dialog.confirm('¿Seguro que quieres eliminar esta foto?')) return;
    try {
      await reviewsApi.deleteImage(id);
      setImages(prev => prev.filter(i => i.id !== id));
      setZoom(null);
      dialog.toast('Foto eliminada', { variant: 'success' });
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      dialog.toast('Error al eliminar', { variant: 'error' });
    }
  };

  const groupedImages = images.reduce((acc, img) => {
    const dateStr = img.uploadedAt ? new Date(img.uploadedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sin fecha';
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(img);
    return acc;
  }, {});

  useEffect(() => {
    reviewsApi.gallery()
      .then((data) => setImages(data || []))
      .catch(() => setImages([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in">
      <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '20px' }}>Galería</h3>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Cargando fotos...</div>
      ) : images.length === 0 ? (
        <div className="glass-panel" style={{ padding: '50px 20px', textAlign: 'center', borderTop: '4px solid var(--accent-primary)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '12px' }}>📸</div>
          <h3 style={{ fontWeight: 800, marginBottom: '8px' }}>Aún no hay fotos</h3>
          <p style={{ color: 'var(--text-muted)' }}>Las fotos que subas en tus revisiones aparecerán aquí.</p>
        </div>
      ) : (
        <div>
          {Object.entries(groupedImages).sort((a, b) => {
            if (a[0] === 'Sin fecha') return 1;
            if (b[0] === 'Sin fecha') return -1;
            return b[1][0].uploadedAt.localeCompare(a[1][0].uploadedAt);
          }).map(([date, imgs]) => (
            <div key={date} style={{ marginBottom: '30px' }}>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '15px', borderBottom: '1px solid var(--border-light)', paddingBottom: '5px' }}>{date}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                {imgs.map((img) => (
                  <div key={img.id} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setZoom(img)}>
                    <AuthImage imageId={img.id} alt={img.view || 'foto'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', color: '#fff', fontSize: '0.75rem', padding: '12px 8px 6px', textAlign: 'center' }}>
                      {VIEW_LABELS[img.view] || img.view || 'Foto'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {zoom && createPortal(
        <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 4000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }} onClick={() => setZoom(null)}>
          <button onClick={() => setZoom(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#ff4500', fontSize: '2rem', cursor: 'pointer' }}>✕</button>
          <AuthImage imageId={zoom.id} alt="foto" style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: '12px' }} />
          <div style={{ marginTop: '16px', color: 'var(--text-muted)' }}>
            {VIEW_LABELS[zoom.view] || zoom.view || ''} {zoom.uploadedAt && `· ${new Date(zoom.uploadedAt).toLocaleDateString('es-ES')}`}
          </div>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(zoom.id); }} style={{ marginTop: '20px', padding: '10px 20px', background: '#ff4500', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>🗑️ Eliminar Imagen</button>
        </div>,
        document.body
      )}
    </div>
  );
}
