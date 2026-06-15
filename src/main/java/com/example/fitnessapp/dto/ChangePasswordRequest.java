package com.example.fitnessapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ChangePasswordRequest {

    @NotBlank
    @Size(min = 4, message = "La contraseña debe tener al menos 4 caracteres")
    private String newPassword;

    public ChangePasswordRequest() {}

    public ChangePasswordRequest(String newPassword) {
        this.newPassword = newPassword;
    }

    public String getNewPassword() {
        return newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }
}
