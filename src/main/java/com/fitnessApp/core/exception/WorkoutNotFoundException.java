package com.fitnessApp.core.exception;

import jakarta.persistence.EntityNotFoundException;

public class WorkoutNotFoundException extends EntityNotFoundException {
    public WorkoutNotFoundException(String message) {
        super(message);
    }
}
