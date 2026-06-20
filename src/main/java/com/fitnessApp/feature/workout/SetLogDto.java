package com.fitnessApp.feature.workout;

public class SetLogDto {
    private int exerciseIndex;
    private int setIndex;
    private String exerciseName;
    private double weightLifted;
    private String repsDone;
    private Integer rir;
    private Double rpe;
    private String tempo;
    private boolean isCompleted;

    public int getExerciseIndex() { return exerciseIndex; }
    public void setExerciseIndex(int exerciseIndex) { this.exerciseIndex = exerciseIndex; }

    public int getSetIndex() { return setIndex; }
    public void setSetIndex(int setIndex) { this.setIndex = setIndex; }

    public String getExerciseName() { return exerciseName; }
    public void setExerciseName(String exerciseName) { this.exerciseName = exerciseName; }

    public double getWeightLifted() { return weightLifted; }
    public void setWeightLifted(double weightLifted) { this.weightLifted = weightLifted; }

    public String getRepsDone() { return repsDone; }
    public void setRepsDone(String repsDone) { this.repsDone = repsDone; }

    public Integer getRir() { return rir; }
    public void setRir(Integer rir) { this.rir = rir; }

    public Double getRpe() { return rpe; }
    public void setRpe(Double rpe) { this.rpe = rpe; }

    public String getTempo() { return tempo; }
    public void setTempo(String tempo) { this.tempo = tempo; }

    public boolean isCompleted() { return isCompleted; }
    public void setCompleted(boolean completed) { isCompleted = completed; }
}
