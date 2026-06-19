import { useState, useEffect, useRef, useCallback } from 'react';
import { useDialog } from '../components/ui/Dialog';
import { API_BASE_URL } from '../config';

const DAYS_OF_WEEK = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const parseRoutineJson = (routineSource) => {
  const emptyRoutine = {
    Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
  };
  const emptyNotes = {
    Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
  };
  
  if (!routineSource) {
    return { exercises: emptyRoutine, notes: emptyNotes };
  }
  
  try {
    const parsed = typeof routineSource === 'string' ? JSON.parse(routineSource) : routineSource;
    const exercises = {};
    const notes = {};
    DAYS_OF_WEEK.forEach(day => {
      exercises[day] = Array.isArray(parsed[day]) ? parsed[day] : [];
      notes[day] = parsed[`${day}_notes`] || '';
    });
    return { exercises, notes };
  } catch (e) {
    console.error("Error parsing routineJson", e);
    return { exercises: emptyRoutine, notes: emptyNotes };
  }
};

export function useWorkoutBuilder({ clients, templates, isTemplateMode, editingTemplate, initialClient, setClients, setTemplates, setActiveTab }) {
  const dialog = useDialog();
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateTitle, setTemplateTitle] = useState(editingTemplate ? editingTemplate.title : '');
  const [templateDescription, setTemplateDescription] = useState(editingTemplate ? editingTemplate.description : '');
  const [periodStr, setPeriodStr] = useState('');
  const [routineStartDate, setRoutineStartDate] = useState(new Date().toISOString().split('T')[0]);
  
  const defaultEndDate = () => {
    const d = new Date(); d.setDate(d.getDate() + 28);
    return d.toISOString().split('T')[0];
  };
  
  const [routineEndDate, setRoutineEndDate] = useState(defaultEndDate());
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const [assignAs, setAssignAs] = useState('current');
  const lastLoadedRef = useRef({ clientName: '', assignAs: '', templateId: '' });

  // Estado para la rutina organizada por días
  const [weeklyRoutine, setWeeklyRoutine] = useState(() => {
    if (editingTemplate) {
      const { exercises } = parseRoutineJson(editingTemplate.routineJson || editingTemplate.routine);
      return exercises;
    }
    return {
      Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
    };
  });

  const [activeDay, setActiveDay] = useState('Lunes');
  const [selectedClient, setSelectedClient] = useState(initialClient);
  const [dailyNotes, setDailyNotes] = useState(() => {
    if (editingTemplate) {
      const { notes } = parseRoutineJson(editingTemplate.routineJson || editingTemplate.routine);
      return notes;
    }
    return {
      Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
    };
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownRef]);

  useEffect(() => {
    const currentTemplateId = editingTemplate ? editingTemplate.id : '';
    
    if (isTemplateMode) {
      if (lastLoadedRef.current.templateId !== currentTemplateId) {
        lastLoadedRef.current = { clientName: '', assignAs: '', templateId: currentTemplateId };
        if (editingTemplate) {
          const { exercises, notes } = parseRoutineJson(editingTemplate.routineJson || editingTemplate.routine);
          setWeeklyRoutine(exercises);
          setDailyNotes(notes);
          setTemplateTitle(editingTemplate.title || '');
          setTemplateDescription(editingTemplate.description || '');
        } else {
          setWeeklyRoutine({
            Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
          });
          setDailyNotes({
            Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
          });
          setTemplateTitle('');
          setTemplateDescription('');
        }
      }
    } else {
      if (selectedClient) {
        if (lastLoadedRef.current.clientName !== selectedClient || lastLoadedRef.current.assignAs !== assignAs) {
          lastLoadedRef.current = { clientName: selectedClient, assignAs: assignAs, templateId: '' };
          const clientObj = clients.find(c => `${c.name} ${c.lastName || ''}`.trim() === selectedClient);
          if (clientObj) {
            const routineSource = assignAs === 'next' ? clientObj.nextRoutineJson : clientObj.routineJson;
            const { exercises, notes } = parseRoutineJson(routineSource);
            setWeeklyRoutine(exercises);
            setDailyNotes(notes);
            // Pre-populate routine date range from existing client data
            if (clientObj.routineStartDate) setRoutineStartDate(clientObj.routineStartDate);
            if (clientObj.routineEndDate) setRoutineEndDate(clientObj.routineEndDate);
          } else {
            setWeeklyRoutine({
              Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
            });
            setDailyNotes({
              Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
            });
          }
        }
      } else {
        if (lastLoadedRef.current.clientName !== '') {
          lastLoadedRef.current = { clientName: '', assignAs: 'current', templateId: '' };
          setWeeklyRoutine({
            Lunes: [], Martes: [], Miércoles: [], Jueves: [], Viernes: [], Sábado: [], Domingo: []
          });
          setDailyNotes({
            Lunes: '', Martes: '', Miércoles: '', Jueves: '', Viernes: '', Sábado: '', Domingo: ''
          });
        }
      }
    }
  }, [selectedClient, clients, isTemplateMode, assignAs, editingTemplate]);

  const addExercise = useCallback((day) => {
    setWeeklyRoutine(prev => ({
      ...prev,
      [day]: [...prev[day], { name: '', reps: '', intensity: '', notes: '', expectedWeight: '', isOptional: false, sets: undefined }]
    }));
  }, []);

  const updateExercise = useCallback((day, index, field, value) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = [...prev[day]];
      newDayRoutine[index] = { ...newDayRoutine[index], [field]: value };
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const enableDetailedSets = useCallback((day, index) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = [...prev[day]];
      const ex = newDayRoutine[index];
      if (Array.isArray(ex.sets) && ex.sets.length > 0) return prev;
      
      const match = ex.reps ? ex.reps.match(/^\s*(\d+)\s*x\s*(.+)\s*$/) : null;
      const count = match ? parseInt(match[1]) : 3;
      const targetReps = match ? match[2].trim() : (ex.reps || '10');
      
      newDayRoutine[index] = {
        ...ex,
        sets: Array.from({ length: count }).map(() => ({ reps: targetReps, intensity: ex.intensity || '', notes: '' }))
      };
      
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const disableDetailedSets = useCallback((day, index) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = [...prev[day]];
      const ex = { ...newDayRoutine[index] };
      
      if (!Array.isArray(ex.sets) || ex.sets.length === 0) {
        ex.sets = undefined;
      } else {
        const first = ex.sets[0];
        const allSame = ex.sets.every(s => s.reps === first.reps && (s.intensity || '') === (first.intensity || ''));
        if (allSame) {
          ex.reps = `${ex.sets.length}x${first.reps}`;
          if (first.intensity) ex.intensity = first.intensity;
        }
        ex.sets = undefined;
      }
      
      newDayRoutine[index] = ex;
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const updateSet = useCallback((day, exIndex, setIndex, field, value) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = [...prev[day]];
      const ex = { ...newDayRoutine[exIndex] };
      if (!Array.isArray(ex.sets)) return prev;
      
      ex.sets = ex.sets.map((s, i) => i === setIndex ? { ...s, [field]: value } : s);
      newDayRoutine[exIndex] = ex;
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const addSet = useCallback((day, exIndex) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = [...prev[day]];
      const ex = { ...newDayRoutine[exIndex] };
      if (!Array.isArray(ex.sets)) ex.sets = [];
      
      const last = ex.sets[ex.sets.length - 1] || { reps: '10', intensity: ex.intensity || '', notes: '' };
      ex.sets = [...ex.sets, { reps: last.reps, intensity: last.intensity || '', notes: '' }];
      newDayRoutine[exIndex] = ex;
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const removeSet = useCallback((day, exIndex, setIndex) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = [...prev[day]];
      const ex = { ...newDayRoutine[exIndex] };
      if (!Array.isArray(ex.sets)) return prev;
      
      ex.sets = ex.sets.filter((_, i) => i !== setIndex);
      newDayRoutine[exIndex] = ex;
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const removeExercise = useCallback((day, index) => {
    setWeeklyRoutine(prev => {
      const newDayRoutine = prev[day].filter((_, i) => i !== index);
      return { ...prev, [day]: newDayRoutine };
    });
  }, []);

  const updateDailyNotes = useCallback((day, text) => {
    setDailyNotes(prev => ({ ...prev, [day]: text }));
  }, []);

  const exportToExcel = useCallback(() => {
    let csvContent = "\uFEFF"; // BOM para que Excel lea los tildes correctamente
    csvContent += "Día,Ejercicio,Series x Reps,Intensidad,Notas,Opcional\n";

    Object.keys(weeklyRoutine).forEach(day => {
      weeklyRoutine[day].forEach(ex => {
        const row = [
          day,
          `"${ex.name}"`,
          `"${ex.reps}"`,
          `"${ex.intensity}"`,
          `"${ex.notes}"`,
          ex.isOptional ? "Sí" : "No"
        ].join(",");
        csvContent += row + "\n";
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Rutina_Semanal.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [weeklyRoutine]);

  const saveRoutine = async () => {
    if (isTemplateMode) {
      if (!templateTitle.trim()) {
        await dialog.alert("Por favor, introduce un título para la plantilla.", { title: "Falta título" });
        return;
      }
      const token = localStorage.getItem('token');
      const payloadRoutine = {};
      DAYS_OF_WEEK.forEach(day => {
        payloadRoutine[day] = weeklyRoutine[day] || [];
        payloadRoutine[`${day}_notes`] = dailyNotes[day] || '';
      });
      const routineStr = JSON.stringify(payloadRoutine);
      try {
        const url = editingTemplate 
          ? `${API_BASE_URL}/api/templates/${editingTemplate.id}` 
          : `${API_BASE_URL}/api/templates`;
        const method = editingTemplate ? 'PUT' : 'POST';
        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: templateTitle,
            description: templateDescription,
            routineJson: routineStr
          })
        });
        if (response.ok) {
          const saved = await response.json();
          const savedWithRoutine = {
            ...saved,
            routine: saved.routineJson ? (typeof saved.routineJson === 'string' ? JSON.parse(saved.routineJson) : saved.routineJson) : null
          };
          if (setTemplates) {
            setTemplates(prev => {
              if (editingTemplate) {
                return prev.map(t => t.id === saved.id ? savedWithRoutine : t);
              } else {
                return [...prev, savedWithRoutine];
              }
            });
          }
          dialog.toast(editingTemplate ? "Plantilla actualizada con éxito." : "Plantilla maestra guardada con éxito.", { variant: 'success' });
          if (setActiveTab) setActiveTab('plantillas');
        } else {
          const errText = await response.text();
          await dialog.alert("Error al guardar la plantilla: " + errText, { title: "Error" });
        }
      } catch (err) {
        await dialog.alert("Error de red al guardar la plantilla.", { title: "Error de red" });
      }
    } else {
      if (!selectedClient) {
        await dialog.alert("Por favor, selecciona un cliente primero.", { title: "Faltan datos" });
        return;
      }
      const clientObj = clients.find(c => `${c.name} ${c.lastName || ''}`.trim() === selectedClient);
      if (!clientObj) {
        await dialog.alert("Cliente no encontrado.", { title: "Error" });
        return;
      }
      const token = localStorage.getItem('token');
      const payloadRoutine = {};
      DAYS_OF_WEEK.forEach(day => {
        payloadRoutine[day] = weeklyRoutine[day] || [];
        payloadRoutine[`${day}_notes`] = dailyNotes[day] || '';
      });
      const routineStr = JSON.stringify(payloadRoutine);

      // Validate date range
      if (routineStartDate && routineEndDate && routineEndDate < routineStartDate) {
        dialog.toast('La fecha de fin no puede ser anterior a la fecha de inicio.', { variant: 'error' });
        return;
      }

      try {
        const bodyPayload = assignAs === 'next' 
          ? { nextRoutineJson: routineStr }
          : { routineJson: routineStr, routineStartDate: routineStartDate || null, routineEndDate: routineEndDate || null };

        const response = await fetch(`${API_BASE_URL}/api/users/clients/${clientObj.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bodyPayload)
        });
        if (response.ok) {
          const updatedClientData = await response.json();
          if (setClients) {
            setClients(prev => prev.map(c => 
              c.id === clientObj.id ? { 
                ...c, 
                hasRoutine: !!(updatedClientData.routineJson),
                routineJson: updatedClientData.routineJson,
                routine: updatedClientData.routineJson ? JSON.parse(updatedClientData.routineJson) : null,
                nextRoutineJson: updatedClientData.nextRoutineJson,
                nextRoutine: updatedClientData.nextRoutineJson ? JSON.parse(updatedClientData.nextRoutineJson) : null,
                routineUpdatedAt: updatedClientData.routineUpdatedAt
              } : c
            ));
          }
          dialog.toast(
            assignAs === 'next' 
              ? `Siguiente rutina programada con éxito para ${selectedClient}.`
              : `Rutina asignada con éxito a ${selectedClient}.`, 
            { variant: 'success' }
          );
        } else {
          await dialog.alert("Error al guardar la rutina en el servidor.", { title: "Error" });
        }
      } catch (err) {
        await dialog.alert("Error de red al guardar la rutina.", { title: "Error" });
      }
    }
  };

  const loadTemplate = useCallback((t) => {
    const { exercises, notes } = parseRoutineJson(t.routineJson || t.routine);
    setWeeklyRoutine(exercises);
    setDailyNotes(notes);
    dialog.toast(`Plantilla "${t.title}" cargada.`, { variant: 'success' });
    setShowTemplateModal(false);
  }, [dialog]);

  return {
    DAYS_OF_WEEK,
    
    // State
    showTemplateModal, setShowTemplateModal,
    templateTitle, setTemplateTitle,
    templateDescription, setTemplateDescription,
    periodStr, setPeriodStr,
    routineStartDate, setRoutineStartDate,
    routineEndDate, setRoutineEndDate,
    showClientDropdown, setShowClientDropdown,
    assignAs, setAssignAs,
    activeDay, setActiveDay,
    selectedClient, setSelectedClient,
    weeklyRoutine, setWeeklyRoutine,
    dailyNotes,
    dropdownRef,
    
    // Handlers
    addExercise, updateExercise, removeExercise,
    enableDetailedSets, disableDetailedSets,
    addSet, updateSet, removeSet,
    updateDailyNotes,
    exportToExcel, saveRoutine, loadTemplate
  };
}
