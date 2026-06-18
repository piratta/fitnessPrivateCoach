package com.fitnessApp.feature.chat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private String sender; // "client" or "coach" based on the perspective, or email. We will use role/perspective logic.
    private String text;
    private String time;
}