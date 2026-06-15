package com.example.fitness.service;

import com.example.fitness.model.TrainingPlan;
import com.example.fitness.model.Trainer;
import com.example.fitness.model.Client;
import com.example.fitness.model.Exercise;
import com.example.fitness.model.TrainingDay;

public class TrainingPlanService {

    public TrainingPlan createTrainingPlan(Trainer trainer, Client client, String title) {
        // Validar que el entrenador pueda crear planes para este cliente
        if (trainer == null || client == null || !trainer.getId().equals(client.getTrainer().getId())) {
            throw new IllegalArgumentException("El entrenador no tiene permisos para crear planes para este cliente");
        }

        TrainingPlan plan = new TrainingPlan(trainer, client, title);
        // Aquí iría la lógica de persistencia
        return plan;
    }

    public void addTrainingDay(TrainingPlan plan, TrainingDay day) {
        // Validar que el día no esté ya asignado
        if (plan.getTrainingDays() == null) {
            plan.setTrainingDays(new java.util.ArrayList<>());
        }

        // Validar que no se exceda el límite de días (lunes a viernes por defecto)
        if (plan.getTrainingDays().size() >= 5 && day.getDayOfWeek().getValue() > 5) {
            throw new IllegalArgumentException("No se pueden agregar más días de entrenamiento en la semana laboral");
        }

        plan.getTrainingDays().add(day);
    }

    public void addExerciseToDay(TrainingDay day, Exercise exercise) {
        if (day.getExercises() == null) {
            day.setExercises(new java.util.ArrayList<>());
        }

        // Validar que no se exceda el límite de ejercicios por día
        if (day.getExercises().size() >= 10) { // Límite razonable, puede ajustarse
            throw new IllegalArgumentException("No se pueden agregar más ejercicios a este día");
        }

        day.getExercises().add(exercise);
    }
}