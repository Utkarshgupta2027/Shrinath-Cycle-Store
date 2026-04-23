import { getStoredUser, normalizeStoredUser, readStoredJson, setStoredUser } from "./utils/auth";

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
});
