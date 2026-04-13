import { OktaAuth } from "@okta/okta-auth-js";

const oktaAuth = new OktaAuth({
issuer: "https://trial-2408192.okta.com/oauth2/default",
clientId: "0oa11w0c9spj9ddys698",
redirectUri: window.location.origin + "/login/callback"
});

export default oktaAuth;