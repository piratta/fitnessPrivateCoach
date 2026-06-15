package com.example.fitness.service;

import com.example.fitness.model.UserFree;
import com.example.fitness.model.TrainingPlan;
import com.example.fitness.model.Exercise;
import com.example.fitness.model.TrainingDay;

import java.time.LocalDateTime;
import java.time.Month;
import java.util.ArrayList;

public class UserFreeService {

    public TrainingPlan createTrainingPlan(UserFree userFree, String title) {
        // Validar que el usuario gratuito pueda crear un plan
        if (userFree == null) {
            throw new IllegalArgumentException("Usuario gratuito inválido");
        }

        // Validar límites de uso para usuarios gratuitos
        validateUserFreeLimits(userFree);

        TrainingPlan plan = new TrainingPlan();
        plan.setClient(null); // No tiene cliente asignado
        plan.setTrainer(null); // No tiene entrenador asignado
        plan.setTitle(title);
        plan.setCreatedAt(LocalDateTime.now());

        return plan;
    }

    public void addTrainingDay(UserFree userFree, TrainingPlan plan, TrainingDay day) {
        // Validar que el usuario gratuito pueda agregar días
        validateUserFreeLimits(userFree);

        if (plan.getTrainingDays() == null) {
            plan.setTrainingDays(new ArrayList<>());
        }

        // Validar límite de 1 semana por mes
        validateWeeklyLimit(plan, userFree);

        plan.getTrainingDays().add(day);
    }

    public void addExerciseToDay(UserFree userFree, TrainingDay day, Exercise exercise) {
        // Validar que el usuario gratuito pueda agregar ejercicios
        if (day.getExercises() == null) {
            day.setExercises(new ArrayList<>());
        }

        // Validar límite de 3 ejercicios por día para usuarios gratuitos
        if (day.getExercises().size() >= 3) {
            throw new IllegalArgumentException("Los usuarios gratuitos solo pueden tener hasta 3 ejercicios por día");
        }

        day.getExercises().add(exercise);
    }

    private void validateUserFreeLimits(UserFree userFree) {
        // Validar que el usuario gratuito no haya excedido sus límites
        if (userFree.getTrainingPlans() != null && userFree.getTrainingPlans().size() > 10) { // Límite razonable
            throw new IllegalArgumentException("Has alcanzado el límite máximo de planes de entrenamiento");
        }
    }

    private void validateWeeklyLimit(TrainingPlan plan, UserFree userFree) {
        // Validar que no se exceda la semana por mes para usuarios gratuitos
        LocalDateTime now = LocalDateTime.now();
        int currentWeek = now.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        Month currentMonth = now.getMonth();

        // Contar planes de entrenamiento en el mismo mes y semana
        long count = plan.getTrainingDays().stream()
                .filter(day -> {
                    LocalDateTime dayDate = day.getCreatedAt();
                    return dayDate.getMonth() == currentMonth &&
                            dayDate.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR) == currentWeek;
                })
                .count();

        if (count >= 1) { // Solo se permite un plan por semana
            throw new IllegalArgumentException(
                    "Los usuarios gratuitos solo pueden crear un plan por semana dentro de cada mes");
        }
    }
}