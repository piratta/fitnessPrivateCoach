package com.fitnessApp.fitnessapp.feature.auth;

import com.fitnessApp.fitnessapp.feature.user.UserDto;
import com.fitnessApp.fitnessapp.feature.user.User;
import com.fitnessApp.fitnessapp.feature.user.UserRepository;
import com.fitnessApp.fitnessapp.core.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(loginRequest.getEmail())
                .or(() -> userRepository.findByEmail(loginRequest.getEmail()))
                .orElseThrow();
        
        return ResponseEntity.ok(new JwtAuthenticationResponse(jwt, new UserDto(user)));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).body("Sesión expirada.");
        }
        String principal = auth.getName();
        User user = userRepository.findByEmail(principal)
                .or(() -> userRepository.findByUsername(principal))
                .orElseThrow();

        // Voluntary change (not the first-login forced flow) must validate the current password
        // so a stolen JWT alone cannot rotate the password.
        if (!user.isMustChangePassword()) {
            String current = request.getCurrentPassword();
            if (current == null || current.isBlank()
                    || !passwordEncoder.matches(current, user.getPasswordHash())) {
                return ResponseEntity.status(403).body("La contraseña actual no es correcta.");
            }
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        userRepository.save(user);

        return ResponseEntity.ok("Contraseña actualizada correctamente");
    }
}
