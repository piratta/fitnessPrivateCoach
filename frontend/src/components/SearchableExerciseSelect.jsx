import { useState, useRef, useEffect } from 'react';
import '../index.css';

// Master exercise catalogue. Kept as a flat string array — duplicates are filtered at runtime
// and the list is sorted alphabetically for easier scanning. New exercises go to the bottom of
// the source list to preserve git diffs, the UI sorts on render.
const RAW_EXERCISES = [
  // Powerlifting básicos
  'Sentadilla barra baja',
  'Sentadilla barra baja (2º Protocolo)',
  'Sentadilla barra alta',
  'Sentadilla barra alta (2º Protocolo)',
  'Peso muerto convencional',
  'Peso muerto convencional (2º Protocolo)',
  'Peso muerto sumo',
  'Peso muerto sumo (2º protocolo)',
  'Press militar con barra',
  'Press de banca 2ct',
  'Jalón al pecho',
  'Remo dorian',
  'Curl de biceps alterno con mancuernas',
  'Press francés',
  'Crunch abdominal en polea alta',

  // Variantes de peso muerto
  'Peso muerto sumo 2ct',
  'Peso muerto convencional 2ct',
  'Hack deadlift',
  'Peso muerto sumo déficit 2 cm',
  'Peso muerto sumo déficit 4 cm',
  'Peso muerto convencional déficit 2 cm',
  'Peso muerto convencional 4cm',
  'Sentadilla barra baja 2ct pausa en hoyo',
  'Sentadilla barra alta 2ct pausa en hoyo',
  'Sentadilla barra alta beltless',
  'Sentadilla barra baja beltless',
  'Peso muerto convencional beltless',
  'Peso muerto sumo beltless',
  'Peso muero barra hexagonal',
  'Peso muerto sumo tempo 006',
  'Peso muerto sumo tempo 004',
  'Peso muerto sumo tempo 400',
  'Peso muerto sumo tempo 600',
  'Peso muerto sumo tempo 404',
  'Peso muerto sumo tempo 303',
  'Peso muerto sumo tempo 202',
  'Peso muerto convencional 006',
  'Peso muerto convencional 004',
  'Peso muerto convencional 600',
  'Peso muerto convencional 400',
  'Peso muerto convencional 404',
  'Peso muerto convencional 303',
  'Peso muerto convencional 202',
  'Peso muerto convencional piernas rígidas (SLDL)',
  'Peso muerto rumano (RDL)',
  'Peso muerto sumo floating',
  'Peso muerto convencional floating',
  'Peso muerto sumo déficit floating 4cm',
  'Peso muerto convencional floating 4cm',
  'Bird dog',

  // Variantes de sentadilla
  'Sentadilla barra baja tempo 600',
  'Sentadilla barra alta tempo 600',
  'Sentadilla barra baja tempo 400',
  'Sentadilla barra alta tempo 400',
  'Sentadilla barra baja doble pausa (mitad de excéntrica y abajo)',
  'Sentadilla barra alta doble pausa (mitad de excéntrica y abajo)',
  'Sentadilla barra baja doble pausa (abajo y mitad de subida)',
  'Sentadilla barra alta doble pausa (abajo y mitad de subida)',
  'Sentadilla barra baja doble pausa (mitad de excéntrica y mitad de concéntrica)',
  'Sentadilla barra alta doble pausa (mitad de excéntrica y mitad de concéntrica)',
  'Sentadilla barra baja 2ct pausa en mitad de bajada',
  'Sentadilla barra alta 2ct pausa en mitad de bajada',
  'Sentadilla barra baja 2ct pausa en mitad de subida',
  'Sentadilla barra alta 2ct pausa en mitad de subida',
  'Sentadilla barra baja tempo 404',
  'Sentadilla barra alta tempo 404',
  'Sentadilla barra baja tempo 202',
  'Sentadilla barra alta tempo 202',
  'Sentadilla barra baja 5ct pausa',
  'Sentadilla barra alta 5ct pausa',
  'Sentadilla barra baja 4ct pausa',
  'Sentadilla barra alta 4ct pausa',
  'Sentadilla barra baja 3ct pausa',
  'Sentadilla barra alta 3ct pausa',
  'Sentadilla barra baja 2ct pausa',
  'Sentadilla barra alta 2ct pausa',
  'Sentadilla platz (2cm drop)',

  // Bloques / band reverse / safety
  'Peso muerto sumo desde bloques de 4cm',
  'Peso muerto sumo desde bloques de 2cm',
  'Peso muerto convencional desde bloques de 4cm',
  'Peso muerto convencional desde bloques de 2cm',
  'Peso muerto convencional band reverse',
  'Peso muerto sumo band reverse',
  'Sentadilla barra alta band reverse',
  'Sentadilla barra baja band reverse',
  'Sentadilla con barra safety',
  'Peso muerto convencional déficit 4cm + 2ct pausa',
  'Peso muerto sumo déficit 4cm + 2ct pausa',
  'Peso muerto convencional déficit 2cm + 2ct pausa',
  'Peso muerto sumo déficit 2cm + 2ct pausa',
  'Peso muerto convencional snatch',
  'Peso muerto candito',
  'Peso muerto convencional snatch 2ct pausa',
  'Peso muerto convencional snatch + déficit 4cm + 2ct pausa',
  'Peso muerto candito 2ct pausa',
  'Peso muerto candito tempo 303',
  'Peso muerto semi sumo',
  'Peso muerto semi sumo 2ct pausa',
  'Peso muerto semi sumo déficit 4cm',
  'Peso muerto semi sumo déficit 4cm + 2 ct pausa',
  'Peso muerto semi sumo tempo 303',
  'Peso muerto semi sumo tempo 404',
  'Peso muerto semi sumo tempo 004',
  'Peso muerto semi sumo tempo 006',
  'Sentadilla frontal',
  'Peso muerto convencional (drop 2 cm)',
  'Sentadilla búlgara',

  // Press banca y variantes
  'Press banca',
  'Press banca inclinado',
  'Press banca declinado',
  'Press banca 3ct',
  'Press banca 4ct',
  'Press banca 5ct',
  'Press banca 6ct',
  'Press banca inclinado 2ct',
  'Press banca inclinado 3ct',
  'Press banca inclinado 4ct',
  'Press banca inclinado 5 ct',
  'Press banca plano con mancuerna',
  'Press banca inclinado con mancuerna',
  'Press banca inclinado neutro con mancuerna',
  'Press banca band reverse',
  'Press banca tempo 600',
  'Press banca tempo 500',
  'Press banca tempo 400',
  'Press banca tempo 300',
  'Press banca tempo 505',
  'Press banca tempo 404',
  'Press banca tempo 303',
  'Press banca tempo 202',
  'Press banca T&G',
  'Press banca spoto',
  'Press banca spoto 3ct pausa',
  'Press banca spoto 4ct pausa',
  'Press banca spoto 5ct pausa',
  'Press banca Larssen',
  'Press banca paralímpico',
  'Press banca agarre cerrado',
  'Press banca agarre medio',
  'Press banca agarre abierto',
  'Press banca con board',
  'Press banca con goma lastrando',
  'Peso muerto convencional con goma lastrando',
  'Peso muerto sumo con goma lastrando',
  'Press banca kodama',
  'Press banca floor press',
  'Press banca floor press con mancuerna',
  'Press banca feet up',
  'Press banca feet up agarre cerrado',
  'Press banca feet up 3ct',
  'Press banca feet up 3ct agarre cerrado',
  'Press banca (2º Protocolo)',
  'Press banca (3º protocolo)',
  'Press banca (4º protocolo)',
  'Press banca multipower',
  'Press banca inclinado multipower',
  'Press banca declinado multipower',
  'Press banca en máquina sentado',
  'Press banca en máquina tumbado',
  'Press banca en máquina inclinado',
  'Press banca en máquina declinado',
  'Press banca en puente de poleas',
  'Press banca en puente de poleas sentado',
  'Press banca en puente de poleas (muñequeras)',
  'Press banca en puente de poleas sentado (muñequeras)',

  // Sentadilla en máquinas / variantes adicionales
  'Sentadilla en safety machine',
  'Sentadilla en Jaca Hammer',
  'Sentadilla en Jaca',
  'Sentadilla libre',
  'Sentadilla con salto',
  'Sentadilla isométrica con apoyo en pared',
  'Sentadilla búlgara 2ct pausa abajo',
  'Sentadilla búlgara con goma lastrando',
  'Sentadilla búlgara en multipower',
  'Sentadilla búlgara con barra libre',
  'Sentadilla búlgara con kettelbell',

  // Prensas y cuádriceps
  'Prensa inclinada 45º',
  'Prensa horizontal',
  'Prensa inclinada 45º (unilateral)',
  'Prensa horizontal (unilateral)',
  'Prensa de placas',
  'Extensión de cuádriceps',
  'Extensión de cuádriceps unilateral',
  'Extensión de cuádriceps con pausa en contracción 3ct',
  'Extensión cuádriceps (suben 2 baja 1)',
  'Extensión cuádriceps con pausa en estiramiento y acortamiento 2ct',
  'Zancadas con mancuerna',
  'Zancadas cortas con mancuernas',
  'Zancadas estáticas con mancuerna',
  'Zancadas estáticas en multipower',
  'Zancadas estáticas con barra libre',
  'Zancadas (front feet up) estáticas',
  'Steps up',
  'Box up',
  'Saltos al cajón',
  'Globet SQ',
  'Globet SQ / front bar',
  'Globet SQ drop 2cm',

  // Glúteo / cadena posterior
  'Puente de glúteos',
  'Puente de glúteos unilateral',
  'Puente de glúteos con mancuerna',
  'Puente de glúteos con barra',
  'Puente de glúteos en máquina',
  'Hip trust con barra',
  'Hip trust con mancuerna',
  'Hip trust con máquina',
  'Curl slide',
  'Pull trougth',
  'Curl femoral tumbado',
  'Curl femoral tumbado unilateral',
  'Curl femoral sentado',
  'Curl femoral sentado unilateral',
  'Curl femoral de pie en polea baja',
  'Curl femoral de pie en máquina unilateral',
  'Kettelbell swing',
  'Farmers walks',
  'Buenos días con barra',
  'Buenos días con safety bar',
  'Buenos días en Jaca',
  'Patada de glúteo en polea baja',
  'Patada de glúteo en máquina',
  'Reverse hyper',
  'Hiperextensiones',
  'Superman',

  // Hombro
  'Press Militar con mancuerna',
  'Press Militar sentado con barra',
  'Press militar sentado con mancuerna',
  'Press militar en máquina',
  'Press militar en máquina unilateral',
  'Press militar con mancuerna unilateral',
  'Press militar con mancuerna unilateral (neutro)',
  'Push press',
  'Clean and Jerk',
  'Elevación lateral con mancuerna',
  'Elevación lateral en polea baja',
  'Elevación lateral con mancuerna unilateral',
  'Elevación lateral con polea baja unilateral',
  'Elevación lateral con polea baja unilateral (muñequera)',
  'Egyptian lateral raises (polea)',
  'Box SQ',
  'Zercher SQ',
  'Zercher box SQ',
  '6 ways',
  '4 ways',
  'Elevaciones laterales parciales (pesadas)',
  'Elevación lateral unilateral en banco inclinado',
  'Elevaciones frontales con mancuerna',
  'ELevaciones frontales con barra',
  'Pájaro con mancuerna',
  'Pájaro en máquina',
  'Pájaro con mancuernas (chest supported horizontal)',
  'Face pull',
  'Face pull to OHP',
  'Crossover en polea alta',
  'Peck deck inverso',
  'Remo al mentón',
  'Remo al mentón en polea baja (barra larga wide grip)',
  'Pájaro posterior unilateral en polea media (muñequera)',
  'Contractor (peck deck)',
  'Press unilateral sentado hammer',
  'Press inclinado life fitness',
  'Press inclinado unilateral máquina',
  'Cruces de polea',
  'Fondos de pecho',
  'Fondos de tríceps',
  'Fondos de tríceps lastrados',
  'Fondos de pecho lastrados',
  'Fondos 3ct pausa',
  'Flexiones',
  'Flexiones lastradas',
  'Flexiones con apoyo de manos sobre barra multipower',
  'Aperturas con mancuernas',
  'Aperturas en polea media sentado',
  'Aperturas en polea media sentado (muñequera)',

  // Espalda
  'Australian row',
  'Remo con mancuerna unilateral',
  'Jalón al pecho unilateral',
  'Jalón al pecho en máquina',
  'Jalón al pecho supino',
  'Dante row',
  'Remo gironda',
  'Remo gironda unilateral',
  'Remo iso low row unilateral',
  'Remo iso low row',
  'Seal row',
  'Remo mancuerna dead stop 2ct',
  'Remo pendlay',
  'Remo con barra',
  'Rack pull',
  'Rack pull multipower',
  'Belt SQ',
  'Remo horizontal unilateral',
  'Remo horizontal agarre prono',
  'Remo horizontal agarre neutro',
  'Remo horizontal agarre supino',
  'Dominadas',
  'Dominadas asistidas',
  'Caídas dominadas lastradas 6ct',
  'Prueba dominadas CNP mujeres',
  'Prueba dominadas CNP hombres',
  'Dominadas con pausa arriba 2ct',
  'Dominadas con doble pausa abajo y arriba',
  'Dominadas neutras',
  'Dominadas supinas',

  // Cardio / acondicionamiento
  'Burpess',
  'Zancadas con salto',
  'Unilateral kettelbell push press',
  'Thuster',
  'Crunch abdominal',
  'Rueda abdominal',
  'Elevaciones de piernas',
  'Plancha abdominal',
  'Plancha lateral',
  'Plancha lateral con tracción de goma',
  'Toes to bar',
  'knee up',
  'Dragon fly',
  'Plancha con cambio de apoyos',
  'Plancha de manos lastrada',

  // Bíceps
  'Curl bíceps mancuerna',
  'Curl bíceps barra',
  'Curl bíceps mancuerna unilateral',
  'Curl bíceps barra en polea baja',
  'Curl bíceps barra en polea alta',
  'Curl bíceps polea baja unilateral',
  'Curl bíceps bayesian unilateral',
  'Curl bíceps bayesian',
  'Curl bíceps agarre neutro en polea baja',
  'Curl bíceps con barra en pronación',
  'Curl araña',
  'Curl carcelero',
  'Curl 21',
  'Curl bíceps barra romana',
  'Curl scott con barra',
  'Curl scott en máquina',
  'Curl bíceps unilateral en banco scott',
  'Curl bíceps unilateral en máquina scott',
  'Curl bíceps en banco inclinado 50º alterno',
  'Curl bíceps en banco inclinado 50º bilateral',
  'Curl bíceps en banco inclinado 50º unilateral',
  'Curl bíceps estricto con barra',
  'Curl bíceps estricto con mancuerna',
  'Cruces de bíceps en polea',
  'Curl en polea con apoyo en banco scott',

  // Tríceps
  'Extensión tríceps polea alta',
  'Californian press',
  'Kazz press multipower',
  'Press francés mancuerna neutro',
  'Extensión tríceps unilateral polea alta (neutra)',
  'Extensión tríceps unilateral polea alta (muñequera)',
  'Flexiones de diamante',
  'Fondos en bancos paralelos',
  'Extensión tríceps katana unilateral',
  'Extensió tríceps katana bilateral',
  'Extensión tríceps katana unilateral en polea baja',
  'Extensión tríceps katana bilateral en cruces de polea (abajo)',
  'Patada de tríceps neutra en polea media (chest supported)',
  'Extensión tríceps katana en banco scott invertido',
  'Press francés (BW) en multipower',
  'Landmine press unilateral',
  'Rotation Landmine',
  'Lanzamientos de balón a pared con rotación / posición de caballero',
  'Saltos de comba',
  'Sombra',
  'Power clean',
  'Snatch',
  'Medium start clean',
  'Front SQ',
  'Flexiones con rodillas',
  'Remo con trx',
  'Remo unilateral en movimiento de pies',
  'Plancha abdominal sin 2 apoyos',
  'Russian sit down w/kettelbell',
  'Zancada con salto',
  'Skipping',
  'Jumping Jaks',
  'Sprint 100m',
  'Sprint 200m',
  'Carrera 1000m',
  'Carrera 500m',
  'Carrera 750 m',
  'Series de carrera: Alternar intensidades',
  'Equilibrio unilateral',
  'Equilibrio unilateral con apoyo frontal más salto pies juntos',
  '90º SQ con salto explosivo',
  'Remo con mancuerna en un solo apoyo de piernas',
  'Abductor en máquina',
  'Aductor en máquina',
  'Remo alto en máquina',
  'Belt SQ con pausa 2ct abajo',
  'RDL en belt SQ',
  'Oscilatory SQ',
  'Prueba de agilidad CNP',
  'Dominadas prueba CNP',
  'Flexiones prueba GC',
  'Prueba carrera CNP',
  'Cuerda bomberos',
  'Natación: 50 m croll',
  'Natación: 100 m croll',
  'Natación: 50 m espalda',
  'Natación: 100 m espalda',
  'Natación: 200 m croll',
  'Natación: 500 m croll',
  'Natación: 25 m croll',
  'Kipping en pista de atletismo',
  'Remo en posición lateral (polea media o goma)',
  'Sentadilla Multipower',
  'Sentadilla frontal en multipower',
  'Platz SQ en multipower',
  'Front feet up SQ en multipower',
];

// Dedup case-insensitively while preserving the first occurrence, then sort alphabetically.
const MOCK_EXERCISES = (() => {
  const seen = new Set();
  const unique = [];
  for (const ex of RAW_EXERCISES) {
    const key = ex.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(ex);
    }
  }
  return unique.sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
})();

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
