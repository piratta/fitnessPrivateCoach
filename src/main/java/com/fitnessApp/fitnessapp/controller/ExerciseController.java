package com.fitnessApp.fitnessapp.controller;

import com.fitnessApp.fitnessapp.model.Exercise;
import com.fitnessApp.fitnessapp.model.Role;
import com.fitnessApp.fitnessapp.model.User;
import com.fitnessApp.fitnessapp.repository.ExerciseRepository;
import com.fitnessApp.fitnessapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only for any authenticated user (so the routine builder running under the coach AND
 * the client preview both can render the catalogue). Mutations are restricted to COACH /
 * SUPER_ADMIN roles so a client cannot pollute the global exercise list.
 */
@RestController
@RequestMapping("/api/exercises")
public class ExerciseController {

    @Autowired
    private ExerciseRepository repo;

    @Autowired
    private UserRepository userRepo;

    private User currentUserOrThrow() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sesión expirada.");
        }
        String principal = auth.getName();
        return userRepo.findByEmail(principal)
                .or(() -> userRepo.findByUsername(principal))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado."));
    }

    private void requireCoach() {
        User user = currentUserOrThrow();
        if (user.getRole() != Role.COACH && user.getRole() != Role.SUPER_ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Solo el entrenador puede modificar el catálogo.");
        }
    }

    @GetMapping
    public List<Exercise> list() {
        return repo.findAllByOrderByNameAsc();
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
        requireCoach();
        String name = body.get("name") == null ? "" : body.get("name").toString().trim();
        if (name.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El nombre no puede estar vacío.");
        }
        if (name.length() > 200) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Nombre demasiado largo (máximo 200).");
        }
        // Idempotent against duplicate add: if a row already exists with the same name
        // case-insensitively, return it instead of failing — useful for the "add on the fly"
        // flow that races against another coach's tab.
        return repo.findByNameIgnoreCase(name)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> {
                    Exercise ex = new Exercise();
                    ex.setName(name);
                    if (body.get("description") != null) {
                        ex.setDescription(body.get("description").toString());
                    }
                    return ResponseEntity.ok(repo.save(ex));
                });
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable("id") UUID id, @RequestBody Map<String, Object> body) {
        requireCoach();
        Exercise existing = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ejercicio no encontrado."));
        if (body.get("name") != null) {
            String name = body.get("name").toString().trim();
            if (name.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("El nombre no puede estar vacío.");
            }
            // Prevent renaming on top of another existing exercise.
            repo.findByNameIgnoreCase(name).ifPresent(other -> {
                if (!other.getId().equals(existing.getId())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe otro ejercicio con ese nombre.");
                }
            });
            existing.setName(name);
        }
        if (body.containsKey("description")) {
            Object d = body.get("description");
            existing.setDescription(d == null ? null : d.toString());
        }
        return ResponseEntity.ok(repo.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        requireCoach();
        if (!repo.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
