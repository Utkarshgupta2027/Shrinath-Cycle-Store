package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.StoreSettings;
import GuptaCycle.org.Shrinath.Repository.StoreSettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StoreSettingsService {

    @Autowired
    private StoreSettingsRepository repo;

    /** Get settings — auto-initialise with defaults if first run */
    public StoreSettings getSettings() {
        return repo.findById(1L).orElseGet(() -> repo.save(new StoreSettings()));
    }

    /** Admin can update any field */
    @Transactional
    public StoreSettings updateSettings(StoreSettings incoming) {
        StoreSettings existing = getSettings();
        if (incoming.getGstin() != null)        existing.setGstin(incoming.getGstin().trim().toUpperCase());
        if (incoming.getStoreName() != null)     existing.setStoreName(incoming.getStoreName());
        if (incoming.getStoreAddress() != null)  existing.setStoreAddress(incoming.getStoreAddress());
        if (incoming.getStorePhone() != null)    existing.setStorePhone(incoming.getStorePhone());
        if (incoming.getStoreEmail() != null)    existing.setStoreEmail(incoming.getStoreEmail());
        if (incoming.getGstRateCycles() > 0)     existing.setGstRateCycles(incoming.getGstRateCycles());
        if (incoming.getGstRateParts() > 0)      existing.setGstRateParts(incoming.getGstRateParts());
        return repo.save(existing);
    }

    /**
     * Returns the applicable GST rate for a category.
     * Complete cycles (Mountain, City, Kids, Ladies, Sports, Electric) → 12%
     * Everything else (Parts, Accessories, Tools) → 18%
     */
    public double getGstRate(String category) {
        if (category == null) return getSettings().getGstRateParts();
        String lower = category.toLowerCase();
        boolean isCycle = lower.matches(".*(mountain|city|kids|ladies|sports|electric|bicycle|cycle).*");
        return isCycle ? getSettings().getGstRateCycles() : getSettings().getGstRateParts();
    }
}
