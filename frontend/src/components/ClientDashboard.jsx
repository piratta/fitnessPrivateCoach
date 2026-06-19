import { useState, useRef, useEffect, Fragment, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import InitialQuestionnaire from './InitialQuestionnaire';
import ReviewTab from './ReviewTab';
import GalleryTab from './GalleryTab';
import ClientProfile from './ClientProfile';
import { getChatMessages, addChatMessage, connectWebSocket, disconnectWebSocket, sendWebSocketMessage } from '../utils/chatStore';
import { usersApi, reviewsApi } from '../utils/api';
import { useDialog } from './ui/Dialog';
import { API_BASE_URL } from '../config';
import { formatTime } from '../utils/timeUtils';
import '../index.css';

/**
 * Returns the prescribed sets for an exercise, always as an array of
 * { reps, intensity, notes } objects.
 *
 * Defined at module scope (not inside the component) so the hot-reload / production bundle
 * always sees a stable function reference and the effect callbacks can call it on first
 * render without any temporal-dead-zone risk.
 */
function normalizeExerciseSets(ex) {
  if (ex && Array.isArray(ex.sets) && ex.sets.length > 0) {
    return ex.sets.map(s => ({
      reps: (s && s.reps != null ? s.reps : '').toString(),
      intensity: (s && s.intensity) || '',
      notes: (s && s.notes) || '',
    }));
  }
  const reps = ex && typeof ex.reps === 'string' ? ex.reps : '';
  const match = reps.match(/^\s*(\d+)\s*x\s*(.+)\s*$/);
  const count = match ? parseInt(match[1]) : 3;
  const targetReps = match ? match[2].trim() : (reps || '10');
  return Array.from({ length: count }).map(() => ({
    reps: targetReps,
    intensity: (ex && ex.intensity) || '',
    notes: '',
  }));
}

function initializeLogsForTab(rName, tName, clientData, currentLogs, currentComments, currentVideoLinks) {
  const exercises = clientData?.routine?.[rName] || [];
  const sorted = [...exercises].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1));
  const fresh = {};
  const sourceLogs = currentLogs[rName] || {};

  sorted.forEach((ex, exIdx) => {
    const sets = normalizeExerciseSets(ex);
    if (sourceLogs[exIdx] && Array.isArray(sourceLogs[exIdx]) && sourceLogs[exIdx].length === sets.length) {
      fresh[exIdx] = sourceLogs[exIdx].map((s, sIdx) => ({
        weight: s.weight != null ? s.weight : '',
        reps: s.reps || sets[sIdx].reps || '10',
        completed: s.completed || false,
        skipped: s.skipped || false,
        exerciseName: ex.name,
        intensity: s.intensity || sets[sIdx].intensity || '',
        notes: s.notes || sets[sIdx].notes || ''
      }));
    } else {
      fresh[exIdx] = sets.map(s => ({
        weight: '',
        reps: s.reps || '10',
        completed: false,
        skipped: false,
        exerciseName: ex.name,
        intensity: s.intensity || '',
        notes: s.notes || ''
      }));
    }
  });

  // Map comments and video links from original template indices to target tab indices
  const newComments = { ...currentComments };
  const newVideoLinks = { ...currentVideoLinks };
  sorted.forEach((ex, exIdx) => {
    const sourceKey = `${rName}_${exIdx}`;
    const targetKey = `${tName}_${exIdx}`;
    if (currentComments[sourceKey] !== undefined) {
      newComments[targetKey] = currentComments[sourceKey];
    }
    if (currentVideoLinks[sourceKey] !== undefined) {
      newVideoLinks[targetKey] = currentVideoLinks[sourceKey];
    }
  });

  return { logs: fresh, comments: newComments, videoLinks: newVideoLinks };
}

export default function ClientDashboard({ user, onLogout}) {
  const dialog = useDialog();
  // null = unknown (still loading from backend). The badge only shows when explicitly false.
  const [isReviewLocked, setIsReviewLocked] = useState(null);
  const [hasActiveReview, setHasActiveReview] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [activeTab, setActiveTab] = useState('workout');
  const [viewingNextRoutine, setViewingNextRoutine] = useState(false);

  // Capture the browser back button so it does not exit the app. We seed a history entry per
  // tab change, and on popstate we either switch back to a previous tab or, if we are already
  // on the root tab (workout), push the state again instead of leaving.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Initial sentinel so the first back press has somewhere to land.
    window.history.pushState({ inApp: true, tab: 'workout' }, '');
    // eslint-disable-next-line no-unused-vars
    const onPopState = (e) => {
      // The browser already popped one entry; re-push so we stay inside the app.
      window.history.pushState({ inApp: true, tab: 'workout' }, '');
      // If we were on a non-root tab, treat the back press as "go to workout".
      setActiveTab(prev => prev === 'workout' ? prev : 'workout');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const { data: rawClientData, isLoading, isError, refetch: fetchProfile } = useQuery({
    queryKey: ['clientProfile'],
    queryFn: async () => {
      return await usersApi.getMe();
    },
    retry: 3,
  });

  const clientData = useMemo(() => {
    if (!rawClientData) return null;
    let parsedRoutine = null;
    if (rawClientData.routineJson) {
      try { parsedRoutine = JSON.parse(rawClientData.routineJson); } catch (e) { console.error(e); }
    }
    let parsedNextRoutine = null;
    if (rawClientData.nextRoutineJson) {
      try { parsedNextRoutine = JSON.parse(rawClientData.nextRoutineJson); } catch (e) { console.error(e); }
    }
    const hasRoutine = !!(parsedRoutine && Object.keys(parsedRoutine).some(day => parsedRoutine[day] && parsedRoutine[day].length > 0));
    
    return {
      ...rawClientData,
      routine: parsedRoutine,
      nextRoutine: parsedNextRoutine,
      hasRoutine: hasRoutine
    };
  }, [rawClientData]);
  const [showRoutineTable, setShowRoutineTable] = useState(false);
  const [pdfStyle, setPdfStyle] = useState('styled');
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [workoutEval, setWorkoutEval] = useState({
    stress: 3,
    fatigue: 3,
    motivation: 3,
    sleepHours: 7.5,
    digestions: 3
  });
  const [selectedMonths, setSelectedMonths] = useState([0]);
  const [largePhotoView, setLargePhotoView] = useState(null);
  const [toggledPhoto, setToggledPhoto] = useState(false);
  const [largePhotoSource, setLargePhotoSource] = useState('pending');
  const [hasAcceptedEvaluation, setHasAcceptedEvaluation] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);

  const [progressHistory, setProgressHistory] = useState([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    logDate: new Date().toISOString().split('T')[0],
    weight: '', waist: '', hip: '', neck: '', biceps: '', leg: '',
    chest: '', calf: '', forearm: '', back: ''
  });

  // Workout Tracker States
  const [_selectedDay, setSelectedDay] = useState('');
  const [skippedDays, setSkippedDays] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);

  const [_comments, setComments] = useState({});
  const [_videoLinks, setVideoLinks] = useState({});
  const [_logs, setLogs] = useState({});
  
  const defaultDay = clientData?.routine ? Object.keys(clientData.routine).filter(day => !day.endsWith('_notes'))[0] : '';
  const selectedDay = _selectedDay || defaultDay || '';
  
  const logs = useMemo(() => {
    if (Object.keys(_logs).length > 0) return _logs;
    if (!clientData?.routine || !selectedDay) return {};
    const fresh = {};
    Object.keys(clientData.routine).filter(k => !k.endsWith('_notes')).forEach(dayName => {
      const initialized = initializeLogsForTab(dayName, dayName, clientData, {}, {}, {});
      fresh[dayName] = initialized.logs;
    });
    return fresh;
  }, [_logs, clientData?.routine, selectedDay]);

  const comments = useMemo(() => {
    if (Object.keys(_comments).length > 0) return _comments;
    return {};
  }, [_comments]);

  const videoLinks = useMemo(() => {
    if (Object.keys(_videoLinks).length > 0) return _videoLinks;
    return {};
  }, [_videoLinks]);

  
  const [_logs, setLogs] = useState({});



  const handleCompleteOnboarding = async (formData, photos) => {
    // Map the questionnaire fields to the ProgressLog shape persisted by the backend.
    const num = (v) => (v !== '' && v !== null && v !== undefined) ? parseFloat(v) : null;
    const measurements = {
      weight: num(formData.peso),
      waist: num(formData.cintura),
      hip: num(formData.cadera),
      neck: num(formData.cuello),
      biceps: num(formData.biceps),
      leg: num(formData.pierna),
      chest: num(formData.pecho),
      calf: num(formData.gemelo),
      forearm: num(formData.antebrazo),
      back: num(formData.espalda),
    };
    try {
      await usersApi.completeOnboarding(measurements);
      // Upload each initial photo sequentially; failures here should not block onboarding.
      if (photos) {
        for (const [view, staged] of Object.entries(photos)) {
          try { await usersApi.uploadInitialPhoto(staged.file, view); }
          catch (photoErr) { console.warn(`Foto inicial ${view} no se pudo subir`, photoErr); }
        }
      }
      dialog.toast('¡Bienvenido! Datos iniciales guardados', { variant: 'success' });
      fetchProfile();
      fetchProgressHistory();
    } catch (e) {
      // Do NOT auto-logout here: the GET /me right before this succeeded with the same token,
      // so a 401 from this endpoint specifically is a server-side bug (probably the endpoint
      // not yet deployed). Show the backend message so the user can report it instead of
      // getting kicked out.
      const detail = e.message && e.message !== 'unauthorized' && e.message !== 'forbidden'
        ? `\n\nDetalle del servidor: ${e.message}`
        : '';
      const title = e.status === 401 ? 'Error de autorización' : 'Error';
      await dialog.alert(`No se pudieron guardar tus datos iniciales. Vuelve a intentarlo en unos segundos.${detail}`, { title });
    }
  };

  const fetchProgressHistory = () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    console.log("🟩 [API] Llamando a /api/progress/history...");

    fetch(`${API_BASE_URL}/api/progress/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
          console.log(`🟩 [API] Respuesta /progress/history HTTP Status: ${res.status}`);
          return res.ok ? res.json() : [];
        })
        .then(data => {
          console.log("🟩 [API] Datos crudos (Raw Data) recibidos de /progress/history:", data);

          // Asegurar que siempre sea un Array
          const validData = Array.isArray(data) ? data : (data.data && Array.isArray(data.data) ? data.data : []);
          console.log("🟩 [STATE] Historial de progreso procesado (Debe ser un Array):", validData);

          setProgressHistory(validData);

          if (validData.length > 0) {
            const measureCount = validData.filter(l =>
                [l.waist, l.hip, l.neck, l.biceps, l.leg].some(v => v !== null && v !== undefined)).length;
            setSelectedMonths([Math.max(0, measureCount - 1)]);
          } else {
            console.log("🟩 [STATE] El array de historial de progreso está vacío.");
          }
        })
        .catch(err => console.error("❌ [ERROR CRÍTICO] Error en fetchProgressHistory:", err));
  };

  // Drive the review-tab badge from the backend so it never shows "1" while the lock is still
  // closed. We refresh on mount and whenever the user navigates back to the review tab.
  useEffect(() => {
    fetchProgressHistory();
  }, [user, activeTab]);


  const getTimeScaleLabel = () => {
    if (!clientData?.reviewFrequency) return 'Mes';
    const freq = clientData.reviewFrequency.toLowerCase();
    if (freq.includes('semana')) return 'Semana';
    return 'Mes';
  };
  const timeScaleLabel = getTimeScaleLabel();
  const hasNextRoutine = clientData?.nextWorkout ? true : false;

  // Live Workout States
  const [isWorkoutStarted, setIsWorkoutStarted] = useState(false);
  const [isWorkoutLocked, setIsWorkoutLocked] = useState(false);
  const [hasFinishedSession, setHasFinishedSession] = useState(false);
  const [workoutSeconds, setWorkoutSeconds] = useState(0);
  const [restSeconds, setRestSeconds] = useState(0);
  const [workoutSummary, setWorkoutSummary] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  // Resumable / paused workout flags. Declared up here BEFORE any effect that references them
  // in its dependency array; otherwise the JS engine hits the temporal dead zone during the
  // first render of the component body and the whole component crashes with
  //   "Cannot access <var> before initialization".
  const [hasResumableWorkout, setHasResumableWorkout] = useState(false);
  const [resumableDayName, setResumableDayName] = useState(null);
  // Weekly UI state that needs to survive F5: the "this day is consumed elsewhere but the
  // user said train it anyway" overrides and the "I picked the Jueves plan to do from this
  // Lunes tab" loaded-routine map. We persist them in localStorage keyed by the start of the
  // current week, so the moment the week rolls over the entry is considered stale and gets
  // wiped automatically (no leftover overrides leaking into the next week).
  const WEEKLY_STATE_KEY = `pf:weeklyState:${user?.id || user?.email || 'anon'}`;
  const getWeekStartISO = () => {
    const now = new Date();
    const offsetToMonday = (now.getDay() + 6) % 7;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - offsetToMonday);
    return monday.toISOString().split('T')[0];
  };
  const loadStoredWeeklyState = () => {
    try {
      const raw = localStorage.getItem(WEEKLY_STATE_KEY);
      if (!raw) return { override: new Set(), loaded: {} };
      const parsed = JSON.parse(raw);
      if (parsed.weekStart !== getWeekStartISO()) {
        localStorage.removeItem(WEEKLY_STATE_KEY);
        return { override: new Set(), loaded: {} };
      }
      return {
        override: new Set(Array.isArray(parsed.overrideConsumed) ? parsed.overrideConsumed : []),
        loaded: (parsed.loadedRoutineByTab && typeof parsed.loadedRoutineByTab === 'object') ? parsed.loadedRoutineByTab : {},
      };
    } catch {
      return { override: new Set(), loaded: {} };
    }
  };
  const initialWeekly = loadStoredWeeklyState();
  const [overrideConsumed, setOverrideConsumed] = useState(initialWeekly.override);
  const [loadedRoutineByTab, setLoadedRoutineByTab] = useState(initialWeekly.loaded);
  // Persist both whenever they change so a refresh restores the user's choices.
  useEffect(() => {
    try {
      localStorage.setItem(WEEKLY_STATE_KEY, JSON.stringify({
        weekStart: getWeekStartISO(),
        overrideConsumed: Array.from(overrideConsumed),
        loadedRoutineByTab,
      }));
    } catch (e) { console.error(e);  /* quota — ignore, in-memory state is still correct */  }
  }, [overrideConsumed, loadedRoutineByTab, WEEKLY_STATE_KEY]);

  // Sessions completed during the CURRENT week (Monday → Sunday) indexed by dayName. Drives
  // the per-day "locked / completed" view so that a day already trained earlier in the week
  // (e.g. Lunes) stays marked as completed when the user comes back on Martes, while days
  // that have not been trained yet show the fresh "ready to start" UI.
  const [todaySessionsByDay, setTodaySessionsByDay] = useState({});

  // Review Form State
  // History State
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Loads the full workout history. We do it on mount (not just when the history tab opens) so
  // we can transparently restore today's session on F5 — otherwise the user would see empty
  // inputs after a reload even though their workout is already saved on the backend.
  const fetchHistory = () => {
    const token = localStorage.getItem('token');
    if (!token) return Promise.resolve([]);

    console.log("🟧 [API] Llamando a /api/workouts/history/me...");
    setIsLoadingHistory(true);

    return fetch(`${API_BASE_URL}/api/workouts/history/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
          console.log(`🟧 [API] Respuesta /workouts/history/me HTTP Status: ${res.status}`);
          return res.ok ? res.json() : [];
        })
        .then(data => {
          console.log("🟧 [API] Datos crudos (Raw Data) de workouts/history/me:", data);

          const validData = Array.isArray(data) ? data : [];
          console.log("🟧 [STATE] Historial de entrenamientos procesado (Debe ser Array):", validData);

          setHistoryData(validData);
          return validData;
        })
        .catch(err => {
          console.error("❌ [ERROR CRÍTICO] Error en fetchHistory:", err);
          return [];
        })
        .finally(() => {
          console.log("🟧 [API] Finalizada la carga de historial de entrenamientos.");
          setIsLoadingHistory(false);
        });
  };

  useEffect(() => {
    console.log("🔄 [RENDER] Estado actual de clientData:", clientData);
  }, [clientData]);

  // Once the routine is known, build a map of dayName → session for sessions completed TODAY.
  // We never use sessions from previous days here so the locked/completed view does not bleed
  // into the next day's workout.
  useEffect(() => {
    if (!clientData?.routine) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory().then(list => {
      if (!Array.isArray(list)) return;
      // Compute the [Monday, Sunday] window for the current week (week starts on Monday in ES).
      const now = new Date();
      const dow = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
      const offsetToMonday = (dow + 6) % 7;
      
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() - offsetToMonday);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      let limitDate = monday;
      if (clientData?.routineUpdatedAt) {
        const updateDate = new Date(clientData.routineUpdatedAt);
        updateDate.setHours(0, 0, 0, 0);
        if (updateDate > limitDate) {
          limitDate = updateDate;
        }
      }

      const inWeek = (iso) => {
        if (!iso) return false;
        const d = new Date(iso);
        d.setHours(0, 0, 0, 0);
        return d >= limitDate && d <= sunday;
      };

      // Indexamos por el slot de ejecución guardado en logsJson. Si no existe (entrenos antiguos),
      // usamos el día físico real. Si tampoco, usamos el dayName.
      const weekdayOf = (iso) => {
        if (!iso) return null;
        const d = new Date(iso);
        return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];
      };
      
      const byDay = {};
      for (const s of list) {
        if (!inWeek(s.sessionDate)) continue;
        
        let slot = null;
        if (s.logsJson) {
           try {
              const parsed = JSON.parse(s.logsJson);
              slot = parsed._executionSlot;
           // eslint-disable-next-line no-unused-vars, no-empty
           } catch (e) { console.error("Error capturado:", e); }
        }
        
        const key = slot || weekdayOf(s.sessionDate) || s.dayName;
        if (!key) continue;
        const prev = byDay[key];
        if (!prev || new Date(s.sessionDate) > new Date(prev.sessionDate)) {
          byDay[key] = s;
        }
      }
      setTodaySessionsByDay(byDay);
    });
  }, [clientData?.routine, clientData?.routineUpdatedAt]);

  // Whenever the user navigates to a different day, rehydrate the workout-state flags ONLY for
  // that day. If the day has a session finished today we restore logs + summary; otherwise we
  // clear the flags so the user can start a brand new workout for it.
  useEffect(() => {
    if (!selectedDay) return;
    // Do not stomp on a workout that is mid-flight or being viewed live.
    if (isWorkoutStarted) return;
    const todays = todaySessionsByDay[selectedDay];
    if (todays) {
      if (todays.logsJson) {
        try {
          const parsed = JSON.parse(todays.logsJson);
          const isFlat = parsed && typeof parsed === 'object' && Object.keys(parsed).every(k => /^\d+$/.test(k));
          // Persisted container is keyed by the TEMPLATE dayName (e.g. "Lunes") but the user
          // is looking at the REAL weekday (e.g. "Martes"). Project the inner slot onto the
          // real day so currentLogs = logs[selectedDay] resolves to the saved sets.
          const innerSlot = isFlat ? parsed : (parsed[todays.dayName] || parsed[selectedDay] || {});
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setLogs(prev => ({ ...prev, [selectedDay]: innerSlot }));
        // eslint-disable-next-line no-unused-vars
        } catch (e) { /* ignore corrupt payload */ }
      }
      if (todays.commentsJson) {
        // eslint-disable-next-line no-unused-vars, no-empty
        try { setComments(JSON.parse(todays.commentsJson)); } catch (e) { console.error("Error capturado:", e); }
      }
      if (todays.videoLinksJson) {
        // eslint-disable-next-line no-unused-vars, no-empty
        try { setVideoLinks(JSON.parse(todays.videoLinksJson)); } catch (e) { console.error("Error capturado:", e); }
      }
      setActiveSessionId(todays.id);
      setWorkoutSeconds(todays.durationSeconds || 0);
      setWorkoutSummary({
        // eslint-disable-next-line react-hooks/immutability
        time: formatTime(todays.durationSeconds || 0),
        volume: todays.totalVolume,
        sets: todays.completedSets,
        percentage: todays.completionPercentage,
      });
      setIsWorkoutLocked(true);
      setHasFinishedSession(true);
    } else if (hasResumableWorkout && resumableDayName === selectedDay) {
      // Day has a paused / unfinished workout — keep its persisted state intact so the
      // resume banner has the right seconds + logs to offer.
      setIsWorkoutLocked(false);
      setHasFinishedSession(false);
    } else {
      // No session for this day today → present the fresh, ready-to-train view.
      setActiveSessionId(null);
      setWorkoutSeconds(0);
      setRestSeconds(0);
      setWorkoutSummary(null);
      setIsWorkoutLocked(false);
      setHasFinishedSession(false);
    }
    // eslint-disable-next-line
  }, [selectedDay, todaySessionsByDay, hasResumableWorkout, resumableDayName]);

  // Timers Effect
  useEffect(() => {
    let interval = null;
    if (isWorkoutStarted && !isWorkoutLocked) {
      interval = setInterval(() => {
        setWorkoutSeconds(prev => prev + 1);
        setRestSeconds(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isWorkoutStarted, isWorkoutLocked]);

  // Initialize selectedDay when routine is loaded
  useEffect(() => {
    if (currentRoutineObj) {
      const days = Object.keys(currentRoutineObj).filter(day => !day.endsWith('_notes'));
      if (days.length > 0) {
        if (!selectedDay || !days.includes(selectedDay)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSelectedDay(days[0]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoutineObj]);

  // Local storage key for the in-progress workout. We keep it per user so a shared device with
  // multiple accounts does not cross-contaminate state.
  const IN_PROGRESS_KEY = `pf:inProgressWorkout:${user?.id || user?.email || 'anon'}`;

  // normalizeExerciseSets lives at module scope (see top of this file).

  // (hasResumableWorkout / resumableDayName declared above the per-day reset effect.)

  // Initialize logs dynamically when routine changes. If we have a fresh-on-disk in-progress
  // workout for today, merge its persisted logs/timer into the initialised template so the
  // user can pick up exactly where they left off after F5 / closing the tab.
  useEffect(() => {
    if (!clientData?.routine) return;
    const initialLogs = {};
    Object.keys(clientData.routine).filter(day => !day.endsWith('_notes')).forEach(day => {
      initialLogs[day] = {};
      const sourceDay = loadedRoutineByTab[day] || day;
      const exercises = clientData.routine[sourceDay] || [];
      const sorted = [...exercises].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1));
      sorted.forEach((ex, exIdx) => {
        const sets = normalizeExerciseSets(ex);
        initialLogs[day][exIdx] = sets.map(s => ({
          weight: '',
          reps: s.reps || '10',
          completed: false,
          skipped: false,
          exerciseName: ex.name,
          intensity: s.intensity || '',
          notes: s.notes || '',
        }));
      });
    });

    let resumed = null;
    try {
      const raw = localStorage.getItem(IN_PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const today = new Date().toISOString().split('T')[0];
        // Only resume if it was started today AND the day still exists in the current routine.
        if (parsed.sessionDate === today && parsed.dayName && initialLogs[parsed.dayName]) {
          resumed = parsed;
        } else {
          localStorage.removeItem(IN_PROGRESS_KEY);
        }
      }
    } catch (e) { console.error(e);  /* ignore corrupt blob */  }

    if (resumed) {
      const merged = { ...initialLogs, [resumed.dayName]: resumed.dayLogs || initialLogs[resumed.dayName] };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogs(merged);
      setSelectedDay(resumed.dayName);
      setWorkoutSeconds(resumed.workoutSeconds || 0);
      if (resumed.activeSessionId) setActiveSessionId(resumed.activeSessionId);
      // Do not flip isWorkoutStarted automatically; show a banner that lets the user resume.
      setHasResumableWorkout(true);
      setResumableDayName(resumed.dayName);
    } else {
      setLogs(initialLogs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData?.routine, loadedRoutineByTab]);

  // Autosave the in-progress workout whenever the relevant slices change. Only while the
  // workout is running — once it is finished or locked we let the backend be the source of
  // truth and clear the local snapshot.
  useEffect(() => {
    if (!isWorkoutStarted || !selectedDay || !logs || !logs[selectedDay]) return;
    try {
      localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify({
        dayName: selectedDay,
        sessionDate: new Date().toISOString().split('T')[0],
        dayLogs: logs[selectedDay],
        workoutSeconds,
        activeSessionId,
        savedAt: Date.now(),
      }));
    } catch (e) { console.error(e);  /* quota or serialisation issue — ignore */  }
  }, [isWorkoutStarted, selectedDay, logs, workoutSeconds, activeSessionId, IN_PROGRESS_KEY]);

  // Drop the local snapshot when the workout is no longer in progress.
  // Skipping the first render here is critical: at mount time both flags start as false but
  // the resume effect has not had a chance to read localStorage yet. Without this guard the
  // snapshot was being wiped right before hydration, so refreshing while paused lost the
  // workout entirely.
  const cleanupGuardRef = useRef(false);
  useEffect(() => {
    if (!cleanupGuardRef.current) {
      cleanupGuardRef.current = true;
      return;
    }
    if (!isWorkoutStarted && !hasResumableWorkout) {
      // eslint-disable-next-line no-empty
      try { localStorage.removeItem(IN_PROGRESS_KEY); } catch (e) { console.error("Error capturado:", e); }
    }
  }, [isWorkoutStarted, hasResumableWorkout, IN_PROGRESS_KEY]);

  const resumeWorkout = () => {
    setHasResumableWorkout(false);
    setResumableDayName(null);
    setIsWorkoutStarted(true);
    setIsWorkoutLocked(false);
    setHasFinishedSession(false);
  };

  // Manual pause: stop the live timer, force-write the snapshot so it survives a refresh
  // / lost session, and surface the resume banner so the user can pick up later.
  const handlePauseWorkout = () => {
    if (!isWorkoutStarted) return;
    try {
      localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify({
        dayName: selectedDay,
        sessionDate: new Date().toISOString().split('T')[0],
        dayLogs: logs?.[selectedDay] || {},
        workoutSeconds,
        activeSessionId,
        savedAt: Date.now(),
      }));
    } catch (e) { console.error(e);  /* quota — ignore, we still pause locally */  }
    setIsWorkoutStarted(false);
    setHasResumableWorkout(true);
    setResumableDayName(selectedDay);
    setRestSeconds(0);
    dialog.toast('Entrenamiento pausado. Puedes reanudarlo cuando quieras.', { variant: 'info' });
  };

  const discardResumableWorkout = () => {
    setHasResumableWorkout(false);
    setResumableDayName(null);
    // eslint-disable-next-line no-empty
    try { localStorage.removeItem(IN_PROGRESS_KEY); } catch (e) { console.error("Error capturado:", e); }
    // Restore the day to fresh empty logs.
    if (clientData?.routine && selectedDay) {
      const fresh = {};
      const sourceDay = loadedRoutineByTab[selectedDay] || selectedDay;
      const exercises = clientData.routine[sourceDay] || [];
      const sorted = [...exercises].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1));
      sorted.forEach((ex, exIdx) => {
        const sets = normalizeExerciseSets(ex);
        fresh[exIdx] = sets.map(s => ({
          weight: '',
          reps: s.reps || '10',
          completed: false,
          skipped: false,
          exerciseName: ex.name,
          intensity: s.intensity || '',
          notes: s.notes || ''
        }));
      });
      setLogs(prev => ({ ...prev, [selectedDay]: fresh }));
    }
    setWorkoutSeconds(0);
    setActiveSessionId(null);
  };

  // When the user is looking at a day whose only "content" comes from a session executed on
  // that day but planned for a different template column (e.g. Lunes plan trained on Martes),
  // the visible routine is empty. Fall back to the original template day so the exercises
  // appear right under the completed-summary card.
  const completedSessionToday = selectedDay ? todaySessionsByDay[selectedDay] : null;
  // Template days that have already been trained somewhere in the current week. If the user
  // navigates to a template day whose work was actually done on a different weekday, this
  // pestaña should look empty (with a hint), not offer to repeat the same workout.
  const trainedTemplateDays = new Set(
    Object.values(todaySessionsByDay).map(s => s && s.dayName).filter(Boolean)
  );
  const consumedElsewhereSession = (selectedDay && !completedSessionToday)
    ? Object.values(todaySessionsByDay).find(s => s && s.dayName === selectedDay)
    : null;
  const isDayConsumedElsewhere = !!consumedElsewhereSession && !overrideConsumed.has(selectedDay);
  // A "loaded routine" wins over the regular fallback: the user explicitly picked a pending
  // day's routine to execute from THIS tab, so render and finishWorkout must use it.
  const loadedRoutineHere = selectedDay ? loadedRoutineByTab[selectedDay] : null;
  const targetTabWhereLoaded = selectedDay
    ? Object.keys(loadedRoutineByTab).find(k => k !== selectedDay && loadedRoutineByTab[k] === selectedDay)
    : null;
  const targetTabActiveOrLocked = targetTabWhereLoaded
    ? (!!todaySessionsByDay[targetTabWhereLoaded]
       || (isWorkoutStarted && selectedDay === targetTabWhereLoaded)
       || (hasResumableWorkout && resumableDayName === targetTabWhereLoaded))
    : false;
  const isLoadedElsewhere = !!targetTabWhereLoaded && !loadedRoutineHere;
  const realExecutionTab = consumedElsewhereSession
    ? Object.keys(todaySessionsByDay).find(k => todaySessionsByDay[k] === consumedElsewhereSession)
    : null;
  const realExecutionDay = consumedElsewhereSession
    ? (() => {
        const d = new Date(consumedElsewhereSession.sessionDate);
        return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][d.getDay()];
      })()
    : null;
  const displayExecutionName = realExecutionTab || realExecutionDay;
  const routineDayForRender = loadedRoutineHere
    ? loadedRoutineHere
    : (clientData?.routine?.[selectedDay]?.length > 0)
      ? selectedDay
      : (completedSessionToday?.dayName || selectedDay);
  const activeWorkout = viewingNextRoutine
    ? (clientData?.nextRoutine?.[selectedDay] ? [...clientData.nextRoutine[selectedDay]].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1)) : [])
    : ((isDayConsumedElsewhere || isLoadedElsewhere) && !loadedRoutineHere)
      ? []
      : (clientData?.routine && routineDayForRender && clientData.routine[routineDayForRender])
        ? [...clientData.routine[routineDayForRender]].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1))
        : [];

  // Days that have a routine assigned but no completed session this week.
  const pendingOptions = clientData?.routine
    ? Object.keys(clientData.routine)
        .filter(d => Array.isArray(clientData.routine[d]) && clientData.routine[d].length > 0 && !trainedTemplateDays.has(d))
        .map(d => {
          const loadedAt = Object.keys(loadedRoutineByTab).find(k => loadedRoutineByTab[k] === d);
          return {
            originalDay: d,
            currentTab: loadedAt || d,
            isMoved: !!loadedAt
          };
        })
        .filter(opt => opt.currentTab !== selectedDay)
    : [];

  // Action wired to each "Hacer el entreno del X" button on the swapped-day card.
  const pickPendingDay = (day) => {
    if (!clientData?.routine || !clientData.routine[day]) return;

    const targetTab = selectedDay;
    const sourceTab = Object.keys(loadedRoutineByTab).find(k => loadedRoutineByTab[k] === day) || day;
    const displacedRoutineRaw = loadedRoutineByTab[targetTab] || targetTab;
    const displacedRoutine = displacedRoutineRaw === day ? sourceTab : displacedRoutineRaw;
    const hasDisplacedRoutine = clientData.routine[displacedRoutine]
      && clientData.routine[displacedRoutine].length > 0
      && !trainedTemplateDays.has(displacedRoutine);

    // 1. Prepare logs, comments, video links for targetTab (loading day's routine)
    const targetData = initializeLogsForTab(day, targetTab, clientData, logs, comments, videoLinks);

    let finalLogs = { ...logs, [targetTab]: targetData.logs };
    let finalComments = targetData.comments;
    let finalVideoLinks = targetData.videoLinks;

    // 2. If there is a displaced routine, load it on sourceTab (swap!)
    if (hasDisplacedRoutine) {
      const sourceData = initializeLogsForTab(displacedRoutine, sourceTab, clientData, finalLogs, finalComments, finalVideoLinks);
      finalLogs[sourceTab] = sourceData.logs;
      finalComments = sourceData.comments;
      finalVideoLinks = sourceData.videoLinks;
    } else {
      // Clear logs of sourceTab since it's now empty/rest day
      finalLogs[sourceTab] = {};
    }

    setComments(finalComments);
    setVideoLinks(finalVideoLinks);
    setLogs(finalLogs);

    setLoadedRoutineByTab(prev => {
      const copy = { ...prev };
      // Remove old references to day and displacedRoutine
      Object.keys(copy).forEach(k => {
        if (copy[k] === day || copy[k] === displacedRoutine) {
          delete copy[k];
        }
      });
      // Assign new mappings if they actually move
      if (targetTab !== day) {
        copy[targetTab] = day;
      } else {
        delete copy[targetTab];
      }
      if (hasDisplacedRoutine) {
        if (sourceTab !== displacedRoutine) {
          copy[sourceTab] = displacedRoutine;
        } else {
          delete copy[sourceTab];
        }
      }
      return copy;
    });

    setOverrideConsumed(prev => {
      const n = new Set(prev);
      if (targetTab !== day) {
        n.add(targetTab);
      } else {
        n.delete(targetTab);
      }
      if (hasDisplacedRoutine) {
        if (sourceTab !== displacedRoutine) {
          n.add(sourceTab);
        } else {
          n.delete(sourceTab);
        }
      }
      return n;
    });

    setWorkoutSeconds(0);
    setRestSeconds(0);
    setWorkoutSummary(null);
    setActiveSessionId(null);
    setIsWorkoutLocked(false);
    setHasFinishedSession(false);
  };

  const currentLogs = (logs && selectedDay) ? logs[selectedDay] : null;
  const isDaySkipped = skippedDays[selectedDay];

  // Inline Editing State for Locked Workouts
  const [editingSets, setEditingSets] = useState({});
  const [editingExtras, setEditingExtras] = useState({});

  const [showChatModal, setShowChatModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const showChatModalRef = useRef(showChatModal);

  useEffect(() => {
    showChatModalRef.current = showChatModal;
  }, [showChatModal]);

  // Fetch initial messages
  useEffect(() => {
    if (user?.email) {
      getChatMessages(user.email).then(msgs => setMessages(msgs));
    }
  }, [user?.email]);

  // Connect to WebSocket and receive live messages
  useEffect(() => {
    if (!user?.email) return;

    const handleWsMessage = (message) => {
      if (message.clientEmail === user.email) {
        setMessages(prev => {
          const isDuplicate = prev.some(m => m.text === message.text && m.time === message.time && m.sender === message.sender);
          if (isDuplicate) return prev;
          return [...prev, { sender: message.sender, text: message.text, time: message.time }];
        });

        if (!showChatModalRef.current && message.sender === 'coach') {
          setUnreadMessages(prev => prev + 1);
          dialog.toast(`Mensaje de tu entrenador: ${message.text}`, { variant: 'info' });
        }
      }
    };

    connectWebSocket(handleWsMessage);

    return () => {
      disconnectWebSocket(handleWsMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // When opening modal, reset unread and fetch history immediately
  useEffect(() => {
    if (showChatModal && user?.email) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadMessages(0);
      getChatMessages(user.email).then(msgs => setMessages(msgs));
    }
  }, [showChatModal, user?.email]);

  useEffect(() => {
    if (showChatModal && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showChatModal, messages]);

  // Progress States — seeded with the latest logged weight so the quick-entry field shows
  // the user's most recent value instead of an outdated mock.
  const [dailyWeight, setDailyWeight] = useState('');
  useEffect(() => {
    const last = [...progressHistory].reverse().find((l) => l.weight != null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (last) setDailyWeight(String(last.weight));
  }, [progressHistory]);
  const [chartType, setChartType] = useState('weight');
  // eslint-disable-next-line react-hooks/purity
  const lastReviewDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  // eslint-disable-next-line react-hooks/purity
  const daysSinceReview = Math.floor((Date.now() - lastReviewDate) / (1000 * 60 * 60 * 24));
  const daysUntilNext = 7 - daysSinceReview;
  // eslint-disable-next-line no-unused-vars
  const updateSet = (exIdx, setIdx, field, value) => {
    setLogs(prev => {
      const newLogs = { ...prev };
      const dayLogs = { ...newLogs[selectedDay] };
      const exSets = [...dayLogs[exIdx]];
      const updatedSet = { ...exSets[setIdx] };
      if (field === 'weight') {
        const parsed = parseFloat(value);
        updatedSet[field] = (parsed < 0) ? 0 : value;
      } else {
        updatedSet[field] = value;
      }
      exSets[setIdx] = updatedSet;
      dayLogs[exIdx] = exSets;
      newLogs[selectedDay] = dayLogs;
      return newLogs;
    });
  };

  const toggleComplete = (exIdx, setIdx) => {
    const currentSet = logs?.[selectedDay]?.[exIdx]?.[setIdx];
    if (!currentSet) return;

    // Prevent completing if weight is empty
    if (!currentSet.completed && (!currentSet.weight || currentSet.weight.toString().trim() === '')) {
      dialog.toast("Introduce el peso levantado antes de completar la serie", { variant: 'error' });
      return;
    }

    const isNowCompleted = !currentSet.completed;

    setLogs(prev => {
      const newLogs = { ...prev };
      const dayLogs = { ...newLogs[selectedDay] };
      const exSets = [...dayLogs[exIdx]];
      exSets[setIdx] = { ...exSets[setIdx], completed: isNowCompleted };
      dayLogs[exIdx] = exSets;
      newLogs[selectedDay] = dayLogs;
      return newLogs;
    });

    if (isNowCompleted && isWorkoutStarted) {
      setRestSeconds(180); // 3-minute rest timer between sets
    }
  };

  const toggleSkipSet = (exIdx, setIdx) => {
    setLogs(prev => {
      const newLogs = { ...prev };
      const dayLogs = { ...newLogs[selectedDay] };
      const exSets = [...dayLogs[exIdx]];
      const oldSet = exSets[setIdx];
      const nowSkipped = !oldSet.skipped;
      exSets[setIdx] = { ...oldSet, skipped: nowSkipped, completed: nowSkipped ? false : oldSet.completed };
      dayLogs[exIdx] = exSets;
      newLogs[selectedDay] = dayLogs;
      return newLogs;
    });
  };

  const toggleSkipExercise = (exIdx) => {
    setLogs(prev => {
      const newLogs = { ...prev };
      const dayLogs = { ...newLogs[selectedDay] };
      const sets = dayLogs[exIdx];
      const allSkipped = sets.every(s => s.skipped);
      dayLogs[exIdx] = sets.map(s => ({
        ...s,
        skipped: !allSkipped,
        completed: !allSkipped ? false : s.completed,
      }));
      newLogs[selectedDay] = dayLogs;
      return newLogs;
    });
  };

  const toggleSkipDay = () => {
    setSkippedDays({ ...skippedDays, [selectedDay]: !isDaySkipped });
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput;
    setChatInput('');

    // Try sending via WebSocket
    const sent = sendWebSocketMessage(user.email, input);
    if (!sent) {
      // Fallback to REST POST
      const msgDto = await addChatMessage(user.email, input);
      if (msgDto) {
        setMessages(prev => [...prev, msgDto]);
      }
    }
  };

  // Identify today's weekday in Spanish (matches the routine keys "Lunes", "Martes", …).
  const todayWeekday = (() => {
    const idx = new Date().getDay(); // Sun=0..Sat=6
    return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][idx];
  })();
  // A "pending past day" is one whose key appears earlier in the routine order than today AND
  // whose logs have no completed sets recorded yet. We only highlight it when the user has
  // navigated to it and is not in the middle of training another day.
  const dayLogs = (logs && selectedDay) ? logs[selectedDay] : null;
// Añadimos (dayLogs || {}) para que nunca falle
  const dayHasProgress = dayLogs ? Object.values(dayLogs || {}).flat().some(s => s.completed || s.skipped) : false;
  const isPastPendingDay = !!(selectedDay && selectedDay !== todayWeekday
    && !isWorkoutLocked && !isWorkoutStarted && !dayHasProgress);

  const moveRoutineToToday = async () => {
    if (!clientData?.routine || selectedDay === todayWeekday) return;
    const sourceTab = selectedDay;
    const targetTab = todayWeekday;
    const incomingRoutine = loadedRoutineByTab[sourceTab] || sourceTab;
    const displacedRoutineRaw = loadedRoutineByTab[targetTab] || targetTab;
    const displacedRoutine = displacedRoutineRaw === incomingRoutine ? sourceTab : displacedRoutineRaw;
    const hasDisplacedRoutine = clientData.routine[displacedRoutine]
      && clientData.routine[displacedRoutine].length > 0
      && !trainedTemplateDays.has(displacedRoutine);

    if (hasDisplacedRoutine) {
      const ok = await dialog.confirm(
        `Hoy (${todayWeekday}) ya tiene una rutina con ${clientData.routine[displacedRoutine].length} ejercicio(s). ¿Quieres intercambiar los entrenos para hacer el de "${incomingRoutine}" hoy y mover el de "${displacedRoutine}" a "${sourceTab}"?`,
        { title: 'Intercambiar entrenos', confirmText: 'Sí, intercambiar', cancelText: 'Cancelar' }
      );
      if (!ok) return;
    } else {
      const ok = await dialog.confirm(
        `Vamos a cargar los ejercicios de "${incomingRoutine}" para hacerlos hoy (${todayWeekday}).`,
        { title: 'Hacer hoy', confirmText: 'Empezar entreno', cancelText: 'Cancelar' }
      );
      if (!ok) return;
    }

    // 1. Prepare logs, comments, video links for targetTab (loading incomingRoutine)
    const targetData = initializeLogsForTab(incomingRoutine, targetTab, clientData, logs, comments, videoLinks);

    let finalLogs = { ...logs, [targetTab]: targetData.logs };
    let finalComments = targetData.comments;
    let finalVideoLinks = targetData.videoLinks;

    // 2. Load displacedRoutine on sourceTab (swap!)
    if (hasDisplacedRoutine) {
      const sourceData = initializeLogsForTab(displacedRoutine, sourceTab, clientData, finalLogs, finalComments, finalVideoLinks);
      finalLogs[sourceTab] = sourceData.logs;
      finalComments = sourceData.comments;
      finalVideoLinks = sourceData.videoLinks;
    } else {
      finalLogs[sourceTab] = {};
    }

    setComments(finalComments);
    setVideoLinks(finalVideoLinks);
    setLogs(finalLogs);

    setLoadedRoutineByTab(prev => {
      const copy = { ...prev };
      // Remove old references to incomingRoutine and displacedRoutine
      Object.keys(copy).forEach(k => {
        if (copy[k] === incomingRoutine || copy[k] === displacedRoutine) {
          delete copy[k];
        }
      });
      // Assign new mappings if they actually move
      if (targetTab !== incomingRoutine) {
        copy[targetTab] = incomingRoutine;
      } else {
        delete copy[targetTab];
      }
      if (hasDisplacedRoutine) {
        if (sourceTab !== displacedRoutine) {
          copy[sourceTab] = displacedRoutine;
        } else {
          delete copy[sourceTab];
        }
      }
      return copy;
    });

    setOverrideConsumed(prev => {
      const n = new Set(prev);
      if (targetTab !== incomingRoutine) {
        n.add(targetTab);
      } else {
        n.delete(targetTab);
      }
      if (hasDisplacedRoutine) {
        if (sourceTab !== displacedRoutine) {
          n.add(sourceTab);
        } else {
          n.delete(sourceTab);
        }
      }
      return n;
    });

    setWorkoutSeconds(0);
    setRestSeconds(0);
    setWorkoutSummary(null);
    setActiveSessionId(null);
    setIsWorkoutLocked(false);
    setHasFinishedSession(false);

    setSelectedDay(targetTab);

    if (hasDisplacedRoutine) {
      dialog.toast(`Rutinas intercambiadas: "${incomingRoutine}" en ${targetTab} y "${displacedRoutine}" en ${sourceTab}`, { variant: 'success' });
    } else {
      dialog.toast(`Rutina de ${incomingRoutine} cargada para hoy (${targetTab})`, { variant: 'success' });
    }
  };

  const progress = isDaySkipped ? 100 : (currentLogs && Object.values(currentLogs).flat().length > 0 ? (Math.round((Object.values(currentLogs).flat().filter(s => s.completed || s.skipped).length / Object.values(currentLogs).flat().length) * 100) || 0) : 0);
  // When the workout is locked (finished/restored from history) the header must trust the
  // summary computed at finish time, not the freshly initialised logs container — otherwise
  // the header shows 0% right after F5 while the bottom summary still reads e.g. 85%.
  const displayProgress = (isWorkoutLocked && workoutSummary && workoutSummary.percentage != null)
    ? workoutSummary.percentage
    : progress;

  const handleFinishWorkout = async () => {
    if (!currentLogs) return;
    const totalSets = Object.values(currentLogs || {}).flat().length;
    const completedSets = Object.values(currentLogs || {}).flat().filter(s => s.completed);

    if (completedSets.length === 0) {
      // Offer two ways out: keep going or wipe the session locally (no backend call so we do
      // not pollute history with an empty workout).
      const cancel = await dialog.confirm(
        "No has completado ninguna serie. ¿Quieres cancelar este entrenamiento y empezarlo desde cero más tarde?",
        { title: 'Entrenamiento incompleto', confirmText: 'Cancelar entreno', cancelText: 'Seguir entrenando', danger: true }
      );
      if (cancel) {
        const sure = await dialog.confirm(
          "¿Estás seguro? Se descartarán los datos no guardados de esta sesión.",
          { title: 'Cancelar entrenamiento', confirmText: 'Sí, cancelar', cancelText: 'No', danger: true }
        );
        if (sure) {
          // Reset local state only — no backend call.
          setIsWorkoutStarted(false);
          setIsWorkoutLocked(false);
          setHasFinishedSession(false);
          setIsFinished(false);
          setWorkoutSeconds(0);
          setRestSeconds(0);
          setWorkoutSummary(null);
          setActiveSessionId(null);
          // Drop the "completed today" mark for this day if it had been set.
          setTodaySessionsByDay(prev => {
            const copy = { ...prev };
            delete copy[selectedDay];
            return copy;
          });
          // Reinitialise the day's logs so all sets come back empty.
          if (clientData?.routine) {
            const fresh = {};
            Object.keys(clientData.routine).filter(day => !day.endsWith('_notes')).forEach(day => {
              fresh[day] = {};
              const sourceDay = loadedRoutineByTab[day] || day;
              const exercises = clientData.routine[sourceDay] || [];
              const sorted = [...exercises].sort((a, b) => (a.isOptional === b.isOptional ? 0 : a.isOptional ? 1 : -1));
              sorted.forEach((ex, exIdx) => {
                const sets = normalizeExerciseSets(ex);
                fresh[day][exIdx] = sets.map(s => ({
                  weight: '',
                  reps: s.reps || '10',
                  completed: false,
                  skipped: false,
                  exerciseName: ex.name,
                  intensity: s.intensity || '',
                  notes: s.notes || ''
                }));
              });
            });
            setLogs(fresh);
          }
          dialog.toast('Entrenamiento cancelado', { variant: 'info' });
        }
      }
      return;
    }

    const totalVolume = completedSets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
    const completionPercentage = Math.round((completedSets.length / totalSets) * 100);

    setWorkoutSummary({
      time: formatTime(workoutSeconds),
      volume: totalVolume,
      sets: completedSets.length,
      percentage: completionPercentage
    });

    try {
      const token = localStorage.getItem('token');
      const url = activeSessionId ? `${API_BASE_URL}/api/workouts/update/${activeSessionId}` : `${API_BASE_URL}/api/workouts/finish`;
      const method = activeSessionId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          // Guardamos la sesión bajo el nombre original de la rutina para que conste
          // como completada y no se sugiera repetirla en la pestaña de origen.
          dayName: loadedRoutineHere || selectedDay,
          durationSeconds: workoutSeconds,
          totalVolume: totalVolume,
          completedSets: completedSets.length,
          completionPercentage: completionPercentage,
          // Guardamos también el slot de ejecución real en el JSON para que el UI pueda
          // anclarlo firmemente a esa pestaña (e.g. Jueves) al cargar el historial.
          logsJson: JSON.stringify({ 
            ...logs, 
            [(loadedRoutineHere || selectedDay)]: logs[selectedDay],
            _executionSlot: selectedDay 
          }),
          commentsJson: JSON.stringify(comments),
          videoLinksJson: JSON.stringify(videoLinks),
          stress: workoutEval.stress,
          fatigue: workoutEval.fatigue,
          motivation: workoutEval.motivation,
          sleepHours: workoutEval.sleepHours,
          digestions: workoutEval.digestions
        })
      });

      if (!activeSessionId && res.ok) {
        const newId = await res.text();
        setActiveSessionId(newId.replace(/"/g, ''));
      }
    } catch (e) {
      console.error("Error saving workout to backend", e);
    }

    setHasFinishedSession(true);
    setIsWorkoutStarted(false);
    setIsWorkoutLocked(true);
    setIsFinished(true);
    setHasResumableWorkout(false);
    setResumableDayName(null);

    const realDayName = loadedRoutineHere || selectedDay;
    // Registramos este día como completado en la pestaña actual (selectedDay)
    // para que la vista bloqueada se mantenga en el slot que el usuario eligió.
    setTodaySessionsByDay(prev => ({
      ...prev,
      [selectedDay]: {
        id: activeSessionId,
        dayName: realDayName,
        sessionDate: new Date().toISOString().split('T')[0],
        durationSeconds: workoutSeconds,
        totalVolume,
        completedSets: completedSets.length,
        completionPercentage,
        logsJson: JSON.stringify({ 
           ...logs, 
           [realDayName]: logs[selectedDay],
           _executionSlot: selectedDay
        }),
        commentsJson: JSON.stringify(comments),
        videoLinksJson: JSON.stringify(videoLinks),
      }
    }));
    // Al registrar el entreno en este slot, eliminamos los overrides temporales.
    setLoadedRoutineByTab(prev => {
      if (!prev[selectedDay]) return prev;
      const copy = { ...prev };
      delete copy[selectedDay];
      return copy;
    });
    setOverrideConsumed(prev => {
      if (!prev.has(selectedDay)) return prev;
      const copy = new Set(prev);
      copy.delete(selectedDay);
      return copy;
    });
    // Mantenemos al usuario en la misma pestaña donde acaba de terminar.
    setSelectedDay(selectedDay);
  };

  const updateBackendSession = async (currentLogsToSave, currentCommentsToSave, currentLinksToSave) => {
    if (!activeSessionId) return;
    try {
      const totalSets = Object.values(currentLogsToSave[selectedDay] || currentLogsToSave).flat().length;
      const completedSets = Object.values(currentLogsToSave[selectedDay] || currentLogsToSave).flat().filter(s => s.completed);
      const totalVolume = completedSets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0), 0);
      const completionPercentage = Math.round((completedSets.length / totalSets) * 100) || 0;

      const token = localStorage.getItem('token');
      await fetch(`${API_BASE_URL}/api/workouts/update/${activeSessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          dayName: loadedRoutineHere || selectedDay,
          durationSeconds: workoutSeconds,
          totalVolume: totalVolume,
          completedSets: completedSets.length,
          completionPercentage: completionPercentage,
          logsJson: JSON.stringify({
            ...currentLogsToSave,
            [(loadedRoutineHere || selectedDay)]: currentLogsToSave[selectedDay],
            _executionSlot: selectedDay
          }),
          commentsJson: JSON.stringify(currentCommentsToSave),
          videoLinksJson: JSON.stringify(currentLinksToSave)
        })
      });

      setWorkoutSummary(prev => ({
        ...prev,
        volume: totalVolume,
        sets: completedSets.length,
        percentage: completionPercentage
      }));
    } catch (e) {
      console.error("Error updating workout", e);
    }
  };

  const handleSaveProgress = async (e) => {
    if (e) e.preventDefault();
    if (!logForm.logDate) {
      await dialog.alert("Selecciona una fecha.", { title: 'Faltan datos' });
      return;
    }
    const anyMeasure = ['weight','waist','hip','neck','biceps','leg','chest','calf','forearm','back']
      .some(k => logForm[k] && logForm[k].toString().trim() !== '');
    if (!anyMeasure) {
      await dialog.alert("Introduce al menos una medida.", { title: 'Faltan datos' });
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_BASE_URL}/api/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          logDate: logForm.logDate,
          weight: logForm.weight ? parseFloat(logForm.weight) : null,
          waist: logForm.waist ? parseFloat(logForm.waist) : null,
          hip: logForm.hip ? parseFloat(logForm.hip) : null,
          neck: logForm.neck ? parseFloat(logForm.neck) : null,
          biceps: logForm.biceps ? parseFloat(logForm.biceps) : null,
          leg: logForm.leg ? parseFloat(logForm.leg) : null,
          chest: logForm.chest ? parseFloat(logForm.chest) : null,
          calf: logForm.calf ? parseFloat(logForm.calf) : null,
          forearm: logForm.forearm ? parseFloat(logForm.forearm) : null,
          back: logForm.back ? parseFloat(logForm.back) : null
        })
      });
      if (response.ok) {
        dialog.toast("Medición registrada con éxito", { variant: 'success' });
        setShowLogModal(false);
        setLogForm({
          logDate: new Date().toISOString().split('T')[0],
          weight: '',
          waist: '',
          hip: '',
          neck: '',
          biceps: '',
          leg: ''
        });
        fetchProgressHistory();
      } else {
        dialog.toast("Error al registrar la medición", { variant: 'error' });
      }
    } catch (err) {
      console.error(err);
      dialog.toast("Error de red", { variant: 'error' });
    }
  };

  const handleStartWorkout = async () => {
    if (hasFinishedSession) {
      const ok = await dialog.confirm("Ya has completado un entrenamiento en esta sesión. ¿Volver a empezar?", { confirmText: 'Sí, reiniciar' });
      if (!ok) {
        return;
      }
      setHasFinishedSession(false);
      setActiveSessionId(null);
    }
    // Always reset the timer when a workout starts so leftover seconds (e.g. from viewing a
    // historic session in this same tab) never bleed into the new session.
    setWorkoutSeconds(0);
    setRestSeconds(0);
    setIsWorkoutStarted(true);
  };

  const downloadRoutinePDF = () => {
    // We build the HTML in memory and ship it through a Blob URL instead of opening a blank
    // pop-up and writing into it. Mobile browsers (iOS Safari, Chrome Android) block popups
    // that come from an empty about:blank context and silently swallow window.print() called
    // from such a context, which made the desktop flow look "stuck" on phones.
    const isMobile = typeof navigator !== 'undefined'
      && /Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(navigator.userAgent);

    let daysHtml = '';
    Object.keys(clientData.routine).forEach(day => {
      const exercises = clientData.routine[day] || [];
      if (exercises.length === 0) return;

      let exercisesRows = '';
      exercises.forEach(ex => {
        exercisesRows += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-weight: bold;">
              ${ex.name} ${ex.isOptional ? '<span style="font-size: 0.75rem; color: #ffaa00; font-weight: normal; margin-left: 5px;">(Opcional)</span>' : ''}
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${ex.reps || '—'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; color: #555;">${ex.intensity || '—'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${ex.expectedWeight ? ex.expectedWeight + ' kg' : '—'}</td>
            <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: left; color: #666; font-style: italic; font-size: 0.85rem;">${ex.notes || '—'}</td>
          </tr>
        `;
      });

      daysHtml += `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h3 style="font-size: 1.25rem; color: #111; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 12px; text-transform: uppercase;">${day}</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 0.9rem;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 35%;">Ejercicio</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; width: 15%;">Series x Reps</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; width: 15%;">Intensidad</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd; width: 15%;">Peso Esp.</th>
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd; width: 20%;">Notas</th>
              </tr>
            </thead>
            <tbody>
              ${exercisesRows}
            </tbody>
          </table>
        </div>
      `;
    });

    const isBasic = pdfStyle === 'basic';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Plan de Entrenamiento - ${clientData.name}</title>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: ${isBasic ? 'sans-serif' : "'Outfit', -apple-system, sans-serif"};
            color: #333;
            line-height: 1.4;
            padding: 30px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: ${isBasic ? '1px solid #333' : '3px double #333'};
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            font-size: 2.2rem;
            letter-spacing: -1px;
            text-transform: uppercase;
          }
          .header p {
            margin: 5px 0 0;
            color: #666;
            font-size: 0.95rem;
          }
          .meta-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            background: ${isBasic ? '#fff' : '#f9f9f9'};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            font-size: 0.85rem;
            border: 1px solid #eee;
          }
          .meta-item strong {
            display: block;
            color: #000;
            text-transform: uppercase;
            font-size: 0.75rem;
            margin-bottom: 3px;
          }
          @media print {
            body {
              padding: 0;
            }
            @page {
              margin: 1.5cm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Plan de Entrenamiento Personalizado</h1>
          <p>PRVT FITNESS Premium Coaching</p>
        </div>
        
        <div class="meta-info">
          <div class="meta-item">
            <strong>Cliente</strong>
            ${clientData.name}
          </div>
          <div class="meta-item">
            <strong>Objetivo de Pesos</strong>
            ${clientData.progressionStrategy || 'Sobrecarga Progresiva'}
          </div>
          <div class="meta-item">
            <strong>Frecuencia</strong>
            Revisión ${clientData.reviewFrequency || 'Semanal'}
          </div>
        </div>

        ${daysHtml || '<p style="text-align: center; color: #666;">No hay ejercicios programados en la rutina actual.</p>'}

        <div style="margin-top: 50px; text-align: center; font-size: 0.8rem; color: #888; border-top: 1px solid #eee; padding-top: 20px;">
          PRVTFITNESS &copy; ${new Date().getFullYear()} &bull; Todos los derechos reservados.
        </div>

        <script>
          // On desktop fire the print dialog automatically; on mobile, just render the page
          // so the user can hit Share → Print / Save as PDF from the native menu.
          (function () {
            try {
              var ua = navigator.userAgent || '';
              var mobile = /Android|iPhone|iPad|iPod|IEMobile|Mobile/i.test(ua);
              if (!mobile) {
                window.addEventListener('load', function () {
                  setTimeout(function () { try { window.print(); } catch (e) { console.error("Error capturado:", e); } }, 200);
                });
              }
            } catch (e) { /* no-op */ }
          })();
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Try to open in a new tab (desktop). If the popup is blocked or the platform prefers
    // same-tab navigation (mobile Safari for blob URLs without a user gesture chain), fall
    // back to navigating the current tab. The user can then use the browser's native Share /
    // Print → Save as PDF menu — which is the reliable mobile path.
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      if (isMobile) {
        // On mobile, swap the location so the HTML actually renders. The user comes back to
        // the app with the back button (which is already captured to stay inside the app).
        window.location.href = url;
      } else {
        // Desktop with blocked popups: download the HTML so the user can open it manually.
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rutina_${(clientData?.name || 'cliente').replace(/\s+/g, '_')}.html`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }

    // Revoke after a generous delay so the new tab has time to fetch the blob.
    // eslint-disable-next-line no-empty
    setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { console.error("Error capturado:", e); } }, 60000);
  };

  const fmtLogDate = (l) => {
    if (!l.logDate) return '';
    const parts = l.logDate.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : l.logDate;
  };

  // Full history (used by the weight evolution chart).
  const progressDates = progressHistory.map(fmtLogDate);
  const weightHistory = progressHistory.length > 0 ? progressHistory.map(l => l.weight || 0) : (clientData?.weightHistory || [0]);

  // A weight-only quick entry must NOT create a new column in the measurement comparison, so the
  // comparison table and body-measurement charts only use days that recorded a body measurement.

  const measurementLogs = progressHistory.filter(l =>
      [l.waist, l.hip, l.neck, l.biceps, l.leg, l.chest, l.calf, l.forearm, l.back].some(v => v !== null && v !== undefined)
  );

  // 2. Extraemos las fechas y los historiales
  const measurementDates = measurementLogs.map(fmtLogDate);
  const cmpWeight = measurementLogs.length > 0 ? measurementLogs.map(l => l.weight || 0) : [];
  const waistHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.waist || 0) : [];
  const caderaHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.hip || 0) : [];
  const cuelloHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.neck || 0) : [];
  const bicepsHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.biceps || 0) : [];
  const piernaHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.leg || 0) : [];
  const pechoHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.chest || 0) : [];
  const gemeloHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.calf || 0) : [];
  const antebrazoHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.forearm || 0) : [];
  const espaldaHistory = measurementLogs.length > 0 ? measurementLogs.map(l => l.back || 0) : [];

  // 3. Datos de volumen y adherencia
  const volumeHistory = clientData?.volumeHistory || [];
  const adherenceHistory = clientData?.adherenceHistory || [];

  const renderChart = (type = chartType) => {
    let history = [];
    let color = 'var(--accent-primary)';
    let unit = '';
    let title = '';

    if (type === 'weight') {
      history = weightHistory;
      unit = 'kg';
      title = 'Evolución del Peso Corporal';
    } else if (type === 'adherence') {
      history = adherenceHistory;
      unit = '%';
      title = 'Cumplimiento de Rutina';
      color = '#00f2fe'; // Azul Neón
    } else if (type === 'waist') {
      history = waistHistory;
      unit = 'cm';
      title = 'Perímetro de Cintura';
      color = '#ff0844'; // Rojo Neón
    } else if (type === 'cadera') {
      history = caderaHistory;
      unit = 'cm';
      title = 'Perímetro de Cadera';
      color = '#bb00ff'; // Morado Neón
    } else if (type === 'cuello') {
      history = cuelloHistory;
      unit = 'cm';
      title = 'Perímetro de Cuello';
      color = '#00ff88'; // Verde Neón
    } else if (type === 'biceps') {
      history = bicepsHistory;
      unit = 'cm';
      title = 'Perímetro de Bíceps';
      color = '#ff00aa'; // Rosa Neón
    } else if (type === 'pierna') {
      history = piernaHistory;
      unit = 'cm';
      title = 'Perímetro de Pierna';
      color = '#00d2ff'; // Cian Oscuro Neón
    } else if (type === 'volume') {
      history = volumeHistory;
      unit = 'kg';
      title = 'Volumen Total Levantado';
      color = '#ffaa00'; // Naranja
    }

    if (!history || history.length === 0 || history[0] === 0) return <p style={{ color: 'var(--text-muted)' }}>No hay datos suficientes para esta métrica.</p>;
    if (history.length === 1) return <p style={{ color: 'var(--text-muted)' }}>Dato actual: {history[0]}{unit}. Esperando más semanas para trazar gráfica.</p>;

    const min = type === 'volume' ? Math.floor(Math.min(...history) - 500) : Math.floor(Math.min(...history) - 2);
    const max = type === 'volume' ? Math.ceil(Math.max(...history) + 500) : Math.ceil(Math.max(...history) + 2);
    const range = max - min || 1;

    const svgWidth = 600;
    const svgHeight = 220;
    const paddingY = 40;
    const paddingX = 40;

    const getX = (index) => paddingX + (index / (history.length - 1)) * (svgWidth - paddingX * 2);
    const getY = (val) => svgHeight - paddingY - ((val - min) / range) * (svgHeight - paddingY * 2);

    const points = history.map((val, i) => `${getX(i)},${getY(val)}`).join(' ');
    const areaPath = `M ${getX(0)},${svgHeight - paddingY + 20} L ${points.split(' ').join(' L ')} L ${getX(history.length - 1)},${svgHeight - paddingY + 20} Z`;

    return (
      <div className="fade-in" style={{ marginTop: '30px' }}>
        <h4 style={{ color: 'white', textAlign: 'center', marginBottom: '25px', fontWeight: '800', fontSize: '1.4rem' }}>{title}</h4>
        <div style={{ background: 'rgba(10,10,12,0.8)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '30px 20px 10px', position: 'relative', overflowX: 'visible', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`grad-client-${type}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={color} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(factor => {
               const y = svgHeight - paddingY - factor * (svgHeight - paddingY * 2);
               return <line key={factor} x1={paddingX - 10} y1={y} x2={svgWidth - paddingX + 10} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
            })}

            {/* Area and Line */}
            <path d={areaPath} fill={`url(#grad-client-${type})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0px 8px 12px ${color}40)` }} />

            {/* Points and Labels */}
            {history.map((val, index) => {
              let label = `Mes ${index + 1}`;
              const datesForType = type === 'weight' ? progressDates : measurementDates;
              if (type !== 'adherence' && type !== 'volume' && datesForType[index]) {
                label = datesForType[index];
              } else if ((type === 'adherence' || type === 'volume') && clientData?.reviewFrequency) {
                const labelType = clientData.reviewFrequency.toLowerCase().includes('semana') ? 'Semana' : 'Mes';
                label = `${labelType} ${index + 1}`;
              }
              return (
                <g key={index} style={{ transition: 'all 0.3s' }}>
                  <circle cx={getX(index)} cy={getY(val)} r="8" fill="#0a0a0c" stroke={color} strokeWidth="3" style={{ cursor: 'pointer' }} />
                  <text x={getX(index)} y={getY(val) - 20} fill={color} fontSize="16" fontWeight="800" textAnchor="middle" fontFamily="Outfit" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{val}{unit}</text>
                  <text x={getX(index)} y={svgHeight - 5} fill="var(--text-muted)" fontSize="13" fontWeight="600" textAnchor="middle" textTransform="uppercase" fontFamily="Outfit" letterSpacing="1px">{label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  if (isLoading || !clientData) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
          <div style={{ color: 'var(--accent-primary)', fontSize: '2rem' }}>⏳</div>
          <h3 style={{ color: '#fff', fontFamily: 'Outfit' }}>Cargando tu panel...</h3>
        </div>
    );
  }

  if (isError) {
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '15px' }}>
          <div style={{ color: '#f44336', fontSize: '2rem' }}>⚠️</div>
          <h3 style={{ color: '#fff', fontFamily: 'Outfit' }}>Error al cargar tu panel.</h3>
          <button onClick={() => fetchProfile()} className="primary-btn">Reintentar</button>
        </div>
    );
  }

  return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '90px' }}>

      {/* Header Cliente */}
      <header className="glass-panel no-print mobile-header" style={{ position: 'sticky', top: '10px', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', margin: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(15px)' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', letterSpacing: '-0.5px' }}>
            PRVT<span style={{ color: 'var(--accent-primary)' }}>FITNESS</span>
          </h2>
        </div>
        <div className="mobile-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isWorkoutStarted && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {restSeconds > 0 && (
                <div style={{ background: 'rgba(255, 170, 0, 0.2)', color: '#ffaa00', padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  ⏳ {formatTime(restSeconds)}
                </div>
              )}
              <div style={{ background: 'rgba(0, 230, 118, 0.2)', color: '#00e676', padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                ⏱️ {formatTime(workoutSeconds)}
              </div>
            </div>
          )}
          <button
              onClick={() => setShowProfile(true)}
              title="Mi perfil"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', textAlign: 'right', padding: 0 }}
          >
            <p style={{ fontWeight: '600', fontSize: '0.9rem', textDecoration: 'underline dotted', textUnderlineOffset: '3px' }}>
              {user?.name ? user.name.split(' ')[0] : 'Perfil'}
            </p>
          </button>
          <button onClick={() => { setShowChatModal(true); setUnreadMessages(0); }} style={{ position: 'relative', background: 'var(--accent-primary)', border: 'none', color: '#000', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 0 10px rgba(224,248,0,0.3)' }}>
            💬
            {unreadMessages > 0 && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: '#ff4500', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold',
                borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 5px rgba(0,0,0,0.5)'
              }}>
                {unreadMessages}
              </span>
            )}
          </button>
          {!isWorkoutStarted && (
            <button onClick={onLogout} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-main)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'Outfit', fontWeight: '600', fontSize: '0.8rem' }}>Salir</button>
          )}
        </div>
      </header>

      {/* Notificación Evaluación Recibida */}
      {clientData?.lastCompletedReview && !showEvaluationModal && !hasAcceptedEvaluation && (
        <div
          onClick={() => setShowEvaluationModal(true)}
          style={{
            margin: '20px', padding: '15px', background: 'rgba(224, 248, 0, 0.15)', border: '1px solid var(--accent-primary)',
            borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(224, 248, 0, 0.1)'
          }}
        >
          <div>
            <h4 style={{ color: 'var(--accent-primary)', margin: '0 0 5px 0' }}>🎉 ¡Evaluación de Revisión Recibida!</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)' }}>Tu entrenador ha analizado tus fotos y medidas. Haz clic para ver el feedback.</p>
          </div>
          <span style={{ fontSize: '1.5rem' }}>👉</span>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, padding: '0 20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {clientData && clientData.onboardingCompleted === false ? (
          <InitialQuestionnaire onComplete={handleCompleteOnboarding} />
        ) : (
          <div className="fade-in">

            {/* Pestaña: ENTRENAR */}
            {activeTab === 'workout' && (
              !clientData?.hasRoutine ? (
                <div className="glass-panel fade-in" style={{ padding: '60px 20px', textAlign: 'center', marginTop: '20px', borderTop: '4px solid var(--accent-primary)' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🏋️‍♂️</div>
                  <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px', color: '#fff' }}>Sin Rutina Asignada</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px auto', lineHeight: '1.6' }}>
                    Tu entrenador aún está preparando tu plan de entrenamiento personalizado. ¡Te notificaremos tan pronto como esté listo!
                  </p>
                  <div style={{ display: 'inline-block', padding: '10px 20px', background: 'rgba(224, 248, 0, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '20px', fontSize: '0.9rem', fontWeight: 'bold' }}>
                    Frecuencia de revisión: {clientData?.reviewFrequency || 'Semanal'}
                  </div>
                </div>
              ) : (
                <div>
                  
                  {clientData?.nextRoutineJson && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                      <button
                        onClick={() => setViewingNextRoutine(false)}
                        style={{
                          flex: 1, padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                          background: !viewingNextRoutine ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                          color: !viewingNextRoutine ? '#000' : 'var(--text-muted)',
                          border: !viewingNextRoutine ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)'
                        }}
                      >
                        💪 Rutina Actual
                      </button>
                      <button
                        onClick={() => setViewingNextRoutine(true)}
                        style={{
                          flex: 1, padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                          background: viewingNextRoutine ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                          color: viewingNextRoutine ? '#000' : 'var(--text-muted)',
                          border: viewingNextRoutine ? '1px solid var(--accent-primary)' : '1px solid var(--border-light)'
                        }}
                      >
                        📅 Siguiente Rutina
                      </button>
                    </div>
                  )}

                  {/* Estrategia asignada y botón de tabla */}
                 <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                   <div style={{ flex: 1, minWidth: '200px', background: 'rgba(224, 248, 0, 0.05)', border: '1px dashed var(--accent-primary)', padding: '10px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 0 }}>
                     <span style={{ fontSize: '1.5rem' }}>🎯</span>
                     <div>
                       <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Objetivo de Pesos Semanal</div>
                       <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.95rem' }}>{clientData.progressionStrategy || user?.progressionStrategy || "Sobrecarga Progresiva (Subir peso)"}</div>
                     </div>
                   </div>
                   <button
                     onClick={() => setShowRoutineTable(true)}
                     style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', color: '#fff', padding: '10px 18px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                     onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                     onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                   >
                     <span>📋</span> Ver Tabla / PDF
                   </button>
                 </div>

                {/* Week Navigation + Selector de Días */}
                {(() => {
                  // Compute the Monday of the displayed week
                  const now = new Date();
                  const currentDow = (now.getDay() + 6) % 7; // 0=Mon
                  const displayedMonday = new Date(now);
                  displayedMonday.setHours(0, 0, 0, 0);
                  displayedMonday.setDate(now.getDate() - currentDow + weekOffset * 7);
                  const displayedSunday = new Date(displayedMonday);
                  displayedSunday.setDate(displayedMonday.getDate() + 6);

                  // Parse routine date limits
                  const parseLD = (s) => { if (!s) return null; const p = String(s).split('T')[0].split('-'); return p.length === 3 ? new Date(+p[0], +p[1]-1, +p[2]) : null; };
                  const rStart = parseLD(clientData?.routineStartDate);
                  const rEnd = parseLD(clientData?.routineEndDate);

                  // Check if prev/next is allowed
                  const prevMonday = new Date(displayedMonday); prevMonday.setDate(prevMonday.getDate() - 7);
                  const nextMonday = new Date(displayedMonday); nextMonday.setDate(nextMonday.getDate() + 7);
                  const canGoPrev = !rStart || prevMonday >= rStart || weekOffset > 0;
                  const canGoNext = !rEnd || nextMonday <= rEnd;
                  const isCurrentWeek = weekOffset === 0;

                  // Format date range for display
                  const fmtShort = (d) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  const weekLabel = isCurrentWeek ? 'Esta semana' : `${fmtShort(displayedMonday)} — ${fmtShort(displayedSunday)}`;

                  return (
                    <>
                      {(rStart || rEnd) && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                          <button
                            disabled={!canGoPrev}
                            onClick={() => setWeekOffset(w => w - 1)}
                            style={{
                              background: canGoPrev ? 'rgba(255,255,255,0.05)' : 'transparent',
                              border: `1px solid ${canGoPrev ? 'var(--border-light)' : 'rgba(255,255,255,0.03)'}`,
                              color: canGoPrev ? 'var(--text-main)' : 'rgba(255,255,255,0.15)',
                              padding: '8px 14px', borderRadius: '8px', cursor: canGoPrev ? 'pointer' : 'default',
                              fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                            }}
                          >◀</button>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                            <span style={{ color: isCurrentWeek ? 'var(--accent-primary)' : 'var(--text-main)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {weekLabel}
                            </span>
                            {!isCurrentWeek && (
                              <button
                                onClick={() => setWeekOffset(0)}
                                style={{ marginLeft: '10px', background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                              >Hoy</button>
                            )}
                          </div>
                          <button
                            disabled={!canGoNext}
                            onClick={() => setWeekOffset(w => w + 1)}
                            style={{
                              background: canGoNext ? 'rgba(255,255,255,0.05)' : 'transparent',
                              border: `1px solid ${canGoNext ? 'var(--border-light)' : 'rgba(255,255,255,0.03)'}`,
                              color: canGoNext ? 'var(--text-main)' : 'rgba(255,255,255,0.15)',
                              padding: '8px 14px', borderRadius: '8px', cursor: canGoNext ? 'pointer' : 'default',
                              fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s'
                            }}
                          >▶</button>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="scrollable-tabs" style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                    {routineDays.map(day => {
                      const isCompleted = trainedTemplateDays.has(day);
                      // Also consider a day "completed" if a session is stored under its tab key
                      const isTabCompleted = !!todaySessionsByDay[day];
                      const hasLoadedRoutine = !!loadedRoutineByTab[day];
                      const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                      const todayIdx = daysOfWeek.indexOf(todayWeekday);
                      const dayIdx = daysOfWeek.indexOf(day);
                      const isPast = dayIdx !== -1 && todayIdx !== -1 && dayIdx < todayIdx;
                      
                      let bgColor = 'transparent';
                      let borderColor = 'var(--border-light)';
                      let textColor = 'var(--text-muted)';
                      
                      if (selectedDay === day) {
                        bgColor = 'var(--accent-primary)';
                        borderColor = 'var(--accent-primary)';
                        textColor = '#000';
                      } else if (isCompleted || isTabCompleted) {
                        bgColor = 'rgba(0, 230, 118, 0.15)';
                        borderColor = 'rgba(0, 230, 118, 0.6)';
                        textColor = '#00e676';
                      } else if (hasLoadedRoutine) {
                        bgColor = 'rgba(0, 195, 255, 0.1)';
                        borderColor = 'rgba(0, 195, 255, 0.5)';
                        textColor = '#00c3ff';
                      } else if (isPast) {
                        bgColor = 'rgba(255, 0, 0, 0.1)';
                        borderColor = 'rgba(255, 0, 0, 0.5)';
                        textColor = '#ff4444';
                      }

                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDay(day)}
                          style={{
                            padding: '10px 20px', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s',
                            background: bgColor,
                            color: textColor,
                            border: `1px solid ${borderColor}`
                          }}
                        >
                          {day.split(' - ')[0]}
                        </button>
                      );
                    })}
                  </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{selectedDay}</h3>
                    {isPastPendingDay && activeWorkout.length > 0 && !isDayConsumedElsewhere && !targetTabActiveOrLocked && (
                      <button onClick={moveRoutineToToday}
                        style={{ marginTop: '6px', background: 'rgba(255,170,0,0.1)', border: '1px solid #ffaa00', color: '#ffaa00', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>
                        ⏩ Hacer hoy ({todayWeekday})
                      </button>
                    )}

                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {!isDaySkipped && (
                      <>
                        <span style={{ fontSize: '1.5rem', fontWeight: '800', color: displayProgress === 100 ? 'var(--accent-primary)' : '#fff' }}>{displayProgress}%</span>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Completado</p>
                      </>
                    )}
                  </div>
                </div>

                {!isDaySkipped && (
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginBottom: '30px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${displayProgress}%`, transition: 'width 0.4s ease-out', boxShadow: '0 0 10px var(--accent-primary)' }}></div>
                  </div>
                )}

                {/* Botón Saltar Día — solo si no se ha empezado, NO está bloqueado y NO se ha
                    consumido en otro día. */}
                {!isWorkoutStarted && !isWorkoutLocked && !isDayConsumedElsewhere && !isLoadedElsewhere && (
                  <button onClick={toggleSkipDay} style={{ width: '100%', padding: '15px', background: isDaySkipped ? 'rgba(255,255,255,0.05)' : 'rgba(255, 69, 0, 0.1)', border: isDaySkipped ? '1px solid var(--border-light)' : '1px solid #ff4500', color: isDaySkipped ? 'var(--text-main)' : '#ff4500', borderRadius: '8px', marginBottom: '25px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
                    {isDaySkipped ? '↩️ Deshacer Descanso y Entrenar' : '🛋️ Marcar día como Descanso'}
                  </button>
                )}

                {isDaySkipped ? (
                  <div className="glass-panel fade-in" style={{ padding: '40px 20px', textAlign: 'center', borderTop: '4px solid #00f2fe' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🔋</div>
                    <h3 style={{ color: '#00f2fe', marginBottom: '10px' }}>Día de Recuperación</h3>
                    <p style={{ color: 'var(--text-muted)' }}>El descanso es donde ocurre la magia. Aliméntate bien y prepárate para la próxima sesión. ¡Buen trabajo!</p>
                  </div>
                ) : isDayConsumedElsewhere ? (
                  // The plan for this weekday was already executed elsewhere this week.
                  <div className="glass-panel fade-in" style={{ padding: '32px 20px', textAlign: 'center', borderTop: '4px solid var(--accent-primary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔁</div>
                    <h3 style={{ marginBottom: '8px', color: '#fff' }}>Días intercambiados</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                      Hiciste la rutina de <strong>{selectedDay}</strong> el <strong>{displayExecutionName}</strong>. El detalle del entreno está en esa pestaña.
                    </p>
                    {displayExecutionName && (
                      <button onClick={() => setSelectedDay(displayExecutionName)} className="btn-primary" style={{ padding: '12px 22px', marginBottom: '20px' }}>
                        Ver entreno del {displayExecutionName}
                      </button>
                    )}

                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '20px', textAlign: 'left', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                      <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', textAlign: 'center' }}>Entrenos pendientes esta semana</h4>
                      {pendingOptions.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                          🎉 No te queda ningún entreno por hacer esta semana.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {pendingOptions.map(opt => (
                            <button key={opt.originalDay} onClick={() => pickPendingDay(opt.originalDay)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(224,248,0,0.05)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'left' }}>
                              <span>📋 Entreno del {opt.currentTab}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(clientData?.routine?.[opt.originalDay] || []).length} ejercicios →</span>
                            </button>
                          ))}
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px', textAlign: 'center' }}>
                            Se cargará aquí; el cambio se registra automáticamente al finalizar el entreno.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isLoadedElsewhere ? (
                  // The routine for this day was moved to another tab, but hasn't been finished yet.
                  <div className="glass-panel fade-in" style={{ padding: '32px 20px', textAlign: 'center', borderTop: '4px solid #ffaa00' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🔀</div>
                    <h3 style={{ marginBottom: '8px', color: '#fff' }}>Rutina movida</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                      Has movido la rutina de <strong>{selectedDay}</strong> al <strong>{targetTabWhereLoaded}</strong>. Ve a esa pestaña para entrenar.
                    </p>
                    <button onClick={() => setSelectedDay(targetTabWhereLoaded)} className="btn-primary" style={{ padding: '12px 22px', marginBottom: '20px' }}>
                      Ir al {targetTabWhereLoaded}
                    </button>
                    <br/>
                    <button onClick={() => {
                        setLoadedRoutineByTab(prev => {
                          const copy = {...prev};
                          delete copy[targetTabWhereLoaded];
                          return copy;
                        });
                    }} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Deshacer cambio
                    </button>
                  </div>
                ) : (!isWorkoutStarted && !isWorkoutLocked && activeWorkout.length === 0) ? (
                  // The day has no exercises in the routine AND it has not been trained — show
                  // a friendly empty state with the list of pending plans so the user can drag
                  // one here instead of seeing a misleading "EMPEZAR ENTRENAMIENTO" button.
                  <div className="glass-panel fade-in" style={{ padding: '32px 20px', textAlign: 'center', borderTop: '4px solid var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🗓️</div>
                    <h3 style={{ marginBottom: '8px', color: '#fff' }}>Día libre</h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 18px', lineHeight: 1.5 }}>
                      No tienes ningún entreno asignado para {selectedDay}. Puedes cargar aquí una rutina pendiente de la semana.
                    </p>
                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '20px', textAlign: 'left', maxWidth: '420px', marginLeft: 'auto', marginRight: 'auto' }}>
                      <h4 style={{ color: 'var(--accent-primary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', textAlign: 'center' }}>Entrenos pendientes esta semana</h4>
                      {pendingOptions.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                          🎉 No te queda ningún entreno por hacer esta semana.
                        </p>
                      ) : (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {pendingOptions.map(opt => (
                            <button key={opt.originalDay} onClick={() => pickPendingDay(opt.originalDay)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(224,248,0,0.05)', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem', textAlign: 'left' }}>
                              <span>📋 Entreno del {opt.currentTab}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(clientData?.routine?.[opt.originalDay] || []).length} ejercicios →</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="fade-in" style={{ display: 'grid', gap: '25px' }}>
                    
                    {activeDayNotes && (
                      <div style={{
                        background: 'rgba(224, 248, 0, 0.05)',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '10px',
                        lineHeight: '1.5',
                        fontSize: '0.9rem',
                        boxShadow: 'inset 0 0 10px rgba(224, 248, 0, 0.05)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                          <span>📋</span> Recomendaciones del Entrenador:
                        </div>
                        <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                          {activeDayNotes}
                        </div>
                      </div>
                    )}

                    {!isWorkoutStarted && !isWorkoutLocked ? (
                      <div>
                        {viewingNextRoutine ? (
                          <div style={{ background: 'rgba(224, 248, 0, 0.05)', border: '1px dashed var(--accent-primary)', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.2rem' }}>📅</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Esta es tu siguiente rutina programada. Todavía no está activa para entrenar.</span>
                          </div>
                        ) : (
                          <>
                            {hasResumableWorkout && resumableDayName === selectedDay && (
                              <div style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '1.4rem' }}>⏱️</span>
                                  <strong style={{ color: '#ffaa00' }}>Entrenamiento sin terminar</strong>
                                </div>
                                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '12px' }}>
                                  Tienes un entrenamiento empezado hoy ({selectedDay}). ¿Quieres continuarlo?
                                </p>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                  <button onClick={resumeWorkout} className="btn-primary" style={{ flex: 1, padding: '12px', fontWeight: 'bold' }}>▶ Reanudar</button>
                                  <button onClick={discardResumableWorkout} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Descartar</button>
                                </div>
                              </div>
                            )}
                            <div style={{ textAlign: 'center', padding: '20px 0 30px' }}>
                              <button
                                onClick={handleStartWorkout}
                                className="btn-primary"
                                style={{ padding: '25px 40px', fontSize: '1.5rem', borderRadius: '50px', boxShadow: '0 10px 30px rgba(224, 248, 0, 0.3)' }}
                              >
                                ▶ EMPEZAR ENTRENAMIENTO
                              </button>
                              <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Pulsa para activar el cronómetro y registrar marcas.</p>
                            </div>

                            {/* Previsualización solo-lectura de los ejercicios del día */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed var(--border-light)', borderRadius: '8px', padding: '12px 15px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.2rem' }}>👁️</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Vista previa del entrenamiento. Empieza el entrenamiento para registrar tus marcas.</span>
                            </div>
                          </>
                        )}
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {activeWorkout.map((ex, exIdx) => {
                            const previewSets = normalizeExerciseSets(ex);
                            const allSameReps = previewSets.length > 0 && previewSets.every(s => s.reps === previewSets[0].reps);
                            const allSameInt = previewSets.length > 0 && previewSets.every(s => (s.intensity || '') === (previewSets[0].intensity || ''));
                            return (
                            <div key={exIdx} className="glass-panel" style={{ padding: '16px', borderLeft: ex.isOptional ? '4px solid #ffaa00' : '4px solid var(--accent-primary)', opacity: 0.92 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{ex.name}</h4>
                                {ex.isOptional && <span style={{ background: 'rgba(255,170,0,0.1)', color: '#ffaa00', padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>OPCIONAL</span>}
                              </div>
                              {allSameReps ? (
                                <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                  <span>🎯 Objetivo: <strong style={{ color: '#fff' }}>{previewSets.length}x{previewSets[0].reps}</strong></span>
                                  {allSameInt && previewSets[0].intensity && <span>🔥 Int: <strong style={{ color: '#fff' }}>{previewSets[0].intensity}</strong></span>}
                                  {(ex.expectedWeight !== undefined && ex.expectedWeight !== null && ex.expectedWeight !== '') && (
                                    <span>🏋️ Peso esperado: <strong style={{ color: '#fff' }}>{ex.expectedWeight} kg</strong></span>
                                  )}
                                </div>
                              ) : (
                                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'grid', gap: '4px' }}>
                                  {previewSets.map((s, i) => (
                                    <span key={i}>🎯 Serie {i + 1}: <strong style={{ color: '#fff' }}>{s.reps} reps</strong>{s.intensity ? <> · 🔥 <strong style={{ color: '#fff' }}>{s.intensity}</strong></> : null}{s.notes ? <> · 📝 <em>{s.notes}</em></> : null}</span>
                                  ))}
                                  {(ex.expectedWeight !== undefined && ex.expectedWeight !== null && ex.expectedWeight !== '') && (
                                    <span>🏋️ Peso esperado: <strong style={{ color: '#fff' }}>{ex.expectedWeight} kg</strong></span>
                                  )}
                                </div>
                              )}
                              {ex.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic' }}>📝 {ex.notes}</p>}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        {isWorkoutLocked && (
                          <div style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px solid #ffaa00', padding: '15px', borderRadius: '8px', marginBottom: '10px', textAlign: 'center' }}>
                            <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '5px' }}>🔒 Entrenamiento Completado</span>
                            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '15px' }}>El tiempo ha sido registrado. Puedes modificar series individualmente usando el botón ✏️.</p>

                            {workoutSummary && (
                              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Tiempo</div>
                                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.time}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Volumen</div>
                                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.volume} kg</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Series</div>
                                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.sets}</div>
                                </div>
                                <div>
                                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Cumplido</div>
                                  <div style={{ color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>{workoutSummary.percentage}%</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeWorkout.map((exercise, exIdx) => {
                          const stateKey = `${selectedDay}_${exIdx}`;
                          // Mock history string for visual demonstration
                          // Mock removed: until a real "last session" lookup exists we'd rather
                          // show nothing than fake data. The expected weight, if any, surfaces
                          // as the placeholder of the kg input below.
                          const exerciseSets = normalizeExerciseSets(exercise);
                          const setsAreUniform = exerciseSets.length > 0
                            && exerciseSets.every(s => s.reps === exerciseSets[0].reps && (s.intensity || '') === (exerciseSets[0].intensity || ''));

                          return (
                            <div key={exIdx} className="glass-panel" style={{ padding: '20px', borderLeft: exercise.isOptional ? '4px solid #ffaa00' : '4px solid var(--accent-primary)', background: 'rgba(20, 20, 24, 0.8)' }}>
                              <div style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <h4 style={{ fontSize: '1.2rem', fontWeight: '800', lineHeight: '1.2', flex: 1, paddingRight: '15px', textDecoration: currentLogs && currentLogs[exIdx] && currentLogs[exIdx].every(s => s.skipped) ? 'line-through' : 'none', color: currentLogs && currentLogs[exIdx] && currentLogs[exIdx].every(s => s.skipped) ? 'var(--text-muted)' : '#fff' }}>{exercise.name}</h4>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button onClick={() => toggleSkipExercise(exIdx)} disabled={isWorkoutLocked} style={{ background: 'transparent', border: '1px solid var(--border-light)', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', cursor: isWorkoutLocked ? 'not-allowed' : 'pointer' }}>🚫 OMITIR</button>
                                    {exercise.isOptional && <span style={{ background: 'rgba(255, 170, 0, 0.1)', color: '#ffaa00', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>OPCIONAL</span>}
                                  </div>
                                </div>
                                {setsAreUniform ? (
                                  <div style={{ display: 'flex', gap: '15px', marginTop: '10px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🎯 Objetivo: <strong style={{ color: '#fff' }}>{exerciseSets.length}x{exerciseSets[0].reps}</strong></span>
                                    {exerciseSets[0].intensity && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>🔥 Int: <strong style={{ color: '#fff' }}>{exerciseSets[0].intensity}</strong></span>}
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '10px', display: 'grid', gap: '4px' }}>
                                    {exerciseSets.map((s, i) => (
                                      <span key={i} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🎯 Serie {i + 1}: <strong style={{ color: '#fff' }}>{s.reps} reps</strong>{s.intensity ? <> · 🔥 <strong style={{ color: '#fff' }}>{s.intensity}</strong></> : null}{s.notes ? <> · 📝 <em>{s.notes}</em></> : null}</span>
                                    ))}
                                  </div>
                                )}
                                {exercise.notes && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>📝 {exercise.notes}</p>}
                              </div>

                              {/* Tracker */}
                              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden', marginBottom: '15px' }}>
                                <div className="tracker-grid" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 100px', gap: '10px', padding: '10px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  <div style={{ textAlign: 'center' }}>Set</div><div style={{ textAlign: 'center' }}>kg</div><div style={{ textAlign: 'center' }}>Reps</div><div style={{ textAlign: 'center' }}>Acciones</div>
                                </div>
                                {currentLogs && currentLogs[exIdx] && currentLogs[exIdx].map((set, setIdx) => {
                                  const isEditing = editingSets[`${exIdx}-${setIdx}`];
                                  const inputDisabled = (!isEditing && (set.completed || set.skipped || isWorkoutLocked));

                                  return (
                                    <div key={setIdx} className="tracker-grid" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 100px', gap: '10px', padding: '12px 15px', background: set.completed ? 'rgba(224, 248, 0, 0.03)' : (set.skipped ? 'rgba(255,255,255,0.02)' : 'transparent'), opacity: set.skipped ? 0.5 : 1, transition: 'all 0.3s' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: set.completed ? 'var(--accent-primary)' : 'var(--text-muted)', textDecoration: set.skipped ? 'line-through' : 'none' }}>{setIdx + 1}</div>
                                      <div><input type="number" min="0" className="tracker-input" step="0.5" placeholder={exercise.suggestedWeight ? `${exercise.suggestedWeight}` : (exercise.expectedWeight ? `${exercise.expectedWeight}` : '')} value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} disabled={inputDisabled} style={{ width: '100%', padding: '10px', background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: isEditing ? '1px solid var(--accent-primary)' : 'none', borderRadius: '6px', color: '#fff', textAlign: 'center', textDecoration: set.skipped ? 'line-through' : 'none' }} /></div>
                                      <div><input type="text" className="tracker-input" placeholder={set.reps} value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} disabled={inputDisabled} style={{ width: '100%', padding: '10px', background: isEditing ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: isEditing ? '1px solid var(--accent-primary)' : 'none', borderRadius: '6px', color: '#fff', textAlign: 'center', textDecoration: set.skipped ? 'line-through' : 'none' }} /></div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                        {isWorkoutLocked ? (
                                          isEditing ? (
                                            <button onClick={() => {
                                              setEditingSets({...editingSets, [`${exIdx}-${setIdx}`]: false});
                                              updateBackendSession(logs, comments, videoLinks);
                                            }} style={{ width: '75px', height: '35px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>💾 Guardar</button>
                                          ) : (
                                            <button onClick={() => setEditingSets({...editingSets, [`${exIdx}-${setIdx}`]: true})} style={{ width: '75px', height: '35px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem' }}>✏️ Modificar</button>
                                          )
                                        ) : (
                                          <>
                                            <button onClick={() => toggleComplete(exIdx, setIdx)} disabled={set.skipped} style={{ width: '35px', height: '35px', borderRadius: '50%', background: set.completed ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', border: set.completed ? 'none' : '1px solid rgba(255,255,255,0.2)', color: set.completed ? '#000' : 'rgba(255,255,255,0.2)', cursor: set.skipped ? 'not-allowed' : 'pointer' }}>✓</button>
                                            <button onClick={() => toggleSkipSet(exIdx, setIdx)} style={{ width: '35px', height: '35px', borderRadius: '50%', background: set.skipped ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>🚫</button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Coach Correlation Features */}
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {isWorkoutLocked && (
                                  <div style={{ textAlign: 'right', marginBottom: '-5px' }}>
                                    {editingExtras[exIdx] ? (
                                      <button onClick={() => {
                                        setEditingExtras({...editingExtras, [exIdx]: false});
                                        updateBackendSession(logs, comments, videoLinks);
                                      }} style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--accent-primary)', color: '#000', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}>💾 Guardar Notas</button>
                                    ) : (
                                      <button onClick={() => setEditingExtras({...editingExtras, [exIdx]: true})} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.75rem' }}>✏️ Modificar Notas</button>
                                    )}
                                  </div>
                                )}
                                <input type="text" placeholder="Añadir comentario (ej. molestias, sensaciones...)" value={comments[stateKey] || ''} onChange={(e) => setComments({...comments, [stateKey]: e.target.value})} disabled={isWorkoutLocked && !editingExtras[exIdx]} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', border: (isWorkoutLocked && !editingExtras[exIdx]) ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent-primary)', borderRadius: '6px', color: '#fff', fontSize: '0.85rem' }} />
                                <input type="text" placeholder="🔗 Pegar link de video para revisión de técnica (Opcional)" value={videoLinks[stateKey] || ''} onChange={(e) => setVideoLinks({...videoLinks, [stateKey]: e.target.value})} disabled={isWorkoutLocked && !editingExtras[exIdx]} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.02)', border: (isWorkoutLocked && !editingExtras[exIdx]) ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }} />
                                {comments[`coach_${stateKey}`] && (
                                  <div style={{ padding: '12px', background: 'rgba(224, 248, 0, 0.05)', border: '1px dashed var(--accent-primary)', borderRadius: '6px', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>
                                    <strong>👨‍🏫 Feedback del Entrenador:</strong> {comments[`coach_${stateKey}`]}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {!isWorkoutLocked ? (
                          <div style={{ marginTop: '30px', marginBottom: '20px', display: 'grid', gap: '12px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                              <h4 style={{ color: 'var(--text-main)', marginBottom: '15px', fontSize: '1rem' }}>Evaluación de la Sesión</h4>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '15px' }}>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Estrés (1-5)</label>
                                  <select value={workoutEval.stress} onChange={e => setWorkoutEval({...workoutEval, stress: parseInt(e.target.value)})} className="input-field" style={{ width: '100%', margin: 0, padding: '10px', cursor: 'pointer' }}>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Fatiga (1-5)</label>
                                  <select value={workoutEval.fatigue} onChange={e => setWorkoutEval({...workoutEval, fatigue: parseInt(e.target.value)})} className="input-field" style={{ width: '100%', margin: 0, padding: '10px', cursor: 'pointer' }}>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Motivación (1-5)</label>
                                  <select value={workoutEval.motivation} onChange={e => setWorkoutEval({...workoutEval, motivation: parseInt(e.target.value)})} className="input-field" style={{ width: '100%', margin: 0, padding: '10px', cursor: 'pointer' }}>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Digestiones (1-5)</label>
                                  <select value={workoutEval.digestions} onChange={e => setWorkoutEval({...workoutEval, digestions: parseInt(e.target.value)})} className="input-field" style={{ width: '100%', margin: 0, padding: '10px', cursor: 'pointer' }}>
                                    {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </div>
                                <div>
                                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>Horas de sueño</label>
                                  <input type="number" step="0.5" min="0" max="24" value={workoutEval.sleepHours} onChange={e => setWorkoutEval({...workoutEval, sleepHours: parseFloat(e.target.value)})} className="input-field" style={{ width: '100%', margin: 0, padding: '10px' }} />
                                </div>
                              </div>
                            </div>

                            <button onClick={handleFinishWorkout} className="btn-primary" style={{ width: '100%', padding: '20px', fontSize: '1.2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>🏁 FINALIZAR ENTRENAMIENTO</button>
                            {isWorkoutStarted && (
                              <button
                                onClick={handlePauseWorkout}
                                style={{ width: '100%', padding: '14px', background: 'rgba(255,170,0,0.1)', border: '1px solid #ffaa00', color: '#ffaa00', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                ⏸️ Pausar entrenamiento
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                            <button onClick={async () => {
                              const ok = await dialog.confirm('¿Volver a empezar este entrenamiento desde cero? Perderás los registros no guardados de esta sesión.', { danger: true, confirmText: 'Reiniciar' });
                              if (ok) {
                                setIsWorkoutLocked(false);
                                setIsWorkoutStarted(false);
                                setWorkoutSeconds(0);
                                setRestSeconds(0);
                              }
                            }} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #ff4500', color: '#ff4500', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>🔁 Volver a realizar entreno</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              )
            )}

            {/* Pestaña: PROGRESO */}
            {activeTab === 'progress' && (
              <div className="fade-in">
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '20px' }}>Mi Progreso</h3>

                <div className="glass-panel" style={{ padding: '25px', marginBottom: '25px' }}>
                  <h4 style={{ color: 'var(--accent-primary)', marginBottom: '15px' }}>⚖️ Registro Diario</h4>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input type="number" step="0.1" min="0" value={dailyWeight} onChange={(e) => setDailyWeight(e.target.value)} style={{ width: '100px', padding: '15px', fontSize: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#fff', textAlign: 'center' }} />
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>kg</span>
                    <button
                      onClick={async () => {
                        if (!dailyWeight || dailyWeight.toString().trim() === '') {
                          await dialog.alert("Introduce un peso válido.", { title: 'Faltan datos' });
                          return;
                        }
                        const token = localStorage.getItem('token');
                        try {
                          const response = await fetch(`${API_BASE_URL}/api/progress`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              logDate: new Date().toISOString().split('T')[0],
                              weight: parseFloat(dailyWeight)
                            })
                          });
                          if (response.ok) {
                            dialog.toast("Peso diario guardado", { variant: 'success' });
                            fetchProgressHistory();
                          } else {
                            dialog.toast("Error al guardar el peso", { variant: 'error' });
                          }
                        } catch (err) {
                          console.error(err);
                          dialog.toast("Error de red", { variant: 'error' });
                        }
                      }}
                      style={{ marginLeft: 'auto', padding: '12px 20px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Guardar Peso
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                  <button
                    onClick={() => setShowLogModal(true)}
                    className="btn-primary"
                    style={{ flex: 1, padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold' }}
                  >
                    📅 Registrar Medidas Históricas / Pasadas
                  </button>
                </div>



                <div className="glass-panel" style={{ padding: '25px', marginBottom: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h4 style={{ color: 'var(--accent-primary)', margin: 0 }}>📊 Comparativa de Medidas</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {selectedMonths.map((monthIdx, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <select
                            className="input-field"
                            style={{ padding: '5px', margin: 0 }}
                            value={monthIdx}
                            onChange={(e) => {
                              const newMonths = [...selectedMonths];
                              newMonths[i] = parseInt(e.target.value);
                              setSelectedMonths(newMonths);
                            }}
                          >
                            {cmpWeight.map((_, idx) => (
                              <option key={idx} value={idx}>{idx === cmpWeight.length - 1 ? 'Actual' : (measurementDates[idx] ? measurementDates[idx] : `${timeScaleLabel} ${idx + 1}`)}</option>
                            ))}
                          </select>
                          {selectedMonths.length > 2 && (
                            <button
                              onClick={() => setSelectedMonths(selectedMonths.filter((_, filterIdx) => filterIdx !== i))}
                              style={{ background: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer' }}
                            >✕</button>
                          )}
                        </div>
                      ))}
                      {selectedMonths.length < 3 && cmpWeight.length > 0 && (
                        <button
                          onClick={() => {
                            const minSelected = Math.min(...selectedMonths);
                            const nextToAdd = Math.max(0, minSelected - 1);
                            if (!selectedMonths.includes(nextToAdd)) {
                                setSelectedMonths([...selectedMonths, nextToAdd]);
                            } else {
                                const available = cmpWeight.map((_, i) => i).filter(i => !selectedMonths.includes(i));
                                if (available.length > 0) setSelectedMonths([...selectedMonths, available[available.length - 1]]);
                            }
                          }}
                          style={{ background: 'rgba(224, 248, 0, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '5px 10px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          + Comparar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                      <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left' }}>Métrica</th>
                          {selectedMonths.map((m, i) => (
                            <Fragment key={i}>
                              <th style={{ padding: '12px' }}>{m === cmpWeight.length - 1 ? 'Actual' : (measurementDates[m] ? measurementDates[m] : `${timeScaleLabel} ${m + 1}`)}</th>
                              {i < selectedMonths.length - 1 && (
                                <th style={{ padding: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dif.</th>
                              )}
                            </Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { label: 'Peso Corpor.', key: 'weight', data: cmpWeight, unit: 'kg', lowerIsBetter: clientData?.goal === 'Pérdida de Grasa' },
                          { label: 'Cintura', key: 'waist', data: waistHistory, unit: 'cm', lowerIsBetter: true },
                          { label: 'Cadera', key: 'cadera', data: caderaHistory, unit: 'cm', lowerIsBetter: true },
                          { label: 'Cuello', key: 'cuello', data: cuelloHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Bíceps', key: 'biceps', data: bicepsHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Antebrazo', key: 'antebrazo', data: antebrazoHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Pecho', key: 'pecho', data: pechoHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Espalda', key: 'espalda', data: espaldaHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Pierna', key: 'pierna', data: piernaHistory, unit: 'cm', lowerIsBetter: false },
                          { label: 'Gemelo', key: 'gemelo', data: gemeloHistory, unit: 'cm', lowerIsBetter: false },
                        ]
                        .filter(row => selectedMonths.some(m => row.data[m] > 0))
                        .map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>{row.label}</td>
                            {selectedMonths.map((m, i) => {
                              const currentVal = row.data[m];
                              const nextVal = selectedMonths[i+1] !== undefined ? row.data[selectedMonths[i+1]] : null;

                              let diffColor = 'var(--text-muted)';
                              let diffText = '-';

                              if (currentVal !== undefined && nextVal !== undefined && currentVal > 0 && nextVal > 0) {
                                const diff = parseFloat((nextVal - currentVal).toFixed(2));
                                if (diff > 0) {
                                  diffColor = row.lowerIsBetter ? '#ff4500' : '#00e676';
                                  diffText = `+${diff}`;
                                } else if (diff < 0) {
                                  diffColor = row.lowerIsBetter ? '#00e676' : '#ff4500';
                                  diffText = `${diff}`;
                                } else {
                                  diffText = '=';
                                }
                              }

                              return (
                                <Fragment key={i}>
                                  <td style={{ padding: '12px' }}>{currentVal !== undefined ? `${currentVal}${row.unit}` : '-'}</td>
                                  {i < selectedMonths.length - 1 && (
                                    <td style={{ padding: '12px', color: diffColor, fontWeight: 'bold', fontSize: '0.9rem' }}>
                                      {diffText}
                                    </td>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>


                <div className="glass-panel" style={{ padding: '25px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h4 style={{ color: 'var(--text-main)' }}>Gráficas de Evolución</h4>
                  </div>
                  <div className="custom-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '15px', borderBottom: '1px solid var(--border-light)', marginBottom: '20px', whiteSpace: 'nowrap' }}>
                    {[
                      { id: 'weight', icon: '⚖️', label: 'Peso', color: 'var(--accent-primary)' },
                      { id: 'adherence', icon: '📊', label: 'Cumplimiento', color: '#00f2fe' },
                      { id: 'measures', icon: '📏', label: 'Medidas Corporales', color: '#ff0844' },
                      { id: 'volume', icon: '🏋️', label: 'Volumen', color: '#ffaa00' }
                    ].map(tab => {
                      const isActive = chartType === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => { setChartType(tab.id); setExpandedChart(null); }}
                          style={{
                            padding: '8px 20px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            background: isActive ? `${tab.color}15` : 'rgba(255,255,255,0.03)',
                            color: isActive ? tab.color : 'var(--text-muted)',
                            border: `1px solid ${isActive ? tab.color : 'transparent'}`,
                            borderRadius: '30px',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: isActive ? `0 0 10px ${tab.color}30` : 'none'
                          }}
                        >
                          <span>{tab.icon}</span> {tab.label}
                        </button>
                      )
                    })}
                  </div>

                  {chartType === 'measures' ? (
                    expandedChart ? (
                      <div>
                        <button onClick={() => setExpandedChart(null)} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 20px', borderRadius: '30px', cursor: 'pointer', marginBottom: '10px', fontWeight: 'bold' }}>⬅ Volver a la Cuadrícula</button>
                        {renderChart(expandedChart)}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                        <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('waist')}>{renderChart('waist')}</div>
                        <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('cadera')}>{renderChart('cadera')}</div>
                        <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('cuello')}>{renderChart('cuello')}</div>
                        <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('biceps')}>{renderChart('biceps')}</div>
                        <div style={{cursor: 'pointer', transition: 'transform 0.2s'}} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} onClick={() => setExpandedChart('pierna')}>{renderChart('pierna')}</div>
                      </div>
                    )
                  ) : (
                    renderChart()
                  )}
                </div>
              </div>
            )}

            {/* Pestaña: HISTORIAL */}
            {activeTab === 'history' && (
              <div className="fade-in">
                <h3 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '20px' }}>Historial Pasado</h3>
                {isLoadingHistory ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>Cargando historial...</div>
                ) : historyData.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No hay entrenamientos registrados todavía.</div>
                ) : (
                  <div style={{ display: 'grid', gap: '15px' }}>
                    {historyData.map((session) => {
                      let executedTab = session.dayName;
                      if (session.sessionDate) {
                        const parts = session.sessionDate.split('-');
                        if (parts.length === 3) {
                          const d = new Date(parts[0], parts[1] - 1, parts[2]);
                          const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
                          executedTab = days[d.getDay()];
                        }
                      } else if (session.logsJson) {
                         try {
                           const parsed = JSON.parse(session.logsJson);
                           if (parsed._executionSlot) {
                             executedTab = parsed._executionSlot;
                           }
                         // eslint-disable-next-line no-unused-vars, no-empty
                         } catch (e) { console.error("Error capturado:", e); }
                      }
                      
                      return (
                        <div key={session.id} onClick={() => {
                          setActiveSessionId(session.id);
                          if (session.logsJson) {
                             try {
                               const parsed = JSON.parse(session.logsJson);
                               // Legacy sessions persisted only the inner per-exercise map for the
                               // session day. Wrap it back into the {day: {exIdx: [...]}} shape so
                               // currentLogs = logs[selectedDay] resolves correctly.
                               const isFlat = parsed && typeof parsed === 'object' && Object.keys(parsed).every(k => /^\d+$/.test(k));
                               setLogs(isFlat ? { [session.dayName]: parsed } : parsed);
                             // eslint-disable-next-line no-unused-vars, no-empty
                             } catch (e) { console.error("Error capturado:", e); }
                          }
                          if (session.commentsJson) {
                             // eslint-disable-next-line no-unused-vars, no-empty
                             try { setComments(JSON.parse(session.commentsJson)); } catch (e) { console.error("Error capturado:", e); }
                          }
                          if (session.videoLinksJson) {
                             // eslint-disable-next-line no-unused-vars, no-empty
                             try { setVideoLinks(JSON.parse(session.videoLinksJson)); } catch (e) { console.error("Error capturado:", e); }
                          }
                          setSelectedDay(executedTab);
                          setWorkoutSeconds(session.durationSeconds || 0);
                          setWorkoutSummary({
                            time: formatTime(session.durationSeconds || 0),
                            volume: session.totalVolume,
                            sets: session.completedSets,
                            percentage: session.completionPercentage
                          });
                          setIsWorkoutStarted(false);
                          setIsWorkoutLocked(true);
                          setHasFinishedSession(true);
                          setActiveTab('workout');
                        }} className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                          <div>
                            <h4 style={{ color: '#fff', marginBottom: '5px' }}>
                              {executedTab} {executedTab !== session.dayName && <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>(Rutina de {session.dayName})</span>}
                            </h4>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{session.sessionDate} • Completado {session.completionPercentage}%</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{session.totalVolume} kg</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Volumen</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pestaña: PRÓXIMA RUTINA */}
            {activeTab === 'next_workout' && (
              <div className="fade-in">
                <div style={{ background: 'rgba(255, 170, 0, 0.1)', border: '1px dashed #ffaa00', padding: '15px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '5px' }}>⏳ Rutina Programada</span>
                  <p style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>Esta rutina está planificada para el próximo mesociclo. Modo consulta.</p>
                </div>

                <div className="scrollable-tabs" style={{ marginBottom: '15px', borderBottom: '1px solid var(--border-light)' }}>
                  {routineDays.map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      style={{
                        padding: '10px 20px', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s',
                        background: selectedDay === day ? '#ffaa00' : 'transparent',
                        color: selectedDay === day ? '#000' : 'var(--text-muted)',
                        border: selectedDay === day ? '1px solid #ffaa00' : '1px solid var(--border-light)'
                      }}
                    >
                      {day.split(' - ')[0]}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '800' }}>{selectedDay}</h3>
                </div>

                <div style={{ display: 'grid', gap: '15px' }}>
                  {activeWorkout.map((ex, exIdx) => (
                    <div key={exIdx} className="glass-panel" style={{ padding: '20px', opacity: 0.8 }}>
                      <h4 style={{ fontSize: '1.1rem', marginBottom: '5px' }}>{ex.name} {ex.isOptional && <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', marginLeft: '5px' }}>Opcional</span>}</h4>
                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        <span>🎯 {ex.reps}</span>
                        <span>🔥 {ex.intensity}</span>
                      </div>
                      {ex.notes && (
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          💡 {ex.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pestaña: REVISIÓN */}
            {activeTab === 'review' && (
              <ReviewTab onLockChange={setIsReviewLocked} />
            )}

            {/* Pestaña: GALERÍA */}
            {activeTab === 'gallery' && (
              <GalleryTab />
            )}
          </div>
        )}
      </div>

      {/* Bottom Mobile Navigation */}
      {!(clientData && clientData.onboardingCompleted === false) && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: '70px', background: 'rgba(10, 10, 12, 0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 500 }}>
          <button onClick={() => setActiveTab('workout')} style={{ background: 'transparent', border: 'none', color: activeTab === 'workout' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>🏋️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Entrenar</span>
          </button>
          <button onClick={() => setActiveTab('progress')} style={{ background: 'transparent', border: 'none', color: activeTab === 'progress' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>📈</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Progreso</span>
          </button>
          <button onClick={() => setActiveTab('history')} style={{ background: 'transparent', border: 'none', color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>📅</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Historial</span>
          </button>
          <button onClick={() => setActiveTab('review')} style={{ background: 'transparent', border: 'none', color: activeTab === 'review' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', position: 'relative' }}>
            <span style={{ fontSize: '1.5rem', position: 'relative' }}>
              📷
              {isReviewLocked === false && !hasActiveReview && (
                <span style={{
                  position: 'absolute', top: '-6px', right: '-12px',
                  background: '#ff4500', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold',
                  borderRadius: '50%', width: '16px', height: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                }}>1</span>
              )}
            </span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Revisión</span>
          </button>
          <button onClick={() => setActiveTab('gallery')} style={{ background: 'transparent', border: 'none', color: activeTab === 'gallery' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
            <span style={{ fontSize: '1.5rem' }}>🖼️</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Galería</span>
          </button>
          {hasNextRoutine && (
            <button onClick={() => setActiveTab('next_workout')} style={{ background: 'transparent', border: 'none', color: activeTab === 'next_workout' ? 'var(--accent-primary)' : 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.5rem' }}>⏭️</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Próxima</span>
            </button>
          )}
        </nav>
      )}

      {/* Chat Modal */}
      {showChatModal && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Chat con Antonio (Entrenador)</h3>
              <button onClick={() => setShowChatModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>✖</button>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{ alignSelf: msg.sender === 'client' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{ background: msg.sender === 'client' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: msg.sender === 'client' ? '#000' : '#fff', padding: '12px 16px', borderRadius: msg.sender === 'client' ? '12px 12px 0 12px' : '12px 12px 12px 0', fontSize: '0.95rem' }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', textAlign: msg.sender === 'client' ? 'right' : 'left' }}>{msg.time}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div style={{ padding: '15px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px' }}>
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Escribe a tu entrenador..." style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '25px', color: '#fff', fontFamily: 'Outfit' }} />
              <button onClick={handleSendMessage} style={{ background: 'var(--accent-primary)', border: 'none', width: '45px', height: '45px', borderRadius: '50%', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>➤</button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* Modal Finalizar */}
      {isFinished && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px', textAlign: 'center', borderTop: '4px solid var(--accent-primary)' }}>
            <div style={{ fontSize: '5rem', marginBottom: '20px' }}>{workoutSummary?.percentage === 100 ? '🔥' : '💪'}</div>
            <h2 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '15px', color: 'var(--accent-primary)' }}>
              {workoutSummary?.percentage === 100 ? '¡BRUTAL!' : '¡SIGAMOS MEJORANDO!'}
            </h2>
            <p style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '5px' }}>
              Has completado el {workoutSummary?.percentage}% de tu {selectedDay}.
            </p>

            {workoutSummary && (
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
                <div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>{workoutSummary.time}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TIEMPO</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>{workoutSummary.volume}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VOLUMEN (KG)</div>
                </div>
                <div>
                  <div style={{ color: 'var(--accent-primary)', fontSize: '1.5rem', fontWeight: 'bold' }}>{workoutSummary.sets}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SERIES</div>
                </div>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', padding: '15px', fontSize: '1.2rem', marginTop: '20px' }} onClick={() => setIsFinished(false)}>
              Ver Resumen
            </button>
          </div>
        </div>, document.body
      )}

      {/* Modal Evaluación Recibida */}
      {showEvaluationModal && clientData?.lastCompletedReview && createPortal(
        <div className="fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 3000, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', background: 'rgba(20,20,24,0.98)', padding: '25px', position: 'relative' }}>
            <button onClick={() => setShowEvaluationModal(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>

            <h2 style={{ color: 'var(--accent-primary)', marginBottom: '20px' }}>Resultados de la Evaluación</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>Fecha: {clientData.lastCompletedReview.reviewDate}</p>

            {clientData.lastCompletedReview.globalFeedback && (
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px', borderLeft: '4px solid var(--accent-primary)' }}>
                <h4 style={{ marginBottom: '10px' }}>💭 Comentario del Entrenador</h4>
                <p style={{ fontSize: '1rem', fontStyle: 'italic', lineHeight: '1.5', whiteSpace: 'pre-line' }}>"{clientData.lastCompletedReview.globalFeedback}"</p>
              </div>
            )}

            <h4 style={{ marginBottom: '15px' }}>📸 Correcciones Fotográficas</h4>
            <div style={{ display: 'grid', gap: '20px' }}>
              {['front', 'left', 'right', 'back'].map(view => {
                const photoComment = clientData.lastCompletedReview.photoComments?.[view];
                const drawingUrl = clientData.lastCompletedReview.drawings?.[view];
                const originalUrl = clientData.lastCompletedReview.photos?.[view];
                const labels = { front: 'Frontal', left: 'Lateral Izq.', right: 'Lateral Der.', back: 'Espalda' };

                if (!photoComment && !drawingUrl && !originalUrl) return null;

                return (
                  <div key={view} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '12px', padding: '15px', display: 'flex', gap: '15px', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                      <div
                        onClick={() => {
                          setLargePhotoView(view);
                          setToggledPhoto(false);
                          setLargePhotoSource('completed');
                        }}
                        style={{
                          width: '120px', height: '160px',
                          background: originalUrl ? `url(${originalUrl}) center/contain no-repeat` : 'rgba(255,255,255,0.05)',
                          borderRadius: '8px', position: 'relative', cursor: 'pointer'
                        }}
                      >
                        {/* Overlay drawing if it exists */}
                        {drawingUrl && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url(${drawingUrl}) center/contain no-repeat`, pointerEvents: 'none' }} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ color: 'var(--text-muted)', marginBottom: '5px' }}>Vista {labels[view]}</h5>
                        {photoComment ? (
                          <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{photoComment}</p>
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Sin comentarios específicos</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: '30px', padding: '15px', fontSize: '1.1rem' }}
              onClick={() => {
                setShowEvaluationModal(false);
                setHasAcceptedEvaluation(true);
              }}
            >
              Aceptar Evaluación
            </button>
          </div>
        </div>, document.body
      )}

      {/* Modal Visor de Foto (Cliente) */}
      {largePhotoView && createPortal(
        (() => {
          const sourceData = largePhotoSource === 'completed' ? clientData?.lastCompletedReview : clientData?.pendingReviewData;
          const pastPhotoUrl = sourceData?.pastPhotos?.[largePhotoView];
          const currentPhotoUrl = sourceData?.photos?.[largePhotoView];
          const currentDrawingUrl = largePhotoSource === 'completed' ? sourceData?.drawings?.[largePhotoView] : null;

          return (
            <div className="fade-in" style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
              zIndex: 4000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px'
            }}>
              <button onClick={() => setLargePhotoView(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#ff4500', fontSize: '2rem', cursor: 'pointer', zIndex: 4001 }}>✕</button>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', zIndex: 4001 }}>
                <button
                  onClick={() => setToggledPhoto(false)}
                  style={{ background: !toggledPhoto ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)', color: !toggledPhoto ? '#000' : '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  Foto Actual
                </button>
                <button
                  onClick={() => setToggledPhoto(true)}
                  disabled={!pastPhotoUrl}
                  style={{ background: toggledPhoto ? '#ffaa00' : 'rgba(255,255,255,0.1)', color: toggledPhoto ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: pastPhotoUrl ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}
                >
                  Foto Anterior
                </button>
              </div>

              <div style={{ width: '100%', maxWidth: '600px', height: '70vh', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                {toggledPhoto ? (
                  <div style={{ width: '100%', height: '100%', background: `url(${pastPhotoUrl}) center/contain no-repeat`, transition: 'opacity 0.3s ease-in-out' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url(${currentPhotoUrl}) center/contain no-repeat` }} />
                    {currentDrawingUrl && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `url(${currentDrawingUrl}) center/contain no-repeat`, pointerEvents: 'none' }} />
                    )}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Estás viendo: {toggledPhoto ? 'Mes Anterior' : 'Mes Actual'}
              </div>
            </div>
          );
        })(), document.body
      )}

      {/* Modal Registrar Medidas Pasadas */}
      {showLogModal && createPortal(
        <div className="fade-in modal-overlay-scroll" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }}>
          <form onSubmit={handleSaveProgress} className="glass-panel modal-form-mobile" style={{ width: '100%', maxWidth: '500px', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', padding: '24px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', flexShrink: 0 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>Registrar Medidas Pasadas</h3>
              <button type="button" onClick={() => setShowLogModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✖</button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Fecha de la Medición</label>
                <input type="date" required value={logForm.logDate} onChange={e => setLogForm({...logForm, logDate: e.target.value})} className="input-field" style={{ colorScheme: 'dark', margin: 0, width: '100%' }} />
              </div>

              <div className="responsive-grid-2" style={{ gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Peso (kg)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 78.5" value={logForm.weight} onChange={e => setLogForm({...logForm, weight: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cintura (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 84.0" value={logForm.waist} onChange={e => setLogForm({...logForm, waist: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cadera (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 98.0" value={logForm.hip} onChange={e => setLogForm({...logForm, hip: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Cuello (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 38.0" value={logForm.neck} onChange={e => setLogForm({...logForm, neck: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Bíceps (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 36.5" value={logForm.biceps} onChange={e => setLogForm({...logForm, biceps: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Pierna (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 58.0" value={logForm.leg} onChange={e => setLogForm({...logForm, leg: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Pecho (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 102.0" value={logForm.chest} onChange={e => setLogForm({...logForm, chest: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Espalda (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 108.0" value={logForm.back} onChange={e => setLogForm({...logForm, back: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Antebrazo (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 30.0" value={logForm.forearm} onChange={e => setLogForm({...logForm, forearm: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>Gemelo (cm)</label>
                  <input type="number" step="0.1" min="0" placeholder="Ej. 40.0" value={logForm.calf} onChange={e => setLogForm({...logForm, calf: e.target.value})} className="input-field" style={{ margin: 0, width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button type="button" onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button type="submit" style={{ flex: 2, padding: '12px', background: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Guardar</button>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* Modal Rutina Completa (Tabla/PDF) */}
      {showRoutineTable && clientData?.routine && createPortal(
        <div className="fade-in" onClick={() => setShowRoutineTable(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(10px)',
          zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', background: 'rgba(20, 20, 24, 0.98)', padding: '30px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '15px', flexShrink: 0 }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--accent-primary)', fontWeight: '800' }}>Mi Rutina Completa</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Evolución semanal en formato tabular.</p>
              </div>
              <button onClick={() => setShowRoutineTable(false)} style={{ background: 'transparent', border: 'none', color: '#ff4500', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '25px', paddingRight: '5px' }}>
              {Object.keys(clientData.routine).map(day => {
                const exercises = clientData.routine[day] || [];
                if (exercises.length === 0) return null;
                return (
                  <div key={day} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '15px' }}>
                    <h4 style={{ color: 'var(--accent-primary)', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginBottom: '12px', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.95rem' }}>{day}</h4>
                    <div className="table-responsive">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-light)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Ejercicio</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Objetivo</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Intensidad</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Peso Esp.</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Notas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exercises.map((ex, exIdx) => (
                            <tr key={exIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '10px 8px', fontWeight: '600' }}>{ex.name} {ex.isOptional && <span style={{ color: '#ffaa00', fontSize: '0.7rem' }}>(Opc.)</span>}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>{ex.reps || '—'}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-muted)' }}>{ex.intensity || '—'}</td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--accent-primary)', fontWeight: 'bold' }}>{ex.expectedWeight ? `${ex.expectedWeight} kg` : '—'}</td>
                              <td style={{ padding: '10px 8px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.8rem' }}>{ex.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexShrink: 0, alignItems: 'center' }}>
              <button onClick={() => setShowRoutineTable(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-light)', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar</button>
              <select value={pdfStyle} onChange={(e) => setPdfStyle(e.target.value)} className="input-field" style={{ margin: 0, flex: 1 }}>
                <option value="styled">Con Estilo</option>
                <option value="basic">Básico</option>
              </select>
              <button onClick={downloadRoutinePDF} className="btn-primary" style={{ flex: 2, padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                🖨️ Descargar PDF
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showProfile && (
        <ClientProfile
          user={clientData || user}
          onClose={() => setShowProfile(false)}
          onUpdated={() => fetchProfile()}
        />
      )}

    </div>
  );
}
