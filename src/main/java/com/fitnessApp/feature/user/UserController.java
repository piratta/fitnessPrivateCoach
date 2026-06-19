package com.fitnessApp.feature.user;

import com.fitnessApp.feature.review.ReviewImage;
import com.fitnessApp.feature.workout.WorkoutService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final WorkoutService workoutService;
    private final UserMapper userMapper;

    public UserController(UserService userService, WorkoutService workoutService, UserMapper userMapper) {
        this.userService = userService;
        this.workoutService = workoutService;
        this.userMapper = userMapper;
    }

    @GetMapping("/me/whoami")
    public ResponseEntity<Map<String, Object>> whoami() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> body = new HashMap<>();
        body.put("authenticated", auth != null && auth.isAuthenticated());
        body.put("principal", auth != null ? auth.getName() : null);
        body.put("authorities", auth != null ? auth.getAuthorities().toString() : null);
        return ResponseEntity.ok(body);
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        User user = userService.getUserByPrincipal(auth.getName());
        UserDto dto = userMapper.toDto(user);
        dto.setRoutineJson(workoutService.enrichRoutineWithSuggestedWeights(user, dto.getRoutineJson()));
        if (dto.getNextRoutineJson() != null) {
            dto.setNextRoutineJson(workoutService.enrichRoutineWithSuggestedWeights(user, dto.getNextRoutineJson()));
        }
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/clients")
    public ResponseEntity<List<UserDto>> getMyClients() {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        List<UserDto> clients = userService.getMyClients(principal);
        for (UserDto dto : clients) {
            User client = userService.getUserByPrincipal(dto.getEmail());
            dto.setRoutineJson(workoutService.enrichRoutineWithSuggestedWeights(client, dto.getRoutineJson()));
            if (dto.getNextRoutineJson() != null) {
                dto.setNextRoutineJson(
                        workoutService.enrichRoutineWithSuggestedWeights(client, dto.getNextRoutineJson()));
            }
        }
        return ResponseEntity.ok(clients);
    }

    @PostMapping("/create-client")
    public ResponseEntity<?> createClient(@RequestBody UserDto clientDto) {
        try {
            String principal = SecurityContextHolder.getContext().getAuthentication().getName();
            User savedClient = userService.createClient(principal, clientDto);
            return ResponseEntity.ok(userMapper.toDto(savedClient));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/clients/{clientId}")
    public ResponseEntity<?> updateClient(@PathVariable UUID clientId, @RequestBody UserDto clientDto) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User updatedClient = userService.updateClient(principal, clientId, clientDto);
        return ResponseEntity.ok(userMapper.toDto(updatedClient));
    }

    @DeleteMapping("/clients/{clientId}")
    public ResponseEntity<?> deleteClient(@PathVariable UUID clientId) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.deleteClient(principal, clientId);
        return ResponseEntity.ok(Map.of("message", "Client deleted successfully"));
    }

    @PostMapping("/clients/{clientId}/reset-password")
    public ResponseEntity<?> resetClientPassword(@PathVariable UUID clientId) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User[] clientRef = new User[1]; // Array to get the updated client object out of the service
        String tempPassword = userService.resetClientPassword(principal, clientId, clientRef);

        Map<String, String> body = new HashMap<>();
        body.put("username", clientRef[0].getUsername());
        body.put("email", clientRef[0].getEmail());
        body.put("password", tempPassword);
        return ResponseEntity.ok(body);
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(@RequestBody UserDto dto) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        User updatedMe = userService.updateMe(principal, dto);
        return ResponseEntity.ok(userMapper.toDto(updatedMe));
    }

    @PostMapping("/me/complete-onboarding")
    public ResponseEntity<?> completeOnboarding(@RequestBody(required = false) Map<String, Object> body) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Sesión expirada.");

        User user = userService.completeOnboarding(auth.getName(), body);
        return ResponseEntity.ok(userMapper.toDto(user));
    }

    @PostMapping(value = "/me/initial-photo", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadInitialPhoto(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "view", required = false) String view) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Sesión expirada.");

        ReviewImage saved = userService.uploadInitialPhoto(auth.getName(), view, file);
        Map<String, Object> body = new HashMap<>();
        body.put("id", saved.getId());
        body.put("view", saved.getView());
        return ResponseEntity.ok(body);
    }

    @PutMapping("/me/prs")
    public ResponseEntity<?> updatePersonalRecords(@RequestBody Map<String, Double> newRecords) {
        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        userService.updatePersonalRecords(principal, newRecords);
        return ResponseEntity.ok().build();
    }
}