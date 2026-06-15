package com.example.fitnessapp.dto;

public class ChatMessageDto {
    private String sender; // "client" or "coach" based on the perspective, or email. We will use role/perspective logic.
    private String text;
    private String time;

    public ChatMessageDto() {}

    public ChatMessageDto(String sender, String text, String time) {
        this.sender = sender;
        this.text = text;
        this.time = time;
    }

    public String getSender() { return sender; }
    public void setSender(String sender) { this.sender = sender; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
}
