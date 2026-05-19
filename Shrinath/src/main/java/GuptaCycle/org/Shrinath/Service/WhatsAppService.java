package GuptaCycle.org.Shrinath.Service;

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
 * Admin Alert Notification Service
 *
 * Priority chain:
 *  1. Green API (WhatsApp) — FREE 500 msg/month, uses YOUR WhatsApp number (7052050415)
 *                            Scan QR at green-api.com → instance authorised → done.
 *  2. Telegram Bot          — FREE unlimited, already configured and working.
 *  3. CallMeBot WhatsApp    — Free but number availability varies.
 *  4. Twilio WhatsApp       — Paid fallback.
 */
@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    // ─── Green API (WhatsApp via your own number) ─────────────────────────────
    @Value("${greenapi.instance-id:}")
    private String greenApiInstanceId;

    @Value("${greenapi.api-token:}")
    private String greenApiToken;

    // Phone number to receive admin WhatsApp alerts (with country code, no +)
    // Same as your WhatsApp number: 917052050415
    @Value("${greenapi.admin-phone:917052050415}")
    private String greenApiAdminPhone;

    // ─── Telegram (already configured — fallback if WhatsApp not set up) ──────
    @Value("${telegram.bot-token:}")
    private String telegramBotToken;

    @Value("${telegram.admin-chat-id:}")
    private String telegramAdminChatId;

    // ─── CallMeBot WhatsApp ───────────────────────────────────────────────────
    @Value("${whatsapp.callmebot.api-key:}")
    private String callMeBotApiKey;

    @Value("${whatsapp.callmebot.admin-phone:}")
    private String callMeBotAdminPhone;

    // ─── Twilio WhatsApp (last resort) ────────────────────────────────────────
    @Value("${twilio.account-sid:}")
    private String twilioSid;

    @Value("${twilio.auth-token:}")
    private String twilioAuth;

    @Value("${twilio.whatsapp-from:}")
    private String twilioWhatsappFrom;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /**
     * Send an admin new-order alert via the best available channel.
     * Telegram is already working. Green API adds WhatsApp on top.
     */
    @Async
    public void sendAdminWhatsApp(String message) {

        // 1. Green API — WhatsApp via YOUR number (best free WhatsApp option)
        if (!isBlank(greenApiInstanceId) && !isBlank(greenApiToken)) {
            boolean sent = sendViaGreenApi(greenApiAdminPhone, message);
            if (sent) return;
        }

        // 2. Telegram — already configured and working
        if (!isBlank(telegramBotToken) && !isBlank(telegramAdminChatId)) {
            sendViaTelegram(message);
            return;
        }

        // 3. CallMeBot WhatsApp
        if (!isBlank(callMeBotApiKey) && !isBlank(callMeBotAdminPhone)) {
            sendViaCallMeBot(callMeBotAdminPhone, message);
            return;
        }

        // 4. Twilio WhatsApp
        if (!isBlank(twilioSid) && !isBlank(twilioAuth) && !isBlank(twilioWhatsappFrom)) {
            sendViaTwilioWhatsApp(callMeBotAdminPhone, message);
            return;
        }

        log.warn("[Alert] No notification provider configured.");
    }

    // ─── Green API (WhatsApp) ─────────────────────────────────────────────────

    /**
     * Sends a WhatsApp message using Green API's sendMessage endpoint.
     * The message is sent FROM your own WhatsApp (whichever number you scanned the QR with).
     * chatId format: 917052050415@c.us  (country code + number + @c.us)
     *
     * @return true on success
     */
    private boolean sendViaGreenApi(String toPhone, String message) {
        try {
            // chatId format required by Green API: <countrycode><number>@c.us
            String chatId = normalizePhone(toPhone) + "@c.us";

            // Build JSON body
            String jsonBody = "{"
                    + "\"chatId\":\"" + chatId + "\","
                    + "\"message\":\"" + escapeJson(message) + "\""
                    + "}";

            String url = "https://api.green-api.com/waInstance"
                    + greenApiInstanceId + "/sendMessage/" + greenApiToken;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200 && resp.body().contains("idMessage")) {
                log.info("[WhatsApp][GreenAPI] Message sent to {} successfully.", toPhone);
                return true;
            } else {
                log.warn("[WhatsApp][GreenAPI] Failed (status {}): {}", resp.statusCode(), resp.body());
                return false;
            }
        } catch (Exception e) {
            log.error("[WhatsApp][GreenAPI] Send error: {}", e.getMessage());
            return false;
        }
    }

    // ─── Telegram ─────────────────────────────────────────────────────────────

    private void sendViaTelegram(String message) {
        try {
            String encodedText = URLEncoder.encode(message, StandardCharsets.UTF_8);
            String url = "https://api.telegram.org/bot" + telegramBotToken
                    + "/sendMessage?chat_id=" + telegramAdminChatId
                    + "&text=" + encodedText
                    + "&parse_mode=Markdown";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200 && resp.body().contains("\"ok\":true")) {
                log.info("[Telegram] Admin alert sent successfully.");
            } else {
                log.warn("[Telegram] Send failed (status {}): {}", resp.statusCode(), resp.body());
            }
        } catch (Exception e) {
            log.error("[Telegram] Failed to send alert: {}", e.getMessage());
        }
    }

    // ─── CallMeBot WhatsApp ───────────────────────────────────────────────────

    private void sendViaCallMeBot(String phone, String message) {
        try {
            String encodedText = URLEncoder.encode(message, StandardCharsets.UTF_8);
            String url = "https://api.callmebot.com/whatsapp.php"
                    + "?phone=" + phone
                    + "&text=" + encodedText
                    + "&apikey=" + callMeBotApiKey;

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .GET()
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 200) {
                log.info("[WhatsApp][CallMeBot] Message sent to {} successfully.", phone);
            } else {
                log.warn("[WhatsApp][CallMeBot] Responded ({}): {}", resp.statusCode(), resp.body());
            }
        } catch (Exception e) {
            log.error("[WhatsApp][CallMeBot] Send failed: {}", e.getMessage());
        }
    }

    // ─── Twilio WhatsApp ──────────────────────────────────────────────────────

    private void sendViaTwilioWhatsApp(String toPhone, String message) {
        if (isBlank(toPhone)) return;
        try {
            String toWhatsapp   = "whatsapp:+" + stripPlus(toPhone);
            String fromWhatsapp = twilioWhatsappFrom.startsWith("whatsapp:")
                    ? twilioWhatsappFrom : "whatsapp:" + twilioWhatsappFrom;

            String auth = java.util.Base64.getEncoder()
                    .encodeToString((twilioSid + ":" + twilioAuth).getBytes(StandardCharsets.UTF_8));

            String body = "To="   + URLEncoder.encode(toWhatsapp,   StandardCharsets.UTF_8)
                    + "&From=" + URLEncoder.encode(fromWhatsapp, StandardCharsets.UTF_8)
                    + "&Body=" + URLEncoder.encode(message,      StandardCharsets.UTF_8);

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.twilio.com/2010-04-01/Accounts/"
                            + twilioSid + "/Messages.json"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .timeout(Duration.ofSeconds(15))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 201) {
                log.info("[WhatsApp][Twilio] Message sent to {} successfully.", toPhone);
            } else {
                log.warn("[WhatsApp][Twilio] Status {}: {}", resp.statusCode(), resp.body());
            }
        } catch (Exception e) {
            log.error("[WhatsApp][Twilio] Send failed: {}", e.getMessage());
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Normalize to country-code+number string (no +, no spaces, no dashes). */
    private String normalizePhone(String phone) {
        String digits = phone.replaceAll("[^0-9]", "");
        // If 10 digits, prepend India country code
        if (digits.length() == 10) return "91" + digits;
        return digits;
    }

    /** Minimal JSON string escaping. */
    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "");
    }

    private boolean isBlank(String s) { return s == null || s.trim().isEmpty(); }
    private String stripPlus(String s) { return s.startsWith("+") ? s.substring(1) : s; }
}
