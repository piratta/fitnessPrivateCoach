import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MOCK_CLIENTS } from '../utils/mockClients';
import '../index.css';

export default function ReviewManager({ clients, setClients }) {
  const [selectedClientForReview, setSelectedClientForReview] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [timeScale, setTimeScale] = useState('Meses');
  const [toggledPhotos, setToggledPhotos] = useState({ front: false, left: false, right: false, back: false });
  const [largePhotoView, setLargePhotoView] = useState(null);

  // New feedback and annotation states
  const [globalFeedback, setGlobalFeedback] = useState('');
  const [photoComments, setPhotoComments] = useState({ front: '', left: '', right: '', back: '' });
  const [drawings, setDrawings] = useState({ front: null, left: null, right: null, back: null });
  
  const canvasRef = React.useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // New shape tools state
  const [drawTool, setDrawTool] = useState('free'); // 'free', 'circle', 'arrow', 'move'
  const [drawColor, setDrawColor] = useState('#ff0000');
  
  // Vector graphics engine states
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [backgroundImg, setBackgroundImg] = useState(null);

  React.useEffect(() => {
    if (editMode && canvasRef.current) {
      setElements([]); 
      if (drawings[largePhotoView]) {
        const img = new Image();
        img.onload = () => {
          setBackgroundImg(img);
          redrawCanvas([], null, img);
        };
        img.src = drawings[largePhotoView];
      } else {
        setBackgroundImg(null);
        redrawCanvas([], null, null);
      }
    }
  }, [editMode, largePhotoView]);

  const redrawCanvas = (elems = elements, selId = selectedElementId, bg = backgroundImg) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (bg) {
      ctx.drawImage(bg, 0, 0);
    }

    elems.forEach(el => {
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      
      if (el.type === 'free') {
        if (el.points.length > 0) {
          ctx.moveTo(el.points[0].x, el.points[0].y);
          el.points.forEach(p => ctx.lineTo(p.x, p.y));
        }
      } else if (el.type === 'circle') {
        const radiusX = Math.abs(el.endX - el.startX) / 2;
        const radiusY = Math.abs(el.endY - el.startY) / 2;
        const centerX = el.startX + (el.endX - el.startX) / 2;
        const centerY = el.startY + (el.endY - el.startY) / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      } else if (el.type === 'line') {
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
      } else if (el.type === 'arrow') {
        const headlen = 15;
        const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
        ctx.moveTo(el.startX, el.startY);
        ctx.lineTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headlen * Math.cos(angle - Math.PI / 6), el.endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(el.endX, el.endY);
        ctx.lineTo(el.endX - headlen * Math.cos(angle + Math.PI / 6), el.endY - headlen * Math.sin(angle + Math.PI / 6));
      }
      ctx.stroke();

      // Highlight selected
      if (el.id === selId) {
        ctx.save();
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        let minX, minY, maxX, maxY;
        if (el.type === 'free') {
          minX = Math.min(...el.points.map(p => p.x));
          maxX = Math.max(...el.points.map(p => p.x));
          minY = Math.min(...el.points.map(p => p.y));
          maxY = Math.max(...el.points.map(p => p.y));
        } else {
          minX = Math.min(el.startX, el.endX);
          maxX = Math.max(el.startX, el.endX);
          minY = Math.min(el.startY, el.endY);
          maxY = Math.max(el.startY, el.endY);
        }
        ctx.strokeRect(minX - 5, minY - 5, (maxX - minX) + 10, (maxY - minY) + 10);
        ctx.restore();
      }
    });
  };

  const getHitElement = (x, y) => {
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      let minX, minY, maxX, maxY;
      if (el.type === 'free') {
        minX = Math.min(...el.points.map(p => p.x));
        maxX = Math.max(...el.points.map(p => p.x));
        minY = Math.min(...el.points.map(p => p.y));
        maxY = Math.max(...el.points.map(p => p.y));
      } else {
        minX = Math.min(el.startX, el.endX);
        maxX = Math.max(el.startX, el.endX);
        minY = Math.min(el.startY, el.endY);
        maxY = Math.max(el.startY, el.endY);
      }
      const padding = 10;
      if (x >= minX - padding && x <= maxX + padding && y >= minY - padding && y <= maxY + padding) {
        return el.id;
      }
    }
    return null;
  };

  const startDrawing = (e) => {
    if (!editMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    setStartPos({ x, y });
    setIsDrawing(true);

    if (drawTool === 'move') {
      const hitId = getHitElement(x, y);
      setSelectedElementId(hitId);
      redrawCanvas(elements, hitId);
    } else {
      setSelectedElementId(null);
      const newEl = {
        id: Date.now(),
        type: drawTool,
        color: drawColor,
        startX: x, startY: y,
        endX: x, endY: y,
        points: [{x, y}]
      };
      const newElements = [...elements, newEl];
      setElements(newElements);
      redrawCanvas(newElements, null);
    }
  };

  const draw = (e) => {
    if (!isDrawing || !editMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (drawTool === 'move') {
      if (selectedElementId) {
        const dx = x - startPos.x;
        const dy = y - startPos.y;
        setStartPos({x, y});
        
        const newElements = elements.map(el => {
          if (el.id === selectedElementId) {
            if (el.type === 'free') {
              return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
            } else {
              return { ...el, startX: el.startX + dx, startY: el.startY + dy, endX: el.endX + dx, endY: el.endY + dy };
            }
          }
          return el;
        });
        setElements(newElements);
        redrawCanvas(newElements, selectedElementId);
      }
    } else {
      const newElements = [...elements];
      const currentEl = newElements[newElements.length - 1];
      if (drawTool === 'free') {
        currentEl.points.push({x, y});
      } else {
        currentEl.endX = x;
        currentEl.endY = y;
      }
      setElements(newElements);
      redrawCanvas(newElements, null);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const undoDrawing = () => {
    setElements(prev => {
      const newEls = prev.slice(0, -1);
      redrawCanvas(newEls, null);
      return newEls;
    });
  };

  const saveDrawingOverlay = () => {
    if (canvasRef.current) {
      redrawCanvas(elements, null);
      setDrawings(prev => ({ ...prev, [largePhotoView]: canvasRef.current.toDataURL('image/png') }));
      setEditMode(false);
    }
  };

  const pendingReviews = clients.filter(c => c.nextReview === 'Pendiente' || c.nextReview === 'Hoy');
  const upcomingReviews = clients.filter(c => c.nextReview !== 'Pendiente' && c.nextReview !== 'Hoy');

  return (
    <div className="glass-panel" style={{ padding: '30px' }}>
      <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
        Gestor de Evaluaciones
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Pendientes */}
        <div style={{ background: 'rgba(255, 69, 0, 0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 69, 0, 0.2)' }}>
          <h4 style={{ color: '#ff4500', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⚠️ Revisiones Pendientes Urgentes
          </h4>
          {pendingReviews.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay revisiones pendientes. ¡Buen trabajo!</p>
          ) : (
            pendingReviews.map(client => (
              <div key={client.id} style={{ background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold' }}>{client.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Meta: {client.goal} | Adherencia: {client.adherenceHistory[client.adherenceHistory.length-1]}%</p>
                </div>
                <button 
                  className="btn-primary" 
                  style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}
                  onClick={() => {
                    setSelectedClientForReview(client);
                    const len = client.weightHistory.length;
                    setSelectedMonths([Math.max(0, len - 1)]);
                    setToggledPhotos({ front: false, left: false, right: false, back: false });
                    setGlobalFeedback('');
                    setPhotoComments({ front: '', left: '', right: '', back: '' });
                    setDrawings({ front: null, left: null, right: null, back: null });
                    setEditMode(false);
                    if (client.reviewFrequency?.toLowerCase().includes('semana')) {
                      setTimeScale('Semanas');
                    } else {
                      setTimeScale('Meses');
                    }
                  }}
                >
                  Evaluar Ahora
                </button>
              </div>
            ))
          )}
        </div>

        {/* Próximas */}
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
          <h4 style={{ color: 'var(--text-main)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📅 Próximas Revisiones
          </h4>
          {upcomingReviews.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay próximas revisiones agendadas.</p>
          ) : (
            upcomingReviews.map(client => (
              <div key={client.id} style={{ background: 'rgba(0,0,0,0.5)', padding: '15px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 'bold' }}>{client.name}</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Fecha programada: {client.nextReview}</p>
                </div>
                <button 
                  onClick={() => {
                    setSelectedClientForReview(client);
                    const len = client.weightHistory.length;
                    setSelectedMonths(len >= 2 ? [len - 2, len - 1] : [0, Math.max(0, len - 1)]);
                    setToggledPhotos({ front: false, left: false, right: false, back: false });
                    setGlobalFeedback('');
                    setPhotoComments({ front: '', left: '', right: '', back: '' });
                    setDrawings({ front: null, left: null, right: null, back: null });
                    setEditMode(false);
                    if (client.reviewFrequency?.toLowerCase().includes('semana')) {
                      setTimeScale('Semanas');
                    } else {
                      setTimeScale('Meses');
                    }
                  }}
                  style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  Ver Progreso
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedClientForReview && createPortal(
        <div className="fade-in" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '800px', background: 'rgba(20, 20, 24, 0.98)', padding: '30px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ fontSize: '1.5rem', color: 'var(--accent-primary)' }}>Evaluar Revisión: {selectedClientForReview.name}</h3>
                <p style={{ color: 'var(--text-muted)' }}>Analiza los datos biométricos antes de ajustar su rutina.</p>
              </div>
              <button onClick={() => setSelectedClientForReview(null)} style={{ background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-light)', marginBottom: '20px' }}>
              <h4 style={{ color: 'var(--accent-primary)', marginBottom: '15px' }}>
                {selectedClientForReview.pendingReviewData ? '📋 Datos Enviados por el Cliente' : (selectedClientForReview.lastCompletedReview ? '📋 Última Revisión Completada' : '📋 Sin Datos de Revisión Previos')}
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
                {['front', 'left', 'right', 'back'].map(view => {
                  const labels = { front: 'Frontal', left: 'Lateral Izq.', right: 'Lateral Der.', back: 'Espalda' };
                  const isToggled = toggledPhotos[view];
                  const reviewData = selectedClientForReview.pendingReviewData || selectedClientForReview.lastCompletedReview || {};
                  const photoUrl = isToggled ? reviewData.pastPhotos?.[view] : reviewData.photos?.[view];
                    
                  return (
                    <div key={view} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div 
                        onClick={() => setLargePhotoView(view)}
                        style={{
                          aspectRatio: '3/4',
                          background: photoUrl ? `url(${photoUrl}) center/cover` : 'rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: isToggled ? '2px solid #ffaa00' : '2px solid transparent',
                          transition: 'all 0.3s'
                        }}
                      >
                        {!photoUrl && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.2)'}}>Sin Foto</div>}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {labels[view]} {isToggled ? '(Anterior)' : '(Actual)'}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                  <h5 style={{ marginBottom: '10px' }}>Comentarios de la revisión:</h5>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '6px', fontSize: '0.9rem', fontStyle: 'italic', minHeight: '80px' }}>
                    {(selectedClientForReview.pendingReviewData || selectedClientForReview.lastCompletedReview) 
                      ? `"${(selectedClientForReview.pendingReviewData || selectedClientForReview.lastCompletedReview).comments || (selectedClientForReview.pendingReviewData || selectedClientForReview.lastCompletedReview).globalFeedback || 'Sin comentarios.'}"` 
                      : "El cliente aún no ha enviado comentarios de revisión."}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <label style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Comparativa de progreso:</label>
                  <select 
                    className="input-field" 
                    style={{ margin: 0, padding: '5px 10px', width: 'auto' }}
                    value={timeScale}
                    onChange={(e) => setTimeScale(e.target.value)}
                  >
                    <option value="Semanas">Por Semanas</option>
                    <option value="Meses">Por Meses</option>
                  </select>
                </div>
                {selectedMonths.length < 4 && (
                  <button 
                    onClick={() => {
                      const maxIdx = selectedClientForReview.weightHistory.length - 1;
                      setSelectedMonths([...selectedMonths, maxIdx]);
                    }}
                    style={{ background: 'rgba(224, 248, 0, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    + Añadir Revisión
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                {selectedMonths.map((monthIdx, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <select 
                      className="input-field" 
                      style={{ width: '150px', marginBottom: 0 }}
                      value={monthIdx}
                      onChange={(e) => {
                        const newMonths = [...selectedMonths];
                        newMonths[i] = parseInt(e.target.value);
                        setSelectedMonths(newMonths);
                      }}
                    >
                      {selectedClientForReview.weightHistory.map((_, idx) => (
                        <option key={idx} value={idx}>{timeScale.slice(0, -1)} {idx + 1}</option>
                      ))}
                    </select>
                    {selectedMonths.length > 2 && (
                      <button 
                        onClick={() => setSelectedMonths(selectedMonths.filter((_, filterIdx) => filterIdx !== i))}
                        style={{ background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', fontSize: '1.2rem' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <tr>
                    <th style={{ padding: '15px', textAlign: 'left' }}>Métrica</th>
                    {selectedMonths.map((m, i) => (
                      <React.Fragment key={i}>
                        <th style={{ padding: '15px', color: (i === selectedMonths.length - 1 && !selectedClientForReview.pendingReviewData) ? 'var(--accent-primary)' : 'inherit' }}>
                          {timeScale.slice(0, -1)} {m + 1}
                        </th>
                        {(i < selectedMonths.length - 1 || selectedClientForReview.pendingReviewData) && (
                          <th style={{ padding: '15px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dif.</th>
                        )}
                      </React.Fragment>
                    ))}
                    {selectedClientForReview.pendingReviewData && (
                      <th style={{ padding: '15px', color: 'var(--accent-primary)' }}>ACTUAL</th>
                    )}
                  </tr>
                </thead>
              <tbody>
                {[
                  { label: 'Peso Corporal', pendingKey: 'weight', data: selectedClientForReview.weightHistory, unit: 'kg', lowerIsBetter: selectedClientForReview.goal === 'Pérdida de Grasa' },
                  { label: 'Cintura', pendingKey: 'waist', data: selectedClientForReview.waistHistory, unit: 'cm', lowerIsBetter: true },
                  { label: 'Cadera', pendingKey: 'cadera', data: selectedClientForReview.caderaHistory, unit: 'cm', lowerIsBetter: true },
                  { label: 'Bíceps', pendingKey: 'biceps', data: selectedClientForReview.bicepsHistory, unit: 'cm', lowerIsBetter: false },
                  { label: 'Pierna', pendingKey: 'pierna', data: selectedClientForReview.piernaHistory, unit: 'cm', lowerIsBetter: false },
                ].map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '15px', textAlign: 'left', fontWeight: 'bold' }}>{row.label}</td>
                    {selectedMonths.map((m, i) => {
                      const val = row.data[m] !== undefined ? row.data[m] : '-';
                      let diffEl = null;
                      
                      let nextVal;
                      if (i < selectedMonths.length - 1) {
                         nextVal = row.data[selectedMonths[i + 1]];
                      } else if (selectedClientForReview.pendingReviewData) {
                         nextVal = selectedClientForReview.pendingReviewData[row.pendingKey];
                      }

                      if (nextVal !== undefined && val !== '-') {
                        const diff = nextVal - val;
                        const diffAbs = Math.abs(diff).toFixed(1);
                        let isGood = row.lowerIsBetter ? diff < 0 : diff > 0;
                        if (diff === 0) isGood = null;
                        
                        diffEl = (
                          <td key={`diff-${i}`} style={{ padding: '15px', fontWeight: 'bold', fontSize: '0.85rem', color: diff === 0 ? 'var(--text-muted)' : (isGood ? '#00e676' : '#ff1744') }}>
                            {diff > 0 ? '▲' : diff < 0 ? '▼' : '-'} {diff === 0 ? '=' : `${diffAbs}`}
                          </td>
                        );
                      } else if (i < selectedMonths.length - 1 || selectedClientForReview.pendingReviewData) {
                        diffEl = <td key={`diff-${i}`} style={{ padding: '15px' }}>-</td>;
                      }

                      const isLast = i === selectedMonths.length - 1 && !selectedClientForReview.pendingReviewData;
                      
                      return (
                        <React.Fragment key={`val-${i}`}>
                          <td style={{ padding: '15px', color: isLast ? 'var(--accent-primary)' : 'inherit', fontWeight: isLast ? 'bold' : 'normal' }}>
                            {val}{val !== '-' && row.unit}
                          </td>
                          {diffEl}
                        </React.Fragment>
                      );
                    })}
                    {selectedClientForReview.pendingReviewData && (
                      <td style={{ padding: '15px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        {selectedClientForReview.pendingReviewData[row.pendingKey]}{selectedClientForReview.pendingReviewData[row.pendingKey] !== undefined && row.unit}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              </table>
            </div>

            {selectedClientForReview && (
              <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
                  <h4 style={{ marginBottom: '10px' }}>💬 Comentario Global para el Cliente</h4>
                  <textarea 
                    className="input-field" 
                    style={{ width: '100%', minHeight: '100px', resize: 'vertical', marginBottom: '15px' }} 
                    placeholder="Ej: Has hecho un progreso excelente este mes. Sigue así con la adherencia..."
                    value={globalFeedback}
                    onChange={e => setGlobalFeedback(e.target.value)}
                  ></textarea>

                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginTop: '10px' }}
                    onClick={() => {
                      const reviewDataToSave = {
                        ...(selectedClientForReview.pendingReviewData || selectedClientForReview.lastCompletedReview || {}),
                        drawings,
                        photoComments,
                        globalFeedback,
                        reviewDate: new Date().toLocaleDateString()
                      };

                      // Update local state for CoachDashboard
                      setClients(prev => prev.map(c => {
                        if (c.id === selectedClientForReview.id) {
                          const history = c.reviewHistory || [];
                          if (c.lastCompletedReview) history.push(c.lastCompletedReview);
                          return {
                            ...c,
                            nextReview: '15/08/2026',
                            pendingReviewData: null,
                            lastCompletedReview: reviewDataToSave,
                            reviewHistory: history
                          };
                        }
                        return c;
                      }));

                      // Mutate MOCK_CLIENTS so ClientDashboard can see it in this session
                      const mockIdx = MOCK_CLIENTS.findIndex(c => c.id === selectedClientForReview.id);
                      if (mockIdx !== -1) {
                        const clientObj = MOCK_CLIENTS[mockIdx];
                        if (!clientObj.reviewHistory) clientObj.reviewHistory = [];
                        if (clientObj.lastCompletedReview) clientObj.reviewHistory.push(clientObj.lastCompletedReview);
                        clientObj.nextReview = '15/08/2026';
                        clientObj.pendingReviewData = null;
                        clientObj.lastCompletedReview = reviewDataToSave;
                      }

                      alert(`Evaluación de ${selectedClientForReview.name} enviada con éxito.`);
                      setSelectedClientForReview(null);
                    }}
                  >
                    Enviar Evaluación ({selectedClientForReview.reviewFrequency || 'Semanal'})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Large Photo Modal */}
      {largePhotoView && selectedClientForReview && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['front', 'left', 'right', 'back'].map(view => {
              const labels = { front: 'Frontal', left: 'Lateral Izq.', right: 'Lateral Der.', back: 'Espalda' };
              return (
                <button
                  key={view}
                  onClick={() => setLargePhotoView(view)}
                  style={{
                    background: largePhotoView === view ? 'var(--accent-primary)' : 'transparent',
                    color: largePhotoView === view ? '#000' : '#fff',
                    border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  {labels[view]}
                </button>
              )
            })}
            <button onClick={() => { setLargePhotoView(null); setEditMode(false); }} style={{ background: 'transparent', color: '#ff4500', border: 'none', padding: '10px', cursor: 'pointer', fontSize: '1.2rem', marginLeft: '20px', fontWeight: 'bold' }}>✕ Cerrar</button>
          </div>

          <div style={{ flex: 1, width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {(() => {
              const reviewData = selectedClientForReview.pendingReviewData || selectedClientForReview.lastCompletedReview || {};
              const isToggled = toggledPhotos[largePhotoView];
              const photoUrl = isToggled 
                ? reviewData.pastPhotos?.[largePhotoView] 
                : reviewData.photos?.[largePhotoView];
              
              return (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                    <div style={{ color: isToggled ? '#ffaa00' : 'var(--text-main)', fontWeight: 'bold' }}>
                      {isToggled ? '📸 REVISIÓN ANTERIOR' : '📸 ACTUAL'}
                    </div>
                    {!isToggled && !editMode && (
                      <button 
                        onClick={() => setEditMode(true)}
                        style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', padding: '5px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        ✏️ Editar / Marcar
                      </button>
                    )}
                  </div>
                  
                  {editMode && (
                    <div className="fade-in" style={{ display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                      <button onClick={() => { setDrawTool('move'); setSelectedElementId(null); redrawCanvas(elements, null); }} style={{ background: 'transparent', color: '#fff', border: drawTool === 'move' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>🖐️ Mover</button>
                      <button onClick={() => setDrawTool('free')} style={{ background: 'transparent', color: '#fff', border: drawTool === 'free' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>✏️ Libre</button>
                      <button onClick={() => setDrawTool('line')} style={{ background: 'transparent', color: '#fff', border: drawTool === 'line' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>➖ Línea</button>
                      <button onClick={() => setDrawTool('circle')} style={{ background: 'transparent', color: '#fff', border: drawTool === 'circle' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>⭕ Círculo</button>
                      <button onClick={() => setDrawTool('arrow')} style={{ background: 'transparent', color: '#fff', border: drawTool === 'arrow' ? '2px solid var(--accent-primary)' : '1px solid var(--border-light)', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>↗️ Flecha</button>
                      <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                        {['#ff0000', '#00bfff', '#ffea00', '#00e676'].map(c => (
                          <div 
                            key={c}
                            onClick={() => setDrawColor(c)}
                            style={{
                              width: '24px', height: '24px', borderRadius: '4px', background: c, cursor: 'pointer',
                              border: drawColor === c ? '2px solid #fff' : '2px solid transparent',
                              boxShadow: drawColor === c ? `0 0 8px ${c}` : 'none'
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ flex: 1 }} />
                      <button onClick={undoDrawing} disabled={elements.length === 0} style={{ background: 'transparent', color: elements.length > 0 ? '#ffaa00' : 'rgba(255,255,255,0.3)', border: '1px solid', borderColor: elements.length > 0 ? '#ffaa00' : 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '6px', cursor: elements.length > 0 ? 'pointer' : 'default' }}>↩️ Deshacer</button>
                      <button onClick={() => setEditMode(false)} style={{ background: 'transparent', color: '#ff4500', border: '1px solid #ff4500', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer' }}>Cancelar</button>
                      <button onClick={saveDrawingOverlay} style={{ background: 'var(--accent-primary)', color: '#000', border: 'none', padding: '5px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Guardar</button>
                    </div>
                  )}
                  
                  <div style={{ position: 'relative', width: '100%', height: '65vh' }}>
                    <div 
                      onClick={() => !editMode && setToggledPhotos(prev => ({ ...prev, [largePhotoView]: !prev[largePhotoView] }))}
                      style={{
                        width: '100%', height: '100%',
                        background: photoUrl ? `url(${photoUrl}) center/contain no-repeat` : 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        cursor: editMode ? 'crosshair' : 'pointer',
                        border: isToggled ? '3px solid #ffaa00' : '3px solid transparent',
                        transition: 'all 0.3s'
                      }}
                    >
                      {!isToggled && (
                        <canvas
                          ref={canvasRef}
                          width={600}
                          height={800}
                          style={{
                            width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 10,
                            pointerEvents: editMode ? 'auto' : 'none',
                            background: drawings[largePhotoView] && !editMode ? `url(${drawings[largePhotoView]}) center/contain no-repeat` : 'transparent'
                          }}
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                        />
                      )}
                    </div>
                  </div>
                  
                  {!isToggled && (
                    <div style={{ width: '100%', marginTop: '15px' }}>
                      <input 
                        type="text" 
                        placeholder="Añadir comentario específico a esta foto (ej. 'Fíjate en la postura de la espalda baja...')"
                        className="input-field"
                        style={{ width: '100%', margin: 0 }}
                        value={photoComments[largePhotoView] || ''}
                        onChange={(e) => setPhotoComments(prev => ({ ...prev, [largePhotoView]: e.target.value }))}
                      />
                    </div>
                  )}
                  
                  {!editMode && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>(Haz clic en la imagen para alternar con la anterior)</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>, document.body
      )}
    </div>
  );
}
