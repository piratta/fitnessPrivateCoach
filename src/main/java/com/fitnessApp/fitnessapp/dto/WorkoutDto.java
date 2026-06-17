package com.fitnessApp.fitnessapp.dto;

import java.util.UUID;
import java.time.LocalDate;

public class WorkoutDto {
    private UUID id;
    private String dayName;
    private int durationSeconds;
    private double totalVolume;
    private int completedSets;
    private int completionPercentage;
    private LocalDate sessionDate;
    private String logsJson;
    private String commentsJson;
    private String videoLinksJson;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public String getDayName() { return dayName; }
    public void setDayName(String dayName) { this.dayName = dayName; }
    
    public int getDurationSeconds() { return durationSeconds; }
    public void setDurationSeconds(int durationSeconds) { this.durationSeconds = durationSeconds; }
    
    public double getTotalVolume() { return totalVolume; }
    public void setTotalVolume(double totalVolume) { this.totalVolume = totalVolume; }
    
    public int getCompletedSets() { return completedSets; }
    public void setCompletedSets(int completedSets) { this.completedSets = completedSets; }
    
    public int getCompletionPercentage() { return completionPercentage; }
    public void setCompletionPercentage(int completionPercentage) { this.completionPercentage = completionPercentage; }
    
    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }

    public String getLogsJson() { return logsJson; }
    public void setLogsJson(String logsJson) { this.logsJson = logsJson; }

    public String getCommentsJson() { return commentsJson; }
    public void setCommentsJson(String commentsJson) { this.commentsJson = commentsJson; }

    public String getVideoLinksJson() { return videoLinksJson; }
    public void setVideoLinksJson(String videoLinksJson) { this.videoLinksJson = videoLinksJson; }
}
