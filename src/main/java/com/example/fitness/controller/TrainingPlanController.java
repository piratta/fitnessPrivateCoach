package com.example.fitness.controller;

import com.example.fitness.model.TrainingPlan;
import com.example.fitness.model.Trainer;
import com.example.fitness.model.Client;
import com.example.fitness.service.TrainingPlanService;

public class TrainingPlanController {
    
    private TrainingPlanService trainingPlanService;
    
    public TrainingPlanController() {
        this.trainingPlanService = new TrainingPlanService();
    }
    
    public TrainingPlan createTrainingPlan(Trainer trainer, Client client, String title) {
        return trainingPlanService.createTrainingPlan(trainer, client, title);
    }
    
    public void addTrainingDay(TrainingPlan plan, com.example.fitness.model.TrainingDay day) {
        trainingPlanService.addTrainingDay(plan, day);
    }
    
    public void addExerciseToDay(com.example.fitness.model.TrainingDay day, 
                                com.example.fitness.model.Exercise exercise) {
        trainingPlanService.addExerciseToDay(day, exercise);
    }
}