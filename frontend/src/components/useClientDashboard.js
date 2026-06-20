import { useState, useRef, useEffect, Fragment, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import InitialQuestionnaire from './InitialQuestionnaire';
import ReviewTab from './ReviewTab';
import GalleryTab from './GalleryTab';
import ClientProfile from './ClientProfile';
import { getChatMessages, addChatMessage, connectWebSocket, disconnectWebSocket, sendWebSocketMessage } from '../utils/chatStore';
import { usersApi, reviewsApi, workoutsApi } from '../utils/api';
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
export function normalizeExerciseSets(ex) {
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

export function initializeLogsForTab(rName, tName, clientData, currentLogs, currentComments, currentVideoLinks) {
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


export default function useClientDashboard(user, onLogout) {

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
      now.setDate(now.getDate() + weekOffset * 7);
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
  }, [clientData?.routine, clientData?.routineUpdatedAt, weekOffset]);

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
    if (clientData?.routine) {
      const days = Object.keys(clientData?.routine).filter(day => !day.endsWith('_notes'));
      if (days.length > 0) {
        if (!selectedDay || !days.includes(selectedDay)) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSelectedDay(days[0]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientData?.routine]);

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
      const payload = {
        dayName: loadedRoutineHere || selectedDay,
        durationSeconds: workoutSeconds,
        totalVolume: totalVolume,
        completedSets: completedSets.length,
        completionPercentage: completionPercentage,
        logsJson: { 
          ...logs, 
          [(loadedRoutineHere || selectedDay)]: logs[selectedDay],
          _executionSlot: selectedDay 
        },
        commentsJson: comments,
        videoLinksJson: videoLinks,
        stress: workoutEval.stress,
        fatigue: workoutEval.fatigue,
        motivation: workoutEval.motivation,
        sleepHours: workoutEval.sleepHours,
        digestions: workoutEval.digestions
      };
      
      const resData = await workoutsApi.saveOrUpdate(activeSessionId, payload);
      
      if (!activeSessionId && resData) {
        // Asumiendo que el ID se devuelve directo o dentro de id
        const newId = typeof resData === 'string' ? resData.replace(/"/g, '') : resData.id;
        if (newId) setActiveSessionId(newId);
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

      const payload = {
        dayName: loadedRoutineHere || selectedDay,
        durationSeconds: workoutSeconds,
        totalVolume: totalVolume,
        completedSets: completedSets.length,
        completionPercentage: completionPercentage,
        logsJson: {
          ...currentLogsToSave,
          [(loadedRoutineHere || selectedDay)]: currentLogsToSave[selectedDay],
          _executionSlot: selectedDay
        },
        commentsJson: currentCommentsToSave,
        videoLinksJson: currentLinksToSave
      };
      await workoutsApi.saveOrUpdate(activeSessionId, payload);

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


  const routineDays = clientData?.routine ? Object.keys(clientData.routine).filter(day => !day.endsWith('_notes')) : [];
  const activeDayNotes = clientData?.routine?.[selectedDay + '_notes'] || '';

  return {
    dialog,
    isReviewLocked,
    hasActiveReview,
    showProfile,
    isFinished,
    activeTab,
    viewingNextRoutine,
    clientData,
    showRoutineTable,
    pdfStyle,
    showEvaluationModal,
    workoutEval,
    selectedMonths,
    largePhotoView,
    toggledPhoto,
    largePhotoSource,
    hasAcceptedEvaluation,
    expandedChart,
    progressHistory,
    showLogModal,
    logForm,
    selectedDay,
    skippedDays,
    weekOffset,
    comments,
    videoLinks,
    logs,
    timeScaleLabel,
    hasNextRoutine,
    isWorkoutStarted,
    isWorkoutLocked,
    hasFinishedSession,
    workoutSeconds,
    restSeconds,
    workoutSummary,
    activeSessionId,
    hasResumableWorkout,
    resumableDayName,
    todaySessionsByDay,
    historyData,
    isLoadingHistory,
    completedSessionToday,
    trainedTemplateDays,
    consumedElsewhereSession,
    isDayConsumedElsewhere,
    loadedRoutineHere,
    targetTabWhereLoaded,
    targetTabActiveOrLocked,
    isLoadedElsewhere,
    realExecutionTab,
    realExecutionDay,
    displayExecutionName,
    routineDayForRender,
    activeWorkout,
    pendingOptions,
    editingSets,
    editingExtras,
    showChatModal,
    chatInput,
    chatEndRef,
    messages,
    unreadMessages,
    dailyWeight,
    chartType,
    todayWeekday,
    dayLogs,
    dayHasProgress,
    isPastPendingDay,
    progress,
    displayProgress,
    progressDates,
    weightHistory,
    measurementLogs,
    measurementDates,
    cmpWeight,
    waistHistory,
    caderaHistory,
    cuelloHistory,
    bicepsHistory,
    piernaHistory,
    pechoHistory,
    gemeloHistory,
    antebrazoHistory,
    espaldaHistory,
    volumeHistory,
    adherenceHistory,
    isLoading,
    isError,
    fetchProfile,
    setShowProfile,
    setUnreadMessages,
    setShowChatModal,
    setViewingNextRoutine,
    setShowRoutineTable,
    setWeekOffset,
    setSelectedDay,
    setLoadedRoutineByTab,
    setPdfStyle,
    setChatInput,
    setEditingSets,
    setEditingExtras,
    setChartType,
    setLogForm,
    setShowLogModal,
    setDailyWeight,
    setShowEvaluationModal,
    setIsFinished,
    setActiveTab,
    handleCompleteOnboarding,
    fetchProgressHistory,
    resumeWorkout,
    handlePauseWorkout,
    discardResumableWorkout,
    pickPendingDay,
    updateSet,
    toggleComplete,
    toggleSkipSet,
    toggleSkipExercise,
    toggleSkipDay,
    handleSendMessage,
    moveRoutineToToday,
    handleFinishWorkout,
    updateBackendSession,
    handleSaveProgress,
    handleStartWorkout,
    downloadRoutinePDF,
    fmtLogDate,
    renderChart,
    isDaySkipped,
    currentLogs,
    setComments,
    setVideoLinks,
    setWorkoutEval,
    setIsWorkoutLocked,
    setIsWorkoutStarted,
    setWorkoutSeconds,
    setRestSeconds,
    setSelectedMonths,
    setExpandedChart,
    setActiveSessionId,
    setLogs,
    setWorkoutSummary,
    setHasFinishedSession,
    setIsReviewLocked,
    setLargePhotoView,
    setToggledPhoto,
    setLargePhotoSource,
    setHasAcceptedEvaluation,
    routineDays,
    activeDayNotes,
    loadedRoutineByTab
  };
}
