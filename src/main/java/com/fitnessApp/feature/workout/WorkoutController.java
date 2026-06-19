package com.fitnessApp.feature.workout;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/workouts")
@RequiredArgsConstructor
public class WorkoutController {

    private final WorkoutService workoutService;

    @PostMapping("/finish")
    public ResponseEntity<UUID> finishWorkout(@RequestBody WorkoutDto request) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        UUID sessionId = workoutService.finishWorkout(principal, request);
        return ResponseEntity.ok(sessionId);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Void> updateWorkout(@PathVariable("id") UUID id, @RequestBody WorkoutDto request) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        workoutService.updateWorkout(principal, id, request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/history/me")
    public ResponseEntity<List<WorkoutDto>> getMyHistory() {
        // En un caso real, buscarías tu propio ID por email.
        // Como simplificación temporal, redirigimos la petición usando el email:
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return getClientHistoryByEmail(email);
    }

    @GetMapping("/history/{clientId}")
    public ResponseEntity<List<WorkoutDto>> getClientHistory(@PathVariable("clientId") UUID clientId) {
        return ResponseEntity.ok(workoutService.getHistory(clientId));
    }

    @GetMapping("/history/by-email/{email:.+}")
    public ResponseEntity<List<WorkoutDto>> getClientHistoryByEmail(@PathVariable("email") String email) {
        List<WorkoutDto> history = workoutService.getHistoryByEmail(email);
        if (history == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(history);
    }
}