package com.example.fitness.model;

import java.time.LocalDateTime;
import java.util.List;

public class TrainingPlan {
    private Long id;
    private Trainer trainer;
    private Client client;
    private String title;
    private String description;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private List<TrainingDay> trainingDays;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Constructor
    public TrainingPlan() {}
    
    public TrainingPlan(Trainer trainer, Client client, String title) {
        this.trainer = trainer;
        this.client = client;
        this.title = title;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Trainer getTrainer() { return trainer; }
    public void setTrainer(Trainer trainer) { this.trainer = trainer; }
    
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }
    
    public LocalDateTime getEndDate() { return endDate; }
    public void setEndDate(LocalDateTime endDate) { this.endDate = endDate; }
    
    public List<TrainingDay> getTrainingDays() { return trainingDays; }
    public void setTrainingDays(List<TrainingDay> trainingDays) { this.trainingDays = trainingDays; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}