package GuptaCycle.org.Shrinath.Service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class OtpService {

    private final Map<String, String> otpStorage = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private final Random random = new Random();

    public String generateOtp(String email) {
        // Generate a 6-digit OTP
        String otp = String.format("%06d", 100000 + random.nextInt(900000));
        otpStorage.put(email, otp);

        // OTP expires in 5 minutes
        scheduler.schedule(() -> otpStorage.remove(email, otp), 5, TimeUnit.MINUTES);

        return otp;
    }

    public boolean verifyOtp(String email, String otp) {
        String storedOtp = otpStorage.get(email);
        if (storedOtp != null && storedOtp.equals(otp)) {
            otpStorage.remove(email);
            return true;
        }
        return false;
    }

    /** Explicitly removes a stored OTP — call this when email delivery fails. */
    public void clearOtp(String email) {
        otpStorage.remove(email);
    }
}
