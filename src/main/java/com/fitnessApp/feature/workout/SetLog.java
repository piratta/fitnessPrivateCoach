package com.fitnessApp.feature.workout;

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

    private int exerciseIndex;
    private int setIndex;
    
    private String exerciseName;
    private String weight;
    private String reps; 
    private boolean completed;
    private boolean skipped;
    private String intensity;
    
    @Column(columnDefinition = "TEXT")
    private String notes;

    public SetLog() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public WorkoutSession getWorkoutSession() { return workoutSession; }
    public void setWorkoutSession(WorkoutSession workoutSession) { this.workoutSession = workoutSession; }

    public int getExerciseIndex() { return exerciseIndex; }
    public void setExerciseIndex(int exerciseIndex) { this.exerciseIndex = exerciseIndex; }

    public int getSetIndex() { return setIndex; }
    public void setSetIndex(int setIndex) { this.setIndex = setIndex; }

    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }

    public String getWeight() { return weight; }
    public void setWeight(String weight) { this.weight = weight; }

    public String getReps() { return reps; }
    public void setReps(String reps) { this.reps = reps; }

    public boolean isCompleted() { return completed; }
    public void setCompleted(boolean completed) { this.completed = completed; }

    public boolean isSkipped() { return skipped; }
    public void setSkipped(boolean skipped) { this.skipped = skipped; }

    public String getIntensity() { return intensity; }
    public void setIntensity(String intensity) { this.intensity = intensity; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
