package com.fitnessApp.fitnessapp.config;

import com.fitnessApp.fitnessapp.model.Role;
import com.fitnessApp.fitnessapp.model.User;
import com.fitnessApp.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.fitnessApp.fitnessapp.repository.WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            String encodedPassword = passwordEncoder.encode("1234");

            // Create Coach
            User coach = User.builder()
                    .email("antonio.ortiz@ficticio.com")
                    .passwordHash(encodedPassword)
                    .name("Antonio Ortiz Gómez")
                    .role(Role.COACH)
                    .build();

            coach.setUsername("antonio");
            coach.setMustChangePassword(false);
            coach = userRepository.save(coach);

            System.out.println("✅ Data seeded: antonio.ortiz@ficticio.com (antonio) with password '1234'");
        }

        // Repair phase: assign username to any pre-existing user that has username = null
        for (User u : userRepository.findAll()) {
            if (u.getUsername() == null) {
                String baseUsername = u.getEmail().split("@")[0];
                u.setUsername(baseUsername);
                u.setMustChangePassword(false);
                userRepository.save(u);
                System.out.println("🔧 Assigned username '" + baseUsername + "' to existing user: " + u.getEmail());
            }
        }
    }
}
