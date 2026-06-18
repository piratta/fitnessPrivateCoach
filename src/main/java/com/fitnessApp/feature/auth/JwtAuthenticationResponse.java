package com.fitnessApp.feature.auth;

import com.fitnessApp.feature.user.UserDto;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class JwtAuthenticationResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private UserDto user;

    // Mantenemos el constructor original para que no falle tu AuthController
    public JwtAuthenticationResponse(String accessToken, UserDto user) {
        this.accessToken = accessToken;
        this.user = user;
    }
}