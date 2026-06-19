package com.fitnessApp.feature.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    private String nextRoutineJson;
    private LocalDateTime routineUpdatedAt;
    private LocalDateTime lastReviewDate;
    private LocalDateTime nextReviewAt;
    private LocalDateTime createdAt;

    public UserDto(User user) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.name = user.getName();

        String ln = user.getLastName();
        this.lastName = (ln != null && ln.equalsIgnoreCase(user.getUsername())) ? null : ln;
        this.birthDate = user.getBirthDate();
        this.role = user.getRole().name();
        this.status = user.getStatus();
        this.goal = user.getGoal();
        this.progressionStrategy = user.getProgressionStrategy();
        this.username = user.getUsername();
        this.mustChangePassword = user.isMustChangePassword();
        this.onboardingCompleted = Boolean.TRUE.equals(user.getOnboardingCompleted());
        this.reviewFrequency = user.getReviewFrequency();
        this.routineJson = user.getRoutineJson();
        this.nextRoutineJson = user.getNextRoutineJson();
        this.routineUpdatedAt = user.getRoutineUpdatedAt();
        this.lastReviewDate = user.getLastReviewDate();
        this.nextReviewAt = user.getNextReviewAt();
        this.createdAt = user.getCreatedAt();
    }
}