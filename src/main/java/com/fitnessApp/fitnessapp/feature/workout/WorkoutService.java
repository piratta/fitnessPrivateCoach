package com.fitnessApp.fitnessapp.feature.workout;

import com.fitnessApp.fitnessapp.feature.user.User;
import com.fitnessApp.fitnessapp.feature.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service // ¡Esta anotación es la clave!
public class WorkoutService {

    @Autowired
    private WorkoutSessionRepository workoutRepository;

    @Autowired
    private UserRepository userRepository;

    public UUID finishWorkout(String principalEmail, WorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail)
                .or(() -> userRepository.findByUsername(principalEmail))
                .orElseThrow();

        LocalDate today = LocalDate.now();
        WorkoutSession session = workoutRepository
                .findFirstByClientAndDayNameAndSessionDate(client, request.getDayName(), today)
                .orElseGet(WorkoutSession::new);

        session.setClient(client);
        session.setDayName(request.getDayName());
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());
        session.setSessionDate(today);
        session.setLogsJson(request.getLogsJson());
        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());

        return workoutRepository.save(session).getId();
    }

    public void updateWorkout(String principalEmail, UUID id, WorkoutDto request) {
        User client = userRepository.findByEmail(principalEmail).orElseThrow();
        WorkoutSession session = workoutRepository.findById(id).orElseThrow();

        if (!session.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("No tienes permisos para modificar este entrenamiento.");
        }

        session.setLogsJson(request.getLogsJson());
        session.setCommentsJson(request.getCommentsJson());
        session.setVideoLinksJson(request.getVideoLinksJson());
        session.setDurationSeconds(request.getDurationSeconds());
        session.setTotalVolume(request.getTotalVolume());
        session.setCompletedSets(request.getCompletedSets());
        session.setCompletionPercentage(request.getCompletionPercentage());

        workoutRepository.save(session);
    }

    public List<WorkoutDto> getHistory(UUID clientId) {
        List<WorkoutSession> sessions = workoutRepository.findByClientIdOrderBySessionDateDesc(clientId);
        return sessions.stream().map(s -> {
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
    }

    public List<WorkoutDto> getHistoryByEmail(String email) {
        User client = userRepository.findByEmail(email).orElse(null);
        if (client == null) return null;
        return getHistory(client.getId());
    }
}