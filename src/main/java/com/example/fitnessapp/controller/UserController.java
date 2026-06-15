package com.example.fitnessapp.controller;

import com.example.fitnessapp.dto.UserDto;
import com.example.fitnessapp.model.User;
import com.example.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/clients")
    public ResponseEntity<List<UserDto>> getMyClients() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentPrincipalName = auth.getName(); // this is the email
        
        User coach = userRepository.findByEmail(currentPrincipalName).orElseThrow();
        
        // This is a bit unoptimized without a specific query, but fine for H2 mock
        List<User> allUsers = userRepository.findAll();
        List<UserDto> clients = allUsers.stream()
                .filter(u -> u.getCoach() != null && u.getCoach().getId().equals(coach.getId()))
                .map(UserDto::new)
                .collect(Collectors.toList());
                
        return ResponseEntity.ok(clients);
    }
}
