const fs = require('fs');

let file = 'src/main/java/com/fitnessApp/feature/workout/WorkoutService.java';
let code = fs.readFileSync(file, 'utf-8');

// 1. Inject Mapper
code = code.replace(/private final WorkoutSessionRepository workoutRepository;\n    private final UserRepository userRepository;/g, 
`private final WorkoutSessionRepository workoutRepository;
    private final UserRepository userRepository;
    private final WorkoutMapper workoutMapper;`);

code = code.replace(/import lombok\.RequiredArgsConstructor;/g, 
`import lombok.RequiredArgsConstructor;
import com.fitnessApp.core.exception.ClientNotFoundException;
import com.fitnessApp.core.exception.WorkoutNotFoundException;`);

// 2. Refactor orElseThrow
code = code.replace(/userRepository\.findByEmail\((.*?)\)\.orElseThrow\(\)/g, `userRepository.findByEmail($1).orElseThrow(() -> new ClientNotFoundException("Cliente no encontrado con email: " + $1))`);
code = code.replace(/userRepository\.findById\((.*?)\)\.orElseThrow\(\)/g, `userRepository.findById($1).orElseThrow(() -> new ClientNotFoundException("Cliente no encontrado con ID: " + $1))`);
code = code.replace(/workoutRepository\.findById\((.*?)\)\.orElseThrow\(\)/g, `workoutRepository.findById($1).orElseThrow(() -> new WorkoutNotFoundException("Sesión de entrenamiento no encontrada con ID: " + $1))`);

// 3. Refactor DTO building in getHistory
code = code.replace(/return sessions\.stream\(\)\.map\(s -> \{[\s\S]*?return dto;\s*\}\)\.collect\(Collectors\.toList\(\)\);/g, 
`return sessions.stream().map(workoutMapper::toDto).collect(Collectors.toList());`);

// 4. Any try-catch related to user not found?
// If they have any "throw new RuntimeException("No tienes permisos...")", that's fine.

fs.writeFileSync(file, code);
console.log("Refactored WorkoutService");
