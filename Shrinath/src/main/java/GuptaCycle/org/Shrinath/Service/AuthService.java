package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.DTO.AdminUserSummaryResponse;
import GuptaCycle.org.Shrinath.DTO.PasswordChangeRequest;
import GuptaCycle.org.Shrinath.DTO.UserAccountResponse;
import GuptaCycle.org.Shrinath.DTO.UserProfileUpdateRequest;
import GuptaCycle.org.Shrinath.Model.User;
import GuptaCycle.org.Shrinath.Repository.CartRepository;
import GuptaCycle.org.Shrinath.Repository.UserRepository;
import GuptaCycle.org.Shrinath.Repository.WishlistRepository;
import GuptaCycle.org.Shrinath.Service.CouponService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.annotation.PostConstruct;

import java.util.Comparator;
import java.util.List;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private OtpService otpService;

    @Autowired
    private CouponService couponService;

    @Value("${app.admin.phone-number}")
    private String adminPhoneNumber;

    @Value("${app.admin.email:gutkarsh702@gmail.com}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @PostConstruct
    public void initAdminUser() {
        String configuredAdminEmail = normalize(adminEmail).toLowerCase();
        String configuredAdminPhone = normalize(adminPhoneNumber);
        String configuredAdminPassword = normalize(adminPassword);

        if (configuredAdminEmail.isEmpty() || configuredAdminPhone.isEmpty()) {
            System.out.println("Admin user initialization skipped. ADMIN_EMAIL and ADMIN_PHONE_NUMBER are required.");
            return;
        }

        User existingAdminByEmail = userRepository.findByEmail(configuredAdminEmail).orElse(null);
        User existingAdminByPhone = userRepository.findByPhoneNumber(configuredAdminPhone).orElse(null);
        User admin = existingAdminByPhone != null ? existingAdminByPhone : existingAdminByEmail;

        if (admin == null) {
            admin = new User();
            admin.setName("Utkarsh Gupta");
            admin.setEmail(configuredAdminEmail);
            admin.setPhoneNumber(configuredAdminPhone);
            admin.setPassword(passwordEncoder.encode(
                    configuredAdminPassword.isEmpty() ? "change-this-admin-password" : configuredAdminPassword
            ));
            admin.setVerified(true);
            userRepository.save(admin);
            System.out.println("Admin user initialized successfully.");
            return;
        }

        boolean changed = false;
        boolean emailBelongsToAnotherUser = existingAdminByEmail != null
                && !existingAdminByEmail.getId().equals(admin.getId());

        if (!emailBelongsToAnotherUser && !configuredAdminEmail.equals(normalize(admin.getEmail()).toLowerCase())) {
            admin.setEmail(configuredAdminEmail);
            changed = true;
        } else if (emailBelongsToAnotherUser) {
            System.out.println("Admin email belongs to another user; keeping existing email on admin phone account.");
        }
        if (!configuredAdminPhone.equals(normalize(admin.getPhoneNumber()))) {
            admin.setPhoneNumber(configuredAdminPhone);
            changed = true;
        }
        if (!configuredAdminPassword.isEmpty() && !passwordEncoder.matches(configuredAdminPassword, admin.getPassword())) {
            admin.setPassword(passwordEncoder.encode(configuredAdminPassword));
            changed = true;
        }
        if (!admin.isVerified()) {
            admin.setVerified(true);
            changed = true;
        }

        if (changed) {
            userRepository.save(admin);
            System.out.println("Admin user synchronized successfully.");
        } else {
            System.out.println("Admin user already exists.");
        }
    }

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

        User savedUser = userRepository.save(user);
        emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getName());
        // Auto-generate personal referral coupon for the new user
        try {
            couponService.generateReferralCoupon(savedUser.getId());
        } catch (Exception e) {
            System.err.println("Failed to generate referral coupon for user " + savedUser.getId() + ": " + e.getMessage());
        }
        return savedUser;
    }

    public User authenticate(String identifier, String password) {
        String normalizedIdentifier = normalize(identifier);
        String rawPassword = password == null ? "" : password;

        if (normalizedIdentifier.isEmpty() || rawPassword.trim().isEmpty()) {
            return null;
        }

        User user = normalizedIdentifier.contains("@")
                ? userRepository.findByEmail(normalizedIdentifier.toLowerCase()).orElse(null)
                : userRepository.findByPhoneNumber(normalizedIdentifier).orElse(null);

        if (user != null && passwordEncoder.matches(rawPassword, user.getPassword())) {
            return user;
        }

        return null;
    }

    public String getRoleForPhoneNumber(String phoneNumber) {
        return isAdminPhoneNumber(phoneNumber) ? "ADMIN" : "CUSTOMER";
    }

    public boolean isAdminPhoneNumber(String phoneNumber) {
        return normalize(phoneNumber).equals(normalize(adminPhoneNumber));
    }

    public User findByPhoneNumber(String phoneNumber) {
        return userRepository.findByPhoneNumber(normalize(phoneNumber))
                .orElseThrow(() -> new RuntimeException("User not found."));
    }

    public Long getUserIdForPhoneNumber(String phoneNumber) {
        return findByPhoneNumber(phoneNumber).getId();
    }

    public UserAccountResponse getAccountSummary(String phoneNumber) {
        return toUserAccountResponse(findByPhoneNumber(phoneNumber));
    }

    public UserAccountResponse updateAccount(String currentPhoneNumber, UserProfileUpdateRequest request) {
        User user = findByPhoneNumber(currentPhoneNumber);

        String name = normalize(request.getName());
        String email = normalize(request.getEmail()).toLowerCase();
        String phoneNumber = normalize(request.getPhoneNumber());

        if (name.isEmpty() || email.isEmpty() || phoneNumber.isEmpty()) {
            throw new IllegalArgumentException("Name, email and phone number are required.");
        }

        userRepository.findByEmail(email)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Email already registered!");
                });

        userRepository.findByPhoneNumber(phoneNumber)
                .filter(existing -> !existing.getId().equals(user.getId()))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Phone number already registered!");
                });

        user.setName(name);
        user.setEmail(email);
        user.setPhoneNumber(phoneNumber);

        return toUserAccountResponse(userRepository.save(user));
    }

    public void changePassword(String phoneNumber, PasswordChangeRequest request) {
        User user = findByPhoneNumber(phoneNumber);

        String currentPassword = request.getCurrentPassword() == null ? "" : request.getCurrentPassword();
        String newPassword = request.getNewPassword() == null ? "" : request.getNewPassword().trim();

        if (currentPassword.trim().isEmpty() || newPassword.isEmpty()) {
            throw new IllegalArgumentException("Current password and new password are required.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }

        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void deleteAccount(String phoneNumber) {
        User user = findByPhoneNumber(phoneNumber);
        wishlistRepository.deleteByUser(user);
        cartRepository.deleteByUserId(user.getId());
        userRepository.delete(user);
    }

    public void generatePasswordResetOtp(String email) {
        String normalizedEmail = normalize(email).toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("User with this email not found."));

        String otp = otpService.generateOtp(normalizedEmail);
        emailService.sendPasswordResetOtpEmail(normalizedEmail, otp);
    }

    public void resetPasswordWithOtp(String email, String otp, String newPassword) {
        String normalizedEmail = normalize(email).toLowerCase();
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("User with this email not found."));

        if (!otpService.verifyOtp(normalizedEmail, otp)) {
            throw new RuntimeException("Invalid or expired OTP.");
        }

        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters long.");
        }

        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);
    }

    public List<AdminUserSummaryResponse> getRegisteredUsers() {
        return userRepository.findAll().stream()
                .sorted(Comparator.comparing(User::getId))
                .map(user -> new AdminUserSummaryResponse(
                        user.getId(),
                        user.getName(),
                        user.getEmail(),
                        user.getPhoneNumber(),
                        user.isVerified(),
                        isAdminPhoneNumber(user.getPhoneNumber()) ? "ADMIN" : "CUSTOMER"
                ))
                .toList();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private UserAccountResponse toUserAccountResponse(User user) {
        return new UserAccountResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.isVerified(),
                isAdminPhoneNumber(user.getPhoneNumber()) ? "ADMIN" : "CUSTOMER"
        );
    }
}
