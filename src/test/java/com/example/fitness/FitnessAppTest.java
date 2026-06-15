package com.example.fitness;

import com.example.fitness.model.*;
import com.example.fitness.service.TrainingPlanService;
import com.example.fitness.service.UserFreeService;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class FitnessAppTest {
    
    @Test
    public void testUserCreation() {
        User user = new User("testuser", "test@example.com", "password123", UserRole.USUARIO_GRATUITO);
        assertNotNull(user);
        assertEquals("testuser", user.getUsername());
        assertEquals(UserRole.USUARIO_GRATUITO, user.getRole());
    }
    
    @Test
    public void testTrainerCreation() {
        User user = new User("trainer", "trainer@example.com", "password123", UserRole.ENTRENADEOR_ADMIN);
        Trainer trainer = new Trainer(user, "John", "Doe");
        assertNotNull(trainer);
        assertEquals("John", trainer.getFirstName());
        assertEquals("Doe", trainer.getLastName());
    }
    
    @Test
    public void testClientCreation() {
        User user = new User("client", "client@example.com", "password123", UserRole.USUARIO_VINCULADO);
        User trainerUser = new User("trainer", "trainer@example.com", "password123", UserRole.ENTRENADEOR_ADMIN);
        Trainer trainer = new Trainer(trainerUser, "Jane", "Smith");
        Client client = new Client(user, trainer, "Alice", "Johnson");
        assertNotNull(client);
        assertEquals("Alice", client.getFirstName());
        assertEquals("Johnson", client.getLastName());
    }
    
    @Test
    public void testExerciseCreation() {
        Exercise exercise = new Exercise("Press de banca", "Ejercicio de fuerza para pecho");
        assertNotNull(exercise);
        assertEquals("Press de banca", exercise.getName());
        assertEquals("Ejercicio de fuerza para pecho", exercise.getDescription());
    }
    
    @Test
    public void testTrainingPlanService() {
        TrainingPlanService service = new TrainingPlanService();
        assertNotNull(service);
    }

    @Test
    public void testUserFreeService() {
        UserFreeService service = new UserFreeService();
        assertNotNull(service);
    }
}