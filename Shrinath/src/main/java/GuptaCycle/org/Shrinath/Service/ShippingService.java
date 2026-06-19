package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.ServiceablePin;
import GuptaCycle.org.Shrinath.Repository.ServiceablePinRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ShippingService {

    // Weight tiers (in kg) → base charge
    private static final double DEFAULT_BASE_CHARGE = 40.0;     // Rs for first 1 kg
    private static final double DEFAULT_PER_KG_CHARGE = 10.0;  // Rs per additional kg

    @Autowired
    private ServiceablePinRepository servicablePinRepository;

    // ─── PIN Serviceability ────────────────────────────────────────────────────

    public boolean isServiceable(String pincode) {
        if (pincode == null || pincode.trim().length() != 6) return false;
        return servicablePinRepository.findByPincodeAndActiveTrue(pincode.trim()).isPresent();
    }

    public ServiceablePin getPinDetails(String pincode) {
        return servicablePinRepository.findByPincodeAndActiveTrue(pincode.trim())
                .orElse(null);
    }

    public List<ServiceablePin> getAllServiceablePins() {
        return servicablePinRepository.findAllByOrderByPincodeAsc();
    }

    // ─── Shipping Charge Calculation ──────────────────────────────────────────

    /**
     * Calculate shipping charge based on the PIN's configured rates.
     * Weight is ignored as the charge is fixed by admin according to location.
     *
     * @param pincode  destination PIN code
     * @param weightKg total weight of items in kg (ignored)
     * @return shipping charge in Rs, or -1 if PIN is not serviceable
     */
    public double calculateShippingCharge(String pincode, double weightKg) {
        return calculateShippingCharge(pincode, "standard");
    }

    /**
     * Calculate shipping charge based on PIN and delivery option.
     *
     * @param pincode        destination PIN code
     * @param deliveryOption "standard" or "express"
     * @return shipping charge in Rs, or -1 if PIN is not serviceable
     */
    public double calculateShippingCharge(String pincode, String deliveryOption) {
        ServiceablePin pin = getPinDetails(pincode);
        if (pin == null) return -1.0;

        if ("express".equalsIgnoreCase(deliveryOption)) {
            double expressCharge = pin.getPerKgCharge();
            return expressCharge > 10.0 ? expressCharge : 199.0;
        }
        return pin.getBaseCharge();
    }

    // ─── Mock AWB Generation ──────────────────────────────────────────────────

    /**
     * Generate a mock AWB number (Shiprocket-style prefix).
     * When real Shiprocket credentials are configured, this can be replaced
     * with an actual Shiprocket API call.
     */
    public Map<String, String> generateAWB(Long orderId) {
        String awb = "SR" + String.format("%08d", orderId) + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        String courierName = "Delhivery";  // default mock courier
        String trackingUrl = "https://www.delhivery.com/track/package/" + awb;

        return Map.of(
                "awbNumber", awb,
                "courierName", courierName,
                "trackingUrl", trackingUrl
        );
    }

    // ─── Admin: Manage Serviceable PINs ───────────────────────────────────────

    @Transactional
    public ServiceablePin addServiceablePin(ServiceablePin pin) {
        if (pin == null || pin.getPincode() == null || pin.getPincode().trim().length() != 6) {
            throw new IllegalArgumentException("A valid 6-digit PIN code is required.");
        }
        String pincode = pin.getPincode().trim();
        if (servicablePinRepository.existsByPincode(pincode)) {
            throw new IllegalArgumentException("PIN code " + pincode + " already exists. Update it instead.");
        }
        pin.setPincode(pincode);
        pin.setCreatedAt(LocalDateTime.now());
        pin.setUpdatedAt(LocalDateTime.now());
        return servicablePinRepository.save(pin);
    }

    @Transactional
    public ServiceablePin updateServiceablePin(Long id, ServiceablePin updated) {
        ServiceablePin existing = servicablePinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviceable PIN not found."));

        if (updated.getCity() != null) existing.setCity(updated.getCity().trim());
        if (updated.getState() != null) existing.setState(updated.getState().trim());
        if (updated.getBaseCharge() > 0) existing.setBaseCharge(updated.getBaseCharge());
        if (updated.getPerKgCharge() > 0) existing.setPerKgCharge(updated.getPerKgCharge());
        existing.setActive(updated.isActive());
        existing.setUpdatedAt(LocalDateTime.now());

        return servicablePinRepository.save(existing);
    }

    @Transactional
    public void deleteServiceablePin(Long id) {
        ServiceablePin pin = servicablePinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviceable PIN not found."));
        servicablePinRepository.delete(pin);
    }

    @Transactional
    public ServiceablePin togglePinActive(Long id) {
        ServiceablePin pin = servicablePinRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Serviceable PIN not found."));
        pin.setActive(!pin.isActive());
        pin.setUpdatedAt(LocalDateTime.now());
        return servicablePinRepository.save(pin);
    }
}
