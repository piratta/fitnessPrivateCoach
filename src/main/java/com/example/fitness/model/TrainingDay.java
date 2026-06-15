package com.example.fitness.model;

import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.List;

public class TrainingDay {
    private Long id;
    private TrainingPlan trainingPlan;
    private DayOfWeek dayOfWeek;
    private String title;
    private String description;
    private List<Exercise> exercises;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Constructor
    public TrainingDay() {}
    
    public TrainingDay(TrainingPlan trainingPlan, DayOfWeek dayOfWeek, String title) {
        this.trainingPlan = trainingPlan;
        this.dayOfWeek = dayOfWeek;
        this.title = title;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public TrainingPlan getTrainingPlan() { return trainingPlan; }
    public void setTrainingPlan(TrainingPlan trainingPlan) { this.trainingPlan = trainingPlan; }
    
    public DayOfWeek getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(DayOfWeek dayOfWeek) { this.dayOfWeek = dayOfWeek; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public List<Exercise> getExercises() { return exercises; }
    public void setExercises(List<Exercise> exercises) { this.exercises = exercises; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}