package com.fitnessApp.fitness.controller;

import com.fitnessApp.fitness.model.TrainingPlan;
import com.fitnessApp.fitness.model.Trainer;
import com.fitnessApp.fitness.model.Client;
import com.fitnessApp.fitness.service.TrainingPlanService;

public class TrainingPlanController {
    
    private TrainingPlanService trainingPlanService;
    
    public TrainingPlanController() {
        this.trainingPlanService = new TrainingPlanService();
    }
    
    public TrainingPlan createTrainingPlan(Trainer trainer, Client client, String title) {
        return trainingPlanService.createTrainingPlan(trainer, client, title);
    }
    
    public void addTrainingDay(TrainingPlan plan, com.fitnessApp.fitness.model.TrainingDay day) {
        trainingPlanService.addTrainingDay(plan, day);
    }
    
    public void addExerciseToDay(com.fitnessApp.fitness.model.TrainingDay day, 
                                com.fitnessApp.fitness.model.Exercise exercise) {
        trainingPlanService.addExerciseToDay(day, exercise);
    }
}