# Fitness Application

## How to Run the Application Locally

This is a fitness application with both backend (Java) and frontend (HTML/CSS/JavaScript) components.

### Prerequisites
- Java 8 or higher
- Maven (for building the backend)
- Web browser (for frontend)

### Running the Backend Server

1. **Navigate to project directory:**
   ```bash
   cd C:/Users/wdriv/IdeaProjects/privateFitness
   ```

2. **Compile the project:**
   ```bash
   mvn compile
   ```

3. **Run tests (optional but recommended):**
   ```bash
   mvn test
   ```

4. **To run the server application:**
   ```bash
   mvn exec:java -Dexec.mainClass="com.example.FitnessServer"
   ```
   
   Or if you want to run with the existing MyClass:
   ```bash
   mvn exec:java -Dexec.mainClass="com.example.MyClass"
   ```

### Running the Frontend

The frontend is pure HTML/CSS/JavaScript and can be run directly in any web browser:

1. **Open `index.html` in your web browser**
2. The application will load and you can start using it immediately
3. No server setup required for frontend

### Project Structure

```
privateFitness/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/
│   │   │       ├── MyClass.java
│   │   │       └── FitnessServer.java
│   │   └── resources/
│   │       ├── index.html          # Main landing page
│   │       ├── dashboard.html      # User dashboard
│   │       ├── about.html          # About page
│   │       ├── contact.html        # Contact page
│   │       ├── privacy.html        # Privacy policy
│   │       ├── terms.html          # Terms of service
│   │       ├── error.html          # Error page
│   │       ├── 404.html            # 404 page
│   │       ├── css/
│   │       │   └── style.css       # CSS styling
│   │       └── js/
│   │           └── app.js          # JavaScript functionality
│   └── test/
│       └── java/
│           └── com/example/
│               └── MyClassTest.java
└── pom.xml                         # Maven configuration
```

### Features Available

- **User Authentication**: Login system with different user types
- **Dashboard**: Progress tracking and workout scheduling
- **Training Plans**: Different plans based on user type (Free, Linked, Trainer)
- **Exercise Library**: Collection of exercises with difficulty levels
- **Responsive Design**: Works on mobile and desktop devices

### Access the Application

1. Open your web browser
2. Navigate to `file:///C:/Users/wdriv/IdeaProjects/privateFitness/src/main/resources/index.html`
3. Or open any HTML file directly from the resources folder

The application will be ready for use immediately with no additional setup required for the frontend.

### Backend Integration

For full functionality, you would need to:
1. Implement the backend services in `FitnessServer.java`
2. Connect to a database
3. Add REST endpoints for data exchange between frontend and backend

### Troubleshooting

If you encounter issues:
- Make sure Java is properly installed (`java -version`)
- Ensure Maven is available (`mvn -version`)
- Check that all HTML files are in the correct location
- Verify browser compatibility (modern browsers recommended)

The application is designed to be run locally and provides a complete fitness experience with both frontend and backend components.