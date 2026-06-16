package com.example.fitnessapp.dto;

import com.example.fitnessapp.model.User;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class UserDto {
    private UUID id;
    private String email;
    private String name;
    private String lastName;
    private LocalDate birthDate;
    private String role;
    private String status;
    private String goal;
    private String progressionStrategy;
    private String username;
    private boolean mustChangePassword;
    private boolean onboardingCompleted;
    private String reviewFrequency;
    private String billingPlanId;
    private String routineJson;
    private LocalDateTime lastReviewDate;
    private LocalDateTime nextReviewAt;
    private LocalDateTime createdAt;

    public UserDto() {
    }

    public UserDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();
        this.lastName = user.getLastName();
        this.birthDate = user.getBirthDate();
        this.role = user.getRole().name();
        this.status = user.getStatus();
        this.goal = user.getGoal();
        this.progressionStrategy = user.getProgressionStrategy();
        this.username = user.getUsername();
        this.mustChangePassword = user.isMustChangePassword();
        this.onboardingCompleted = user.isOnboardingCompleted();
        this.reviewFrequency = user.getReviewFrequency();
        this.routineJson = user.getRoutineJson();
        this.lastReviewDate = user.getLastReviewDate();
        this.nextReviewAt = user.getNextReviewAt();
        this.createdAt = user.getCreatedAt();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getGoal() { return goal; }
    public void setGoal(String goal) { this.goal = goal; }

    public String getProgressionStrategy() { return progressionStrategy; }
    public void setProgressionStrategy(String progressionStrategy) { this.progressionStrategy = progressionStrategy; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public boolean isMustChangePassword() { return mustChangePassword; }
    public void setMustChangePassword(boolean mustChangePassword) { this.mustChangePassword = mustChangePassword; }

    public boolean isOnboardingCompleted() { return onboardingCompleted; }
    public void setOnboardingCompleted(boolean onboardingCompleted) { this.onboardingCompleted = onboardingCompleted; }

    public LocalDateTime getLastReviewDate() { return lastReviewDate; }
    public void setLastReviewDate(LocalDateTime lastReviewDate) { this.lastReviewDate = lastReviewDate; }

    public LocalDateTime getNextReviewAt() { return nextReviewAt; }
    public void setNextReviewAt(LocalDateTime nextReviewAt) { this.nextReviewAt = nextReviewAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getReviewFrequency() { return reviewFrequency; }
    public void setReviewFrequency(String reviewFrequency) { this.reviewFrequency = reviewFrequency; }

    public String getBillingPlanId() { return billingPlanId; }
    public void setBillingPlanId(String billingPlanId) { this.billingPlanId = billingPlanId; }

    public String getRoutineJson() { return routineJson; }
    public void setRoutineJson(String routineJson) { this.routineJson = routineJson; }
}
