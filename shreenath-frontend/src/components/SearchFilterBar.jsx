import React, { useState, useCallback, useEffect } from "react";
import {
  FaSearch,
  FaFilter,
  FaSortAmountDown,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaTag,
  FaCheckSquare,
  FaSquare,
} from "react-icons/fa";
import "./SearchFilterBar.css";

const SORT_OPTIONS = [
  { value: "", label: "Relevance (Default)" },
  { value: "PRICE_ASC", label: "Price: Low → High" },
  { value: "PRICE_DESC", label: "Price: High → Low" },
  { value: "NEWEST", label: "New Arrivals" },
  { value: "RATING", label: "Top Rated" },
  { value: "POPULARITY", label: "Most Popular" },
];

const CATEGORY_OPTIONS = [
  "Mountain", "City", "Kids", "Ladies", "Sports", "Electric",
  "Parts", "Accessories", "Tools",
];

export default function SearchFilterBar({ onFilterChange, totalResults }) {
  const [keyword, setKeyword] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("");
  // Dynamic brand list from API (Feature 14)
  const [brandOptions, setBrandOptions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/brands")
      .then(res => res.ok ? res.json() : [])
      .then(data => setBrandOptions(Array.isArray(data) ? data.map(b => b.name) : []))
      .catch(() => setBrandOptions(["Hero", "Atlas", "Hercules", "Firefox", "Montra", "Avon"]));
  }, []);

  const buildFilters = useCallback(
    (overrides = {}) => ({
      keyword: overrides.keyword !== undefined ? overrides.keyword : keyword,
      minPrice: overrides.minPrice !== undefined ? overrides.minPrice : minPrice,
      maxPrice: overrides.maxPrice !== undefined ? overrides.maxPrice : maxPrice,
      category:
        overrides.selectedCategories !== undefined
          ? overrides.selectedCategories.join(",")
          : selectedCategories.join(","),
      brand:
        overrides.selectedBrands !== undefined
          ? overrides.selectedBrands.join(",")
          : selectedBrands.join(","),
      inStockOnly:
        overrides.inStockOnly !== undefined ? overrides.inStockOnly : inStockOnly,
      sortBy: overrides.sortBy !== undefined ? overrides.sortBy : sortBy,
    }),
    [keyword, minPrice, maxPrice, selectedCategories, selectedBrands, inStockOnly, sortBy]
  );

  const emit = (overrides = {}) => {
    onFilterChange(buildFilters(overrides));
  };

  const handleKeywordChange = (e) => {
    const val = e.target.value;
    setKeyword(val);
    emit({ keyword: val });
  };

  const toggleCategory = (cat) => {
    const next = selectedCategories.includes(cat)
      ? selectedCategories.filter((c) => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(next);
    emit({ selectedCategories: next });
  };

  const toggleBrand = (brand) => {
    const next = selectedBrands.includes(brand)
      ? selectedBrands.filter((b) => b !== brand)
      : [...selectedBrands, brand];
    setSelectedBrands(next);
    emit({ selectedBrands: next });
  };

  const handleInStockToggle = () => {
    const next = !inStockOnly;
    setInStockOnly(next);
    emit({ inStockOnly: next });
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortBy(val);
    emit({ sortBy: val });
  };

  const handleApply = () => {
    emit();
  };

  const handleReset = () => {
    setKeyword("");
    setMinPrice("");
    setMaxPrice("");
    setSelectedCategories([]);
    setSelectedBrands([]);
    setInStockOnly(false);
    setSortBy("");
    onFilterChange({
      keyword: "",
      minPrice: "",
      maxPrice: "",
      category: "",
      brand: "",
      inStockOnly: false,
      sortBy: "",
    });
  };

  const activeFilterCount =
    (keyword ? 1 : 0) +
    (minPrice || maxPrice ? 1 : 0) +
    selectedCategories.length +
    selectedBrands.length +
    (inStockOnly ? 1 : 0) +
    (sortBy ? 1 : 0);

  return (
    <div className="sfb-root">
      {/* ── Compact search + sort bar ── */}
      <div className="sfb-top-bar">
        <div className="sfb-search-wrap">
          <FaSearch className="sfb-search-icon" />
          <input
            id="sfb-search-input"
            className="sfb-search-input"
            type="text"
            placeholder="Search by name, brand, category…"
            value={keyword}
            onChange={handleKeywordChange}
            autoComplete="off"
          />
          {keyword && (
            <button className="sfb-clear-btn" onClick={() => { setKeyword(""); emit({ keyword: "" }); }}>
              <FaTimes />
            </button>
          )}
        </div>

        <div className="sfb-right-controls">
          <div className="sfb-sort-wrap">
            <FaSortAmountDown className="sfb-sort-icon" />
            <select
              id="sfb-sort-select"
              className="sfb-sort-select"
              value={sortBy}
              onChange={handleSortChange}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            id="sfb-filter-toggle"
            className={`sfb-filter-toggle${expanded ? " active" : ""}`}
            onClick={() => setExpanded((v) => !v)}
          >
            <FaFilter />
            Filters
            {activeFilterCount > 0 && (
              <span className="sfb-filter-badge">{activeFilterCount}</span>
            )}
            {expanded ? <FaChevronUp /> : <FaChevronDown />}
          </button>
        </div>
      </div>

      {/* ── Results meta ── */}
      {totalResults !== undefined && (
        <div className="sfb-results-meta">
          <span>{totalResults} product{totalResults !== 1 ? "s" : ""} found</span>
          {activeFilterCount > 0 && (
            <button className="sfb-reset-link" onClick={handleReset}>
              <FaTimes /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Expanded panel ── */}
      {expanded && (
        <div className="sfb-panel">
          <div className="sfb-panel-grid">
            {/* Price range */}
            <div className="sfb-panel-section">
              <h4 className="sfb-section-title"><FaTag /> Price Range (₹)</h4>
              <div className="sfb-price-row">
                <input
                  id="sfb-min-price"
                  className="sfb-price-input"
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  min={0}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <span className="sfb-price-dash">—</span>
                <input
                  id="sfb-max-price"
                  className="sfb-price-input"
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  min={0}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            {/* Category chips */}
            <div className="sfb-panel-section">
              <h4 className="sfb-section-title">Category</h4>
              <div className="sfb-chip-grid">
                {CATEGORY_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    id={`sfb-cat-${cat.toLowerCase()}`}
                    className={`sfb-chip${selectedCategories.includes(cat) ? " active" : ""}`}
                    onClick={() => toggleCategory(cat)}
                  >
                    {selectedCategories.includes(cat) ? <FaCheckSquare /> : <FaSquare />}
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand chips */}
            <div className="sfb-panel-section">
              <h4 className="sfb-section-title">Brand</h4>
              <div className="sfb-chip-grid">
                {brandOptions.map((brand) => (
                  <button
                    key={brand}
                    id={`sfb-brand-${brand.toLowerCase()}`}
                    className={`sfb-chip${selectedBrands.includes(brand) ? " active" : ""}`}
                    onClick={() => toggleBrand(brand)}
                  >
                    {selectedBrands.includes(brand) ? <FaCheckSquare /> : <FaSquare />}
                    {brand}
                  </button>
                ))}
              </div>
            </div>

            {/* In-stock toggle */}
            <div className="sfb-panel-section sfb-toggle-section">
              <h4 className="sfb-section-title">Availability</h4>
              <label className="sfb-toggle-label" htmlFor="sfb-instock-toggle">
                <div
                  id="sfb-instock-toggle"
                  className={`sfb-toggle${inStockOnly ? " active" : ""}`}
                  onClick={handleInStockToggle}
                  role="switch"
                  aria-checked={inStockOnly}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleInStockToggle()}
                >
                  <div className="sfb-toggle-knob" />
                </div>
                <span>In Stock Only</span>
              </label>
            </div>
          </div>

          <div className="sfb-panel-actions">
            <button className="sfb-apply-btn" id="sfb-apply-btn" onClick={handleApply}>
              Apply Filters
            </button>
            <button className="sfb-reset-btn" id="sfb-reset-btn" onClick={handleReset}>
              <FaTimes /> Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
