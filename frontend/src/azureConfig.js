import { PublicClientApplication } from "@azure/msal-browser";

const msalConfig = {
  auth: {
    clientId: "f0ca9f56-8af4-44fe-b261-52b904b2ed38",
    authority: "https://login.microsoftonline.com/ab1d17c7-20bb-4514-8264-666f91714841",
    redirectUri: window.location.origin
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false
  }
};

export const msalInstance = new PublicClientApplication(msalConfig);
