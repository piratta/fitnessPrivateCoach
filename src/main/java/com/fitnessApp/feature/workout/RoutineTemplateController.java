package com.fitnessApp.feature.workout;

import com.fitnessApp.feature.user.Role;
import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;

/**
 * Coach-scoped CRUD of routine templates. All operations require COACH / SUPER_ADMIN role and
 * are guarded by ownership: a coach can only see / modify their own library.
 */
@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class RoutineTemplateController {

    private final RoutineTemplateRepository repo;
    private final UserRepository userRepo;

    private User currentCoach() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión expirada.");
        }
        String principal = auth.getName();
        User user = userRepo.findByEmail(principal)
                .or(() -> userRepo.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));
        if (user.getRole() != Role.COACH && user.getRole() != Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el entrenador puede gestionar plantillas.");
        }
        return user;
    }

    private Map<String, Object> toDto(RoutineTemplate t) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId());
        m.put("title", t.getTitle());
        m.put("description", t.getDescription());
        m.put("routineJson", t.getRoutineJson());
        m.put("createdAt", t.getCreatedAt());
        m.put("updatedAt", t.getUpdatedAt());
        return m;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list() {
        User coach = currentCoach();
        List<Map<String, Object>> out = repo.findByOwnerCoachOrderByTitleAsc(coach)
                .stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(out);
    }

    private String serializeRoutineJson(Object r) {
        if (r == null) return null;
        if (r instanceof String s) return s;
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(r);
        } catch (Exception e) {
            return r.toString();
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        User coach = currentCoach();
        String title = body.get("title") == null ? "" : body.get("title").toString().trim();
        if (title.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El título no puede estar vacío.");
        }
        RoutineTemplate t = new RoutineTemplate();
        t.setOwnerCoach(coach);
        t.setTitle(title);
        if (body.get("description") != null) t.setDescription(body.get("description").toString());
        if (body.get("routineJson") != null) t.setRoutineJson(serializeRoutineJson(body.get("routineJson")));
        return ResponseEntity.ok(toDto(repo.save(t)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        User coach = currentCoach();
        RoutineTemplate existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Plantilla no encontrada."));
        if (existing.getOwnerCoach() == null || !existing.getOwnerCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta plantilla no es tuya.");
        }
        if (body.get("title") != null) {
            String title = body.get("title").toString().trim();
            if (title.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El título no puede estar vacío.");
            }
            existing.setTitle(title);
        }
        if (body.containsKey("description")) {
            Object d = body.get("description");
            existing.setDescription(d == null ? null : d.toString());
        }
        if (body.containsKey("routineJson")) {
            existing.setRoutineJson(serializeRoutineJson(body.get("routineJson")));
        }
        return ResponseEntity.ok(toDto(repo.save(existing)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        User coach = currentCoach();
        RoutineTemplate existing = repo.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        if (existing.getOwnerCoach() == null || !existing.getOwnerCoach().getId().equals(coach.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Esta plantilla no es tuya.");
        }
        repo.delete(existing);
        return ResponseEntity.noContent().build();
    }
}
