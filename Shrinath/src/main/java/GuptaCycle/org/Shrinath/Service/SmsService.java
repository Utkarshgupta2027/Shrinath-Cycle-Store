package GuptaCycle.org.Shrinath.Service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * SMS Notification Service
 *
 * Send chain (in order of priority):
 *  1. Fast2SMS  — free Indian SMS, best for Indian phone numbers.
 *                 Sign up at https://www.fast2sms.com → Developer API.
 *  2. Twilio    — international fallback, trial credits work fine.
 *
 * If neither is configured the message is simply logged and skipped —
 * the application continues normally.
 */
@Service
public class SmsService {

    private static final Logger log = LoggerFactory.getLogger(SmsService.class);

    // ─── Fast2SMS ─────────────────────────────────────────────────────────────
    @Value("${fast2sms.api-key:}")
    private String fast2SmsApiKey;

    @Value("${fast2sms.base-url:https://www.fast2sms.com/dev/bulkV2}")
    private String fast2SmsBaseUrl;

    // ─── Twilio ───────────────────────────────────────────────────────────────
    @Value("${twilio.account-sid:}")
    private String twilioSid;

    @Value("${twilio.auth-token:}")
    private String twilioAuth;

    @Value("${twilio.from-number:}")
    private String twilioFrom;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Send a login/registration OTP via SMS.
     */
    @Async
    public void sendOtpSms(String toNumber, String otp) {
        String msg = "Your Shrinath Cycle Store OTP is: " + otp
                + ". Valid for 5 minutes. Do not share this code.";
        sendSms(toNumber, msg);
    }

    /**
     * Send an order-confirmation SMS after successful payment / COD placement.
     */
    @Async
    public void sendOrderConfirmationSms(String toNumber, String productNames, String orderId) {
        String msg = "Shrinath Cycle Store: Order confirmed for " + productNames
                + " (Order #" + orderId + "). We will notify you once shipped. Thank you!";
        sendSms(toNumber, msg);
    }

    /**
     * Send a dispatch / shipping SMS when status changes to SHIPPED.
     */
    @Async
    public void sendDispatchSms(String toNumber, String productNames, String awbNumber,
                                 String courierName, String trackingUrl) {
        StringBuilder msg = new StringBuilder();
        msg.append("Shrinath Cycle Store: Your order for ").append(productNames)
           .append(" has been dispatched!");
        if (awbNumber != null && !awbNumber.isBlank()) {
            msg.append(" AWB: ").append(awbNumber);
        }
        if (courierName != null && !courierName.isBlank()) {
            msg.append(" via ").append(courierName).append(".");
        }
        if (trackingUrl != null && !trackingUrl.isBlank()) {
            msg.append(" Track: ").append(trackingUrl);
        }
        sendSms(toNumber, msg.toString());
    }

    /**
     * Generic SMS sender — used internally and by OrderService for
     * cancellation / refund / return-exchange notifications.
     */
    @Async
    public void sendSms(String toNumber, String body) {
        if (isBlank(toNumber) || isBlank(body)) {
            log.warn("[SMS] Skipping: empty recipient or message.");
            return;
        }

        // 1. Try Fast2SMS (primary — free for India)
        if (!isBlank(fast2SmsApiKey)) {
            boolean sent = sendViaFast2Sms(toNumber, body);
            if (sent) return;
        }

        // 2. Try Twilio (fallback)
        if (!isBlank(twilioSid) && !isBlank(twilioAuth) && !isBlank(twilioFrom)) {
            sendViaTwilio(toNumber, body);
            return;
        }

        log.info("[SMS] No SMS provider configured — notification skipped. "
                + "Set FAST2SMS_API_KEY (free) or TWILIO_* env vars to enable SMS.");
    }

    // ─── Fast2SMS ─────────────────────────────────────────────────────────────

    /**
     * Sends via Fast2SMS DLT-free Quick SMS route.
     * Strips country code — Fast2SMS expects plain 10-digit Indian mobile.
     *
     * @return true on success, false on failure
     */
    private boolean sendViaFast2Sms(String toNumber, String body) {
        try {
            String mobile = normalizeIndianNumber(toNumber);
            if (mobile == null) {
                log.warn("[SMS][Fast2SMS] '{}' is not a valid Indian mobile — skipping Fast2SMS.", toNumber);
                return false;
            }

            String encodedMessage = URLEncoder.encode(body, StandardCharsets.UTF_8);
            String url = fast2SmsBaseUrl
                    + "?authorization=" + URLEncoder.encode(fast2SmsApiKey, StandardCharsets.UTF_8)
                    + "&route=q"                 // Quick (DLT-free) route
                    + "&message=" + encodedMessage
                    + "&language=english"
                    + "&flash=0"
                    + "&numbers=" + mobile;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("cache-control", "no-cache")
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            String respBody = resp.body();

            if (resp.statusCode() == 200 && respBody.contains("\"return\":true")) {
                log.info("[SMS][Fast2SMS] Message sent to {} successfully.", mobile);
                return true;
            } else {
                log.warn("[SMS][Fast2SMS] Unexpected response ({}): {}", resp.statusCode(), respBody);
                return false;
            }
        } catch (Exception e) {
            log.error("[SMS][Fast2SMS] Failed to send to {}: {}", toNumber, e.getMessage());
            return false;
        }
    }

    /**
     * Normalize a phone number to a plain 10-digit Indian mobile.
     * Accepts: 9876543210, +919876543210, 919876543210, 09876543210
     *
     * @return 10-digit string, or null if not recognisable as Indian mobile
     */
    private String normalizeIndianNumber(String raw) {
        if (isBlank(raw)) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() == 10) return digits;
        if (digits.length() == 12 && digits.startsWith("91")) return digits.substring(2);
        if (digits.length() == 11 && digits.startsWith("0"))  return digits.substring(1);
        return null;  // Could be international — fall through to Twilio
    }

    // ─── Twilio ───────────────────────────────────────────────────────────────

    private void sendViaTwilio(String toNumber, String body) {
        try {
            // Ensure E.164 format (+91XXXXXXXXXX for India)
            String e164 = toE164India(toNumber);
            Twilio.init(twilioSid, twilioAuth);
            Message.creator(new PhoneNumber(e164), new PhoneNumber(twilioFrom), body).create();
            log.info("[SMS][Twilio] Message sent to {} successfully.", e164);
        } catch (Exception e) {
            log.error("[SMS][Twilio] Failed to send to {}: {}", toNumber, e.getMessage());
        }
    }

    private String toE164India(String raw) {
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.length() == 10) return "+91" + digits;
        if (digits.length() == 12 && digits.startsWith("91")) return "+" + digits;
        if (digits.startsWith("+")) return raw;
        return "+" + digits;
    }

    // ─── Utility ──────────────────────────────────────────────────────────────

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
