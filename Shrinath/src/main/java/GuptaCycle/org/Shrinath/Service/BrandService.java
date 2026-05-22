package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Brand;
import GuptaCycle.org.Shrinath.Repository.BrandRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class BrandService {

    @Autowired
    private BrandRepository repo;

    public List<Brand> getAll() {
        return repo.findAll();
    }

    public List<Brand> getAllActive() {
        return repo.findByActiveTrueOrderByNameAsc();
    }

    public List<Brand> getFeatured() {
        return repo.findByFeaturedTrueAndActiveTrueOrderByDisplayOrderAsc();
    }

    @Transactional
    public Brand create(Brand brand) {
        return repo.save(brand);
    }

    @Transactional
    public Brand update(Long id, Brand incoming) {
        Brand existing = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Brand not found: " + id));
        if (incoming.getName() != null)        existing.setName(incoming.getName());
        if (incoming.getDescription() != null) existing.setDescription(incoming.getDescription());
        if (incoming.getLogoUrl() != null)     existing.setLogoUrl(incoming.getLogoUrl());
        existing.setFeatured(incoming.isFeatured());
        existing.setActive(incoming.isActive());
        existing.setDisplayOrder(incoming.getDisplayOrder());
        return repo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Brand not found: " + id));
        repo.deleteById(id);
    }
}
