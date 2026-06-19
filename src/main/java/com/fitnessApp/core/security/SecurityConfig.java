package com.fitnessApp.core.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {



    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtTokenProvider tokenProvider, org.springframework.security.core.userdetails.UserDetailsService userDetailsService) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/", "/api/auth/**").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/ws/chat/**", "/ws/chat").permitAll()
                .anyRequest().authenticated()
            )
            // Without an explicit entry point, Spring Security 6 answers 403 for missing/invalid
            // tokens, which is confusing. Force 401 so the client can refresh credentials.
            .exceptionHandling(eh -> eh
                .authenticationEntryPoint((req, res, e) -> {
                    res.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    res.setContentType("application/json;charset=UTF-8");
                    Object reasonAttr = req.getAttribute("auth.failureReason");
                    String reason = reasonAttr != null ? reasonAttr.toString() : e.getMessage();
                    String safe = reason == null ? "" : reason.replace("\\", "\\\\").replace("\"", "\\\"");
                    res.getWriter().write("{\"error\":\"unauthorized\",\"message\":\"" + safe + "\"}");
                })
                .accessDeniedHandler((req, res, e) -> {
                    res.setStatus(jakarta.servlet.http.HttpServletResponse.SC_FORBIDDEN);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":\"forbidden\",\"message\":\"" + e.getMessage() + "\"}");
                })
            )
            .headers(headers -> headers.frameOptions(frame -> frame.disable())); // For H2 console

        http.addFilterBefore(new JwtAuthenticationFilter(tokenProvider, userDetailsService), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("authorization", "content-type", "x-auth-token"));
        configuration.setExposedHeaders(Arrays.asList("x-auth-token"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
