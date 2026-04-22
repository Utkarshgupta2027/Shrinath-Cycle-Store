export function getStoredUser() {
  const storedUser = localStorage.getItem("user");

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch (error) {
    return null;
  }
}

export function normalizeStoredUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.userId ?? null,
    name: user.name || user.username || "",
    username: user.username || user.name || "",
    phoneNo: user.phoneNo || user.phoneNumber || "",
    phoneNumber: user.phoneNumber || user.phoneNo || "",
    email: user.email || "",
    role: user.role || "CUSTOMER",
    verified: Boolean(user.verified),
  };
}

export function setStoredUser(user) {
  const normalizedUser = normalizeStoredUser(user);

  if (!normalizedUser) {
    localStorage.removeItem("user");
    return;
  }

  localStorage.setItem("user", JSON.stringify(normalizedUser));
}

export function isAdminUser(user = getStoredUser()) {
  return user?.role === "ADMIN";
}

export function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearStoredAuth() {
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("token");
  sessionStorage.removeItem("authDraft");
}
