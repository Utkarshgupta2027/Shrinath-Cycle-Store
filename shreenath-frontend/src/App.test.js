import { getStoredUser, normalizeStoredUser, readStoredJson, setStoredUser } from "./utils/auth";
import { downloadBlob } from "./utils/browser";
import { DEFAULT_THEME, applyTheme, getStoredTheme, normalizeTheme } from "./utils/theme";

describe("auth storage helpers", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("normalizeStoredUser keeps shared account fields consistent", () => {
    expect(
      normalizeStoredUser({
        userId: 7,
        username: "Krishna",
        phoneNumber: "9876543210",
        role: "ADMIN",
      })
    ).toEqual({
      id: 7,
      name: "Krishna",
      username: "Krishna",
      phoneNo: "9876543210",
      phoneNumber: "9876543210",
      email: "",
      role: "ADMIN",
      verified: false,
    });
  });

  test("setStoredUser and getStoredUser round-trip normalized user data", () => {
    setStoredUser({
      id: 11,
      name: "Rider",
      phoneNo: "9999999999",
      email: "rider@example.com",
    });

    expect(getStoredUser()).toEqual({
      id: 11,
      name: "Rider",
      username: "Rider",
      phoneNo: "9999999999",
      phoneNumber: "9999999999",
      email: "rider@example.com",
      role: "CUSTOMER",
      verified: false,
    });
  });

  test("readStoredJson falls back safely for corrupted local storage", () => {
    localStorage.setItem("broken", "{not-json");

    expect(readStoredJson("broken", [])).toEqual([]);
    expect(localStorage.getItem("broken")).toBeNull();
  });

  test("getStoredTheme falls back to default theme for corrupted settings", () => {
    localStorage.setItem("user", JSON.stringify({ id: 5, name: "Theme User" }));
    localStorage.setItem("settingsCenter:5", "{bad-json");

    expect(getStoredTheme()).toBe(DEFAULT_THEME);
    expect(localStorage.getItem("settingsCenter:5")).toBeNull();
  });

  test("applyTheme normalizes unknown values and updates the document", () => {
    expect(normalizeTheme("sepia")).toBe("dark");
    expect(applyTheme("light")).toBe("light");
    expect(document.body.classList.contains("app-theme-light")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("downloadBlob creates and revokes an object URL", () => {
    const createObjectURL = jest.fn(() => "blob:test");
    const revokeObjectURL = jest.fn();
    const originalCreateElement = document.createElement.bind(document);
    const anchor = originalCreateElement("a");
    const click = jest.spyOn(anchor, "click").mockImplementation(() => {});
    const remove = jest.spyOn(anchor, "remove").mockImplementation(() => {});
    const createElement = jest.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "a") {
        return anchor;
      }
      return originalCreateElement(tagName);
    });

    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    downloadBlob(new Blob(["hello"], { type: "text/plain" }), "demo.txt");

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe("demo.txt");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

    click.mockRestore();
    remove.mockRestore();
    createElement.mockRestore();
  });
});
