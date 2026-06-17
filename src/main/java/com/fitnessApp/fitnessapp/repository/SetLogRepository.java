package com.fitnessApp.fitnessapp.repository;

import com.fitnessApp.fitnessapp.model.SetLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SetLogRepository extends JpaRepository<SetLog, UUID> {
}
