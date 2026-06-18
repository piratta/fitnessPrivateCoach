package com.fitnessApp.core.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.HashMap;
import java.util.Map;

@RestController
public class HomeController {

    @GetMapping("/")
    public Map<String, String> home() {
        Map<String, String> status = new HashMap<>();
        status.put("status", "UP");
        status.put("message", "Private Fitness API is running successfully");
        return status;
    }
}
