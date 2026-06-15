package com.example.fitness.controller;

import com.example.fitness.model.UserFree;
import com.example.fitness.model.TrainingPlan;
import com.example.fitness.model.TrainingDay;
import com.example.fitness.model.Exercise;
import com.example.fitness.service.UserFreeService;

public class UserFreeController {
    
    private UserFreeService userFreeService;
    
    public UserFreeController() {
        this.userFreeService = new UserFreeService();
    }
    
    public TrainingPlan createTrainingPlan(UserFree userFree, String title) {
        return userFreeService.createTrainingPlan(userFree, title);
    }
    
    public void addTrainingDay(UserFree userFree, TrainingPlan plan, TrainingDay day) {
        userFreeService.addTrainingDay(userFree, plan, day);
    }
    
    public void addExerciseToDay(UserFree userFree, TrainingDay day, Exercise exercise) {
        userFreeService.addExerciseToDay(userFree, day, exercise);
    }
}