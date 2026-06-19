package com.fitnessApp.feature.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;

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
    private List<String> strategies;
    private String progressionStrategy;
    private String username;
    private boolean mustChangePassword;
    private boolean onboardingCompleted;
    private String reviewFrequency;
    private String billingPlanId;
    private String routineJson;
    private String nextRoutineJson;
    private String personalRecordsJson;
    private LocalDateTime routineUpdatedAt;
    private LocalDate routineStartDate;
    private LocalDate routineEndDate;
    private LocalDateTime lastReviewDate;
    private LocalDateTime nextReviewAt;
    private LocalDateTime createdAt;
    private Double currentWeight;
    private Integer compliance;

}