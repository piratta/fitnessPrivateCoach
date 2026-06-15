package com.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class MyClassTest {

    @Test
    public void testFitnessServer() {
        FitnessServer server = new FitnessServer();
        assertNotNull(server);
    }
}