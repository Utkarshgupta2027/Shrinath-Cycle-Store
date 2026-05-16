package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.UserAddress;
import GuptaCycle.org.Shrinath.Repository.UserAddressRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AddressService {

    private static final int MAX_ADDRESSES_PER_USER = 10;

    @Autowired
    private UserAddressRepository userAddressRepository;

    public List<UserAddress> getAddressesByUser(Long userId) {
        return userAddressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
    }

    @Transactional
    public UserAddress saveAddress(Long userId, UserAddress address) {
        if (userId == null) {
            throw new IllegalArgumentException("User ID is required.");
        }

        long count = userAddressRepository.countByUserId(userId);
        if (count >= MAX_ADDRESSES_PER_USER) {
            throw new IllegalArgumentException("You can save up to " + MAX_ADDRESSES_PER_USER + " addresses.");
        }

        validate(address);

        address.setId(null);
        address.setUserId(userId);
        address.setCreatedAt(LocalDateTime.now());
        address.setUpdatedAt(LocalDateTime.now());

        // If this is the first address, make it default
        if (count == 0) {
            address.setDefault(true);
        }

        // If this is being set as default, clear existing default
        if (address.isDefault()) {
            clearDefault(userId);
        }

        return userAddressRepository.save(address);
    }

    @Transactional
    public UserAddress updateAddress(Long userId, Long addressId, UserAddress updated) {
        UserAddress existing = getOwnedAddress(userId, addressId);
        validate(updated);

        existing.setLabel(updated.getLabel());
        existing.setName(updated.getName());
        existing.setPhone(updated.getPhone());
        existing.setLine1(updated.getLine1());
        existing.setCity(updated.getCity());
        existing.setState(updated.getState());
        existing.setPincode(updated.getPincode());
        existing.setUpdatedAt(LocalDateTime.now());

        if (updated.isDefault() && !existing.isDefault()) {
            clearDefault(userId);
            existing.setDefault(true);
        }

        return userAddressRepository.save(existing);
    }

    @Transactional
    public void deleteAddress(Long userId, Long addressId) {
        UserAddress address = getOwnedAddress(userId, addressId);
        boolean wasDefault = address.isDefault();
        userAddressRepository.delete(address);

        // Assign default to the earliest remaining address if deleted was default
        if (wasDefault) {
            List<UserAddress> remaining = userAddressRepository
                    .findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                UserAddress next = remaining.get(0);
                next.setDefault(true);
                userAddressRepository.save(next);
            }
        }
    }

    @Transactional
    public UserAddress setDefault(Long userId, Long addressId) {
        clearDefault(userId);
        UserAddress address = getOwnedAddress(userId, addressId);
        address.setDefault(true);
        address.setUpdatedAt(LocalDateTime.now());
        return userAddressRepository.save(address);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private UserAddress getOwnedAddress(Long userId, Long addressId) {
        UserAddress address = userAddressRepository.findById(addressId)
                .orElseThrow(() -> new IllegalArgumentException("Address not found."));
        if (!address.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You can only manage your own addresses.");
        }
        return address;
    }

    private void clearDefault(Long userId) {
        userAddressRepository.findByUserIdAndIsDefaultTrue(userId).ifPresent(addr -> {
            addr.setDefault(false);
            userAddressRepository.save(addr);
        });
    }

    private void validate(UserAddress address) {
        if (address == null) throw new IllegalArgumentException("Address data is required.");
        if (blank(address.getName())) throw new IllegalArgumentException("Receiver name is required.");
        if (blank(address.getLine1())) throw new IllegalArgumentException("Address line is required.");
        if (blank(address.getCity())) throw new IllegalArgumentException("City is required.");
        if (blank(address.getState())) throw new IllegalArgumentException("State is required.");
        if (blank(address.getPincode())) throw new IllegalArgumentException("Pincode is required.");
    }

    private boolean blank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
