package com.fitnessApp.feature.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChangePasswordRequest {

    @NotBlank
    @Size(min = 4, message = "La contraseña debe tener al menos 4 caracteres")
    private String newPassword;
    private String currentPassword;
}