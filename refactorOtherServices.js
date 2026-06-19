const fs = require('fs');

function refactorFile(file) {
    let code = fs.readFileSync(file, 'utf-8');

    code = code.replace(/import lombok\.RequiredArgsConstructor;/g, 
`import lombok.RequiredArgsConstructor;
import com.fitnessApp.core.exception.ClientNotFoundException;`);

    // Refactor orElseThrow
    code = code.replace(/userRepository\.findByEmail\((.*?)\)\.orElseThrow\(\)/g, `userRepository.findByEmail($1).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con email: " + $1))`);
    code = code.replace(/userRepository\.findById\((.*?)\)\.orElseThrow\(\)/g, `userRepository.findById($1).orElseThrow(() -> new ClientNotFoundException("Usuario no encontrado con ID: " + $1))`);

    fs.writeFileSync(file, code);
}

refactorFile('src/main/java/com/fitnessApp/feature/user/UserService.java');
refactorFile('src/main/java/com/fitnessApp/feature/review/ReviewService.java');
console.log("Refactored User and Review services");
