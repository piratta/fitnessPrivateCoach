package com.example.fitnessapp.model;

import jakarta.persistence.*;
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
    @JoinColumn(name = "routine_exercise_id", nullable = false)
    private RoutineExercise routineExercise;

    private int setIndex;
    private double weightLifted;
    private String repsDone; 
    private boolean isCompleted;

    public SetLog() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public WorkoutSession getWorkoutSession() { return workoutSession; }
    public void setWorkoutSession(WorkoutSession workoutSession) { this.workoutSession = workoutSession; }

    public RoutineExercise getRoutineExercise() { return routineExercise; }
    public void setRoutineExercise(RoutineExercise routineExercise) { this.routineExercise = routineExercise; }

    public int getSetIndex() { return setIndex; }
    public void setSetIndex(int setIndex) { this.setIndex = setIndex; }

    public double getWeightLifted() { return weightLifted; }
    public void setWeightLifted(double weightLifted) { this.weightLifted = weightLifted; }

    public String getRepsDone() { return repsDone; }
    public void setRepsDone(String repsDone) { this.repsDone = repsDone; }

    public boolean isCompleted() { return isCompleted; }
    public void setCompleted(boolean completed) { isCompleted = completed; }
}
