package com.fitnessApp.feature.workout;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;

@Entity
@Table(name = "set_logs")
public class SetLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workout_session_id", nullable = false)
    private WorkoutSession workoutSession;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "routine_exercise_id", nullable = true)
    private RoutineExercise routineExercise;

    private String exerciseName;
    private int exerciseIndex;

    private int setIndex;
    private double weightLifted;
    private String repsDone; 
    private boolean isCompleted;

    @Min(value = 0, message = "El RIR no puede ser negativo")
    private Integer rir;

    @Min(value = 1, message = "El RPE debe ser al menos 1")
    @Max(value = 10, message = "El RPE no puede ser mayor a 10")
    private Double rpe;

    private String tempo;

    public SetLog() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public WorkoutSession getWorkoutSession() { return workoutSession; }
    public void setWorkoutSession(WorkoutSession workoutSession) { this.workoutSession = workoutSession; }

    public RoutineExercise getRoutineExercise() { return routineExercise; }
    public void setRoutineExercise(RoutineExercise routineExercise) { this.routineExercise = routineExercise; }

    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }

    public int getExerciseIndex() { return exerciseIndex; }
    public void setExerciseIndex(int exerciseIndex) { this.exerciseIndex = exerciseIndex; }

    public int getSetIndex() { return setIndex; }
    public void setSetIndex(int setIndex) { this.setIndex = setIndex; }

    public double getWeightLifted() { return weightLifted; }
    public void setWeightLifted(double weightLifted) { this.weightLifted = weightLifted; }

    public String getRepsDone() { return repsDone; }
    public void setRepsDone(String repsDone) { this.repsDone = repsDone; }

    public boolean isCompleted() { return isCompleted; }
    public void setCompleted(boolean completed) { isCompleted = completed; }

    public Integer getRir() { return rir; }
    public void setRir(Integer rir) { this.rir = rir; }

    public Double getRpe() { return rpe; }
    public void setRpe(Double rpe) { this.rpe = rpe; }

    public String getTempo() { return tempo; }
    public void setTempo(String tempo) { this.tempo = tempo; }
}
