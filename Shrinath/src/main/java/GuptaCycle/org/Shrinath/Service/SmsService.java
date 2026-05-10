package GuptaCycle.org.Shrinath.Service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class SmsService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
    private String fromNumber;

    @Async
    public void sendSms(String toNumber, String body) {
        if (isBlank(accountSid) || isBlank(authToken) || isBlank(fromNumber) || isBlank(toNumber)) {
            System.out.println("SMS notification skipped: Twilio is not configured.");
            return;
        }

        try {
            Twilio.init(accountSid, authToken);
            Message.creator(new PhoneNumber(toNumber), new PhoneNumber(fromNumber), body).create();
        } catch (Exception ex) {
            System.err.println("Failed to send SMS to " + toNumber + ": " + ex.getMessage());
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
