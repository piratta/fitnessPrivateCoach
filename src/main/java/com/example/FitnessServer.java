package com.example;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

public class FitnessServer {
    
    private static final int PORT = 8080;
    
    public static void main(String[] args) {
        System.out.println("Starting Fitness Application Server...");
        System.out.println("Server listening on port " + PORT);
        
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("Fitness Server started successfully!");
            System.out.println("Application is ready to serve requests");
            
            // Server loop - in a real application, this would handle client connections
            while (true) {
                Socket clientSocket = serverSocket.accept();
                System.out.println("Client connected: " + clientSocket.getInetAddress());
                
                // In a real implementation, we would process the request here
                // For now, we'll just close the connection
                clientSocket.close();
            }
            
        } catch (IOException e) {
            System.err.println("Server error: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    public void startServer() {
        System.out.println("Starting Fitness Server...");
        // This would be called from tests or other components
    }
}