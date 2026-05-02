import axios from "axios";

const API_ORIGIN = "http://localhost:8080";

function getToken() {
  return localStorage.getItem("token");
}

function shouldAttachAuth(url) {
  try {
    const parsedUrl = new URL(url, window.location.origin);
    return parsedUrl.origin === API_ORIGIN && parsedUrl.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token && config.url && shouldAttachAuth(config.url)) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const nativeFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url;
  const token = getToken();

  if (!token || !url || !shouldAttachAuth(url)) {
    return nativeFetch(input, init);
  }

  const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return nativeFetch(input, { ...init, headers });
};
