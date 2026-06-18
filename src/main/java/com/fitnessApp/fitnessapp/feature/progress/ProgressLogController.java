package com.fitnessApp.fitnessapp.feature.progress;

import com.fitnessApp.fitnessapp.feature.user.User;
import com.fitnessApp.fitnessapp.feature.user.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    /**
     * UPSERT: a measurement is unique per (client, day). If the client logs again on the same
     * date (e.g. several weights the same day) we update the existing row instead of inserting a
     * duplicate, so the last value entered wins and no new column appears in the comparison view.
     * Only non-null fields overwrite the previous ones (a weight-only quick entry keeps the
     * measurements already recorded for that day).
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> addProgressLog(@RequestBody ProgressLog log) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        User client = userRepository.findByEmail(email).orElseThrow();

        LocalDate date = log.getLogDate() != null ? log.getLogDate() : LocalDate.now();

        ProgressLog entity = progressLogRepository.findByClientAndLogDate(client, date)
                .orElseGet(ProgressLog::new);
        entity.setClient(client);
        entity.setLogDate(date);

        if (log.getWeight() != null) entity.setWeight(log.getWeight());
        if (log.getWaist() != null)  entity.setWaist(log.getWaist());
        if (log.getHip() != null)    entity.setHip(log.getHip());
        if (log.getNeck() != null)   entity.setNeck(log.getNeck());
        if (log.getBiceps() != null) entity.setBiceps(log.getBiceps());
        if (log.getLeg() != null)    entity.setLeg(log.getLeg());
        if (log.getChest() != null)   entity.setChest(log.getChest());
        if (log.getCalf() != null)    entity.setCalf(log.getCalf());
        if (log.getForearm() != null) entity.setForearm(log.getForearm());
        if (log.getBack() != null)    entity.setBack(log.getBack());

        ProgressLog saved = progressLogRepository.save(entity);
        return ResponseEntity.ok(saved);
    }
}
