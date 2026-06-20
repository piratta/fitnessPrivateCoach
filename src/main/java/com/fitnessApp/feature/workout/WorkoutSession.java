package com.fitnessApp.feature.workout;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fitnessApp.feature.user.User;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnore
    private User client;

    @Column(nullable = false)
    private String dayName;

    private int durationSeconds;
    private double totalVolume;
    private int completedSets;
    private int completionPercentage;

    private Integer stress;
    private Integer fatigue;
    private Integer motivation;
    private Float sleepHours;
    private Integer digestions;

    @Column(nullable = false)
    private LocalDate sessionDate;

    private LocalDate assignedDate;

    private Boolean isSkipped = false;

    @Enumerated(EnumType.STRING)
    private WorkoutStatus status = WorkoutStatus.IN_PROGRESS;

    private String clientComments;
    private String videoLink;

    @Column(columnDefinition = "TEXT")
    private String logsJson;

    @Column(columnDefinition = "TEXT")
    private String commentsJson;

    @Column(columnDefinition = "TEXT")
    private String videoLinksJson;

    @Column(columnDefinition = "TEXT")
    private String routineSnapshotJson;

    @OneToMany(mappedBy = "workoutSession", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SetLog> sets = new ArrayList<>();

    public WorkoutSession() {}

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public User getClient() { return client; }
    public void setClient(User client) { this.client = client; }

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

    public Integer getStress() { return stress; }
    public void setStress(Integer stress) { this.stress = stress; }

    public Integer getFatigue() { return fatigue; }
    public void setFatigue(Integer fatigue) { this.fatigue = fatigue; }

    public Integer getMotivation() { return motivation; }
    public void setMotivation(Integer motivation) { this.motivation = motivation; }

    public Float getSleepHours() { return sleepHours; }
    public void setSleepHours(Float sleepHours) { this.sleepHours = sleepHours; }

    public Integer getDigestions() { return digestions; }
    public void setDigestions(Integer digestions) { this.digestions = digestions; }

    public LocalDate getSessionDate() { return sessionDate; }
    public void setSessionDate(LocalDate sessionDate) { this.sessionDate = sessionDate; }

    public LocalDate getAssignedDate() { return assignedDate; }
    public void setAssignedDate(LocalDate assignedDate) { this.assignedDate = assignedDate; }

    public WorkoutStatus getStatus() { return status; }
    public void setStatus(WorkoutStatus status) { this.status = status; }

    public boolean isSkipped() { return isSkipped != null && isSkipped; }
    public void setSkipped(boolean skipped) { isSkipped = skipped; }

    public String getClientComments() { return clientComments; }
    public void setClientComments(String clientComments) { this.clientComments = clientComments; }

    public String getVideoLink() { return videoLink; }
    public void setVideoLink(String videoLink) { this.videoLink = videoLink; }

    public List<SetLog> getSets() { return sets; }
    public void setSets(List<SetLog> sets) { this.sets = sets; }

    public String getLogsJson() { return logsJson; }
    public void setLogsJson(String logsJson) { this.logsJson = logsJson; }

    public String getCommentsJson() { return commentsJson; }
    public void setCommentsJson(String commentsJson) { this.commentsJson = commentsJson; }

    public String getVideoLinksJson() { return videoLinksJson; }
    public void setVideoLinksJson(String videoLinksJson) { this.videoLinksJson = videoLinksJson; }

    public String getRoutineSnapshotJson() { return routineSnapshotJson; }
    public void setRoutineSnapshotJson(String routineSnapshotJson) { this.routineSnapshotJson = routineSnapshotJson; }

    public void addSetLog(SetLog setLog) {
        sets.add(setLog);
        setLog.setWorkoutSession(this);
    }
}
