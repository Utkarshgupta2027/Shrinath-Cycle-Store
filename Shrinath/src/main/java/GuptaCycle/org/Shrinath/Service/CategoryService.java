package GuptaCycle.org.Shrinath.Service;

import GuptaCycle.org.Shrinath.Model.Category;
import GuptaCycle.org.Shrinath.Repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository repo;

    public List<Category> getAllActive() {
        return repo.findByActiveTrueOrderByDisplayOrderAsc();
    }

    public List<Category> getTopLevel() {
        return repo.findByParentCategoryIsNullOrderByDisplayOrderAsc();
    }

    public List<Category> getFeatured() {
        return repo.findByFeaturedTrueAndActiveTrueOrderByDisplayOrderAsc();
    }

    public List<Category> getAll() {
        return repo.findAll();
    }

    @Transactional
    public Category create(Category category) {
        return repo.save(category);
    }

    @Transactional
    public Category update(Long id, Category incoming) {
        Category existing = repo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));
        if (incoming.getName() != null)         existing.setName(incoming.getName());
        if (incoming.getDescription() != null)  existing.setDescription(incoming.getDescription());
        if (incoming.getParentCategory() != null) existing.setParentCategory(incoming.getParentCategory());
        existing.setFeatured(incoming.isFeatured());
        existing.setActive(incoming.isActive());
        existing.setDisplayOrder(incoming.getDisplayOrder());
        return repo.save(existing);
    }

    @Transactional
    public void delete(Long id) {
        repo.findById(id).orElseThrow(() -> new IllegalArgumentException("Category not found: " + id));
        repo.deleteById(id);
    }
}
