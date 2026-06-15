package com.example.fitnessapp.controller;

import com.example.fitnessapp.dto.WorkoutDto;
import com.example.fitnessapp.model.User;
import com.example.fitnessapp.model.WorkoutSession;
import com.example.fitnessapp.repository.UserRepository;
import com.example.fitnessapp.repository.WorkoutSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/workouts")
public class WorkoutController {

    @Autowired
    private WorkoutSessionRepository workoutRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/finish")
    public ResponseEntity<?> finishWorkout(@RequestBody WorkoutDto request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User client = userRepository.findByEmail(auth.getName()).orElseThrow();

        WorkoutSession session = new WorkoutSession();
        session.setClient(client);
        session.setDayName(request.getDayName());
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());
        session.setSessionDate(LocalDate.now());
        session.setLogsJson(request.getLogsJson());
        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());

        WorkoutSession saved = workoutRepository.save(session);
        return ResponseEntity.ok(saved.getId());
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateWorkout(@PathVariable("id") UUID id, @RequestBody WorkoutDto request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User client = userRepository.findByEmail(auth.getName()).orElseThrow();

        WorkoutSession session = workoutRepository.findById(id).orElseThrow();
        if (!session.getClient().getId().equals(client.getId())) {
            return ResponseEntity.status(403).build();
        }

        session.setLogsJson(request.getLogsJson());
        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());
        
        // Update summary stats if they changed
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());

        workoutRepository.save(session);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/history/me")
    public ResponseEntity<List<WorkoutDto>> getMyHistory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User client = userRepository.findByEmail(auth.getName()).orElseThrow();

        return getHistory(client.getId());
    }

    @GetMapping("/history/{clientId}")
    public ResponseEntity<List<WorkoutDto>> getClientHistory(@PathVariable("clientId") UUID clientId) {
        return getHistory(clientId);
    }

    @GetMapping("/history/by-email/{email:.+}")
    public ResponseEntity<List<WorkoutDto>> getClientHistoryByEmail(@PathVariable("email") String email) {
        User client = userRepository.findByEmail(email).orElse(null);
        if (client == null) {
            return ResponseEntity.notFound().build();
        }
        return getHistory(client.getId());
    }

    private ResponseEntity<List<WorkoutDto>> getHistory(UUID clientId) {
        List<WorkoutSession> sessions = workoutRepository.findByClientIdOrderBySessionDateDesc(clientId);
        
        List<WorkoutDto> dtos = sessions.stream().map(s -> {
            WorkoutDto dto = new WorkoutDto();
            dto.setId(s.getId());
            dto.setDayName(s.getDayName());
            dto.setDurationSeconds(s.getDurationSeconds());
            dto.setTotalVolume(s.getTotalVolume());
            dto.setCompletedSets(s.getCompletedSets());
            dto.setCompletionPercentage(s.getCompletionPercentage());
            dto.setSessionDate(s.getSessionDate());
            dto.setLogsJson(s.getLogsJson());
            dto.setCommentsJson(s.getCommentsJson());
            dto.setVideoLinksJson(s.getVideoLinksJson());
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}
