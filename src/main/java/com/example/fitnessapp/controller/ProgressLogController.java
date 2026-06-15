package com.example.fitnessapp.controller;

import com.example.fitnessapp.model.ProgressLog;
import com.example.fitnessapp.model.User;
import com.example.fitnessapp.repository.ProgressLogRepository;
import com.example.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
public class ProgressLogController {

    @Autowired
    private ProgressLogRepository progressLogRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/history")
    public ResponseEntity<List<ProgressLog>> getProgressHistory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User client = userRepository.findByEmail(email).orElseThrow();
        
        List<ProgressLog> history = progressLogRepository.findByClientOrderByLogDateAsc(client);
        return ResponseEntity.ok(history);
    }
    
    @GetMapping("/history/by-email/{email:.+}")
    public ResponseEntity<List<ProgressLog>> getProgressHistoryByEmail(@PathVariable("email") String email) {
        User client = userRepository.findByEmail(email).orElse(null);
        if (client == null) {
            return ResponseEntity.notFound().build();
        }
        List<ProgressLog> history = progressLogRepository.findByClientOrderByLogDateAsc(client);
        return ResponseEntity.ok(history);
    }

    @PostMapping
    public ResponseEntity<?> addProgressLog(@RequestBody ProgressLog log) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User client = userRepository.findByEmail(email).orElseThrow();
        
        log.setClient(client);
        ProgressLog saved = progressLogRepository.save(log);
        return ResponseEntity.ok(saved);
    }
}
