package com.fitnessApp.feature.workout;

public class StartWorkoutDto {
    private String dayName;
    private String routineSnapshotJson;

    public String getDayName() {
        return dayName;
    }

    public void setDayName(String dayName) {
        this.dayName = dayName;
    }

    public String getRoutineSnapshotJson() {
        return routineSnapshotJson;
    }

    public void setRoutineSnapshotJson(String routineSnapshotJson) {
        this.routineSnapshotJson = routineSnapshotJson;
    }
}
