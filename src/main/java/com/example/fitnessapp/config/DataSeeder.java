package com.example.fitnessapp.config;

import com.example.fitnessapp.model.Role;
import com.example.fitnessapp.model.User;
import com.example.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.example.fitnessapp.repository.WorkoutSessionRepository workoutSessionRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            String encodedPassword = passwordEncoder.encode("1234");

            // Create Coach
            User coach = new User("antonio@test.com", encodedPassword, "Antonio Entrenador", Role.COACH);
            coach.setUsername("antonio");
            coach.setMustChangePassword(false);
            coach = userRepository.save(coach);

            // Create Client
            User carlos = new User("carlos@test.com", encodedPassword, "Carlos Cliente", Role.PREMIUM_CLIENT);
            carlos.setUsername("carlos");
            carlos.setMustChangePassword(false);
            carlos.setCoach(coach);
            carlos.setStatus("Activo");
            carlos = userRepository.save(carlos);

            // Create another client
            User laura = new User("laura@test.com", encodedPassword, "Laura Martínez", Role.PREMIUM_CLIENT);
            laura.setUsername("laura");
            laura.setMustChangePassword(false);
            laura.setCoach(coach);
            laura.setStatus("Activo");
            userRepository.save(laura);

            // Seed fake workouts for Carlos
            com.example.fitnessapp.model.WorkoutSession session1 = new com.example.fitnessapp.model.WorkoutSession();
            session1.setClient(carlos);
            session1.setDayName("Día 1 - Pecho y Tríceps");
            session1.setDurationSeconds(3600); // 1 hour
            session1.setTotalVolume(8500);
            session1.setCompletedSets(15);
            session1.setCompletionPercentage(100);
            session1.setSessionDate(java.time.LocalDate.now().minusDays(2));
            
            com.example.fitnessapp.model.WorkoutSession session2 = new com.example.fitnessapp.model.WorkoutSession();
            session2.setClient(carlos);
            session2.setDayName("Día 2 - Espalda y Bíceps");
            session2.setDurationSeconds(3200); // 53 mins
            session2.setTotalVolume(7200);
            session2.setCompletedSets(12);
            session2.setCompletionPercentage(90);
            session2.setSessionDate(java.time.LocalDate.now().minusDays(1));

            workoutSessionRepository.save(session1);
            workoutSessionRepository.save(session2);

            System.out.println("✅ Data seeded: antonio@test.com (antonio) and carlos@test.com (carlos) with password '1234'");
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
