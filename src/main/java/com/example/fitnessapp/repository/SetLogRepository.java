package com.example.fitnessapp.repository;

import com.example.fitnessapp.model.SetLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface SetLogRepository extends JpaRepository<SetLog, UUID> {
}
