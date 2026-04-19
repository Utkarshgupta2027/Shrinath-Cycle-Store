package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    public User registerUser(User user) {
        if (user == null) {
            throw new RuntimeException("User details are required.");
        }

        String name = normalize(user.getName());
        String email = normalize(user.getEmail()).toLowerCase();
        String phoneNumber = normalize(user.getPhoneNumber());
        String password = user.getPassword() == null ? "" : user.getPassword().trim();

        if (name.isEmpty() || email.isEmpty() || phoneNumber.isEmpty() || password.isEmpty()) {
            throw new RuntimeException("Name, email, phone number and password are required.");
        }

        if (userRepository.findByPhoneNumber(phoneNumber).isPresent()) {
            throw new RuntimeException("Phone number already registered!");
        }

        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered!");
        }

        user.setName(name);
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);
        user.setPassword(passwordEncoder.encode(password));

        return userRepository.save(user);
    }

    public User authenticate(String phoneNumber, String password) {
        String normalizedPhoneNumber = normalize(phoneNumber);
        String rawPassword = password == null ? "" : password;

        if (normalizedPhoneNumber.isEmpty() || rawPassword.trim().isEmpty()) {
            return null;
        }

        User user = userRepository.findByPhoneNumber(normalizedPhoneNumber)
                .orElse(null);

        if (user != null && passwordEncoder.matches(rawPassword, user.getPassword())) {
            return user;
        }

        return null;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
