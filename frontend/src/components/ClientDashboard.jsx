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

import useClientDashboard, { normalizeExerciseSets, initializeLogsForTab } from './useClientDashboard';

export default function ClientDashboard({ user, onLogout}) {
  const {
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
  } = useClientDashboard(user, onLogout);

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
                        let borderColor = 'rgba(255,255,255,0.05)';
                        let textColor = 'rgba(255,255,255,0.2)';
                        
                        const hasRoutine = !!(clientData?.routine?.[day] && clientData.routine[day].length > 0);
                        
                        if (selectedDay === day) {
                          bgColor = 'var(--accent-primary)';
                          borderColor = 'var(--accent-primary)';
                          textColor = '#000';
                        } else if (isTabCompleted) {
                          bgColor = 'rgba(0, 230, 118, 0.15)';
                          borderColor = 'rgba(0, 230, 118, 0.6)';
                          textColor = '#00e676';
                        } else if (hasLoadedRoutine) {
                          bgColor = 'rgba(0, 195, 255, 0.1)';
                          borderColor = 'rgba(0, 195, 255, 0.5)';
                          textColor = '#00c3ff';
                        } else if (hasRoutine) {
                          bgColor = 'transparent';
                          borderColor = 'var(--border-light)';
                          textColor = 'var(--text-muted)';
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
                  {routineDays.map(day => {
                      const hasNextRoutine = !!(clientData?.nextRoutine?.[day] && clientData.nextRoutine[day].length > 0);
                      return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        style={{
                          padding: '10px 20px', whiteSpace: 'nowrap', borderRadius: '20px', fontWeight: 'bold', fontSize: '0.9rem', transition: 'all 0.3s',
                          background: selectedDay === day ? '#ffaa00' : 'transparent',
                          color: selectedDay === day ? '#000' : (hasNextRoutine ? 'var(--text-muted)' : 'rgba(255,255,255,0.2)'),
                          border: selectedDay === day ? '1px solid #ffaa00' : (hasNextRoutine ? '1px solid var(--border-light)' : '1px solid rgba(255,255,255,0.05)')
                        }}
                      >
                        {day.split(' - ')[0]}
                      </button>
                    )})}
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
