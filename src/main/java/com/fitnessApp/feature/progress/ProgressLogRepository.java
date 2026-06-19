package com.fitnessApp.feature.progress;

import com.fitnessApp.feature.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProgressLogRepository extends JpaRepository<ProgressLog, UUID> {
    List<ProgressLog> findByClientOrderByLogDateAsc(User client);

    Optional<ProgressLog> findTopByClientOrderByLogDateDesc(User client);

    // Used by the UPSERT logic so that several entries on the same day collapse into one row.
    Optional<ProgressLog> findByClientAndLogDate(User client, LocalDate logDate);
}
