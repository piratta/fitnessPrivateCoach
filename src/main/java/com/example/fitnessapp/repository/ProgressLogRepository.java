package com.example.fitnessapp.repository;

import com.example.fitnessapp.model.ProgressLog;
import com.example.fitnessapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ProgressLogRepository extends JpaRepository<ProgressLog, UUID> {
    List<ProgressLog> findByClientOrderByLogDateAsc(User client);
}
