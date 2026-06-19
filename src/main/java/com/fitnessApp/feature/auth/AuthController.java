package com.fitnessApp.feature.auth;


import com.fitnessApp.feature.user.User;
import com.fitnessApp.feature.user.UserRepository;
import com.fitnessApp.core.security.JwtTokenProvider;
import com.fitnessApp.feature.user.UserMapper;
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

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtTokenProvider tokenProvider;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public AuthController(AuthenticationManager authenticationManager, UserRepository userRepository, JwtTokenProvider tokenProvider, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder, UserMapper userMapper) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.tokenProvider = tokenProvider;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
    }

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

        User user = userRepository.findByUsernameIgnoreCase(loginRequest.getEmail())
                .or(() -> userRepository.findByEmailIgnoreCase(loginRequest.getEmail()))
                .orElseThrow();
        
        return ResponseEntity.ok(new JwtAuthenticationResponse(jwt, userMapper.toDto(user)));
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
