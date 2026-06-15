import { useState, useRef, useEffect } from 'react';
import '../index.css';

const MOCK_EXERCISES = [
  'Press banca plano con mancuerna',
  'Contractor (peck deck)',
  'Aperturas en polea media sentado',
  'Elevación lateral unilateral en banco inclinado',
  'Extensión tríceps katana en banco scott invertido',
  'Extensión tríceps polea alta',
  'Plancha abdominal',
  'Remo dorian',
  'Jalón al pecho unilateral',
  'Dominadas',
  'Remo gironda unilateral',
  'Pájaro posterior unilateral en polea media (muñequera)',
  'Curl bíceps bayesian',
  'Curl bíceps mancuerna unilateral',
  'BELT SQ / globet sq',
  'Extensión de cuádriceps unilateral',
  'Prensa horizontal',
  'Aductor en máquina',
  'Sentadilla búlgara',
  'Curl femoral tumbado unilateral',
  'Press banca declinado',
  'Cruces de polea',
  'Egyptian lateral raises (polea)',
  'Press militar en máquina unilateral',
  'Press francés',
  'Flexiones de diamante',
  'Plancha lateral',
  'Pull over',
  'Remo alto en máquina',
  'Seal row',
  'Curl bíceps barra en polea alta',
  'Curl bíceps barra romana'
];

export default function SearchableExerciseSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  const filtered = MOCK_EXERCISES.filter(ex => ex.toLowerCase().includes(search.toLowerCase()));

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className="input-field"
        style={{ marginBottom: 0, cursor: 'text' }}
        placeholder="Buscar ejercicio..."
        value={isOpen ? search : value}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch('');
        }}
      />
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-light)',
          borderRadius: '8px',
          marginTop: '4px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 10
        }}>
          {filtered.length > 0 ? filtered.map((ex, i) => (
            <div 
              key={i}
              onClick={() => {
                onChange(ex);
                setIsOpen(false);
              }}
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(224, 248, 0, 0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {ex}
            </div>
          )) : (
            <div style={{ padding: '10px 15px', color: 'var(--text-muted)' }}>No se encontraron ejercicios</div>
          )}
        </div>
      )}
    </div>
  );
}
