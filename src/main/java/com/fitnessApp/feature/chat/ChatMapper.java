package com.fitnessApp.feature.chat;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Mapper(componentModel = "spring")
public interface ChatMapper {

    @Mapping(source = "messageText", target = "text")
    @Mapping(source = "sentAt", target = "time", qualifiedByName = "formatTime")
    @Mapping(source = "sender.role", target = "sender", qualifiedByName = "formatSenderRole")
    ChatMessageDto toDto(ChatMessage entity);

    @Named("formatTime")
    default String formatTime(LocalDateTime time) {
        if (time == null) return "";
        return "Hoy " + time.format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    @Named("formatSenderRole")
    default String formatSenderRole(com.fitnessApp.feature.user.Role role) {
        if (role == null) return "client";
        return role == com.fitnessApp.feature.user.Role.COACH ? "coach" : "client";
    }
}
