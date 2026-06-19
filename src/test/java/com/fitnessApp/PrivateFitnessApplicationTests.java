package com.fitnessApp;

import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class PrivateFitnessApplicationTests {

    @Autowired
    private UserRepository userRepository;

    @Test
    void printUsers() {
        System.out.println("=== START USERS LIST ===");
        userRepository.findAll().forEach(u -> {
            System.out.printf("Email: %s | Username: %s | Role: %s | Name: %s | Onboarding: %b\n",
                    u.getEmail(), u.getUsername(), u.getRole(), u.getName(), u.getOnboardingCompleted());
        });
        System.out.println("=== END USERS LIST ===");
    }
}
