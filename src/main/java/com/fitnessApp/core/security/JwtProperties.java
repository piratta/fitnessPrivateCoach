package com.fitnessApp.core.security;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import lombok.Data;

@Data
@Configuration
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {
    private String secret;
    private int expiration;
}
