package com.fitnessApp.feature.chat;

import com.fitnessApp.feature.user.Role;
import com.fitnessApp.feature.user.User;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-06-19T23:22:07+0200",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 25.0.3 (Eclipse Adoptium)"
)
@Component
public class ChatMapperImpl implements ChatMapper {

    @Override
    public ChatMessageDto toDto(ChatMessage entity) {
        if ( entity == null ) {
            return null;
        }

        ChatMessageDto.ChatMessageDtoBuilder chatMessageDto = ChatMessageDto.builder();

        chatMessageDto.text( entity.getMessageText() );
        chatMessageDto.time( formatTime( entity.getSentAt() ) );
        chatMessageDto.sender( formatSenderRole( entitySenderRole( entity ) ) );

        return chatMessageDto.build();
    }

    private Role entitySenderRole(ChatMessage chatMessage) {
        if ( chatMessage == null ) {
            return null;
        }
        User sender = chatMessage.getSender();
        if ( sender == null ) {
            return null;
        }
        Role role = sender.getRole();
        if ( role == null ) {
            return null;
        }
        return role;
    }
}
