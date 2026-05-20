export const BACKEND_BASE_URL = "https://backend-67986467720.us-central1.run.app";

export const decodeJwtPayload = (token) => {
  if (!token) return {};

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch (error) {
    console.error("Failed to decode JWT", error);
    return {};
  }
};

export const saveSession = ({ userId, email, loginType, identityValue }) => {
  if (userId) localStorage.setItem("userId", userId);
  if (email) localStorage.setItem("userEmail", email);
  if (loginType) localStorage.setItem("loginType", loginType);
  if (identityValue) localStorage.setItem("identityValue", identityValue);
};

export const clearSession = () => {
  localStorage.removeItem("userId");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("loginType");
  localStorage.removeItem("identityValue");
  localStorage.removeItem("autoLogin");
};
