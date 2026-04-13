import React, { useEffect } from "react";
import "../styles/auth.css";
import { GoogleLogin } from '@react-oauth/google';
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { msalInstance } from "../azureConfig";
import oktaAuth from "../oktaConfig";
import { useOktaAuth } from "@okta/okta-react";




const Login = () => {
	
	
	useEffect(() => {

  msalInstance.initialize().then(async () => {

    const response = await msalInstance.handleRedirectPromise();
	const urlParams = new URLSearchParams(window.location.search);
	const samlResponse = document.querySelector("input[name='SAMLResponse']");

    if (response) {
      console.log("Azure Login Success", response);
      alert("Azure Login Success");
    }
	
	// SAML Success Check
if (
window.location.href.includes("SAMLResponse") ||
window.location.href.includes("RelayState")
) {
alert("SAML Login Successful");
}
  });

}, []);

const azureLogin = async () => {
  try {

    const accounts = msalInstance.getAllAccounts();

    if (accounts.length > 0) {
      alert("Already logged in with Azure");
      console.log(accounts[0]);
      return;
    }

    const loginResponse = await msalInstance.loginPopup({
      scopes: ["user.read"],
    });

    console.log(loginResponse);

    alert("Azure Login Success");

  } catch (error) {
    console.log(error);
  }
};

const loginOkta = async () => {
await oktaAuth.signInWithRedirect();
};

const samlLogin = () => {
  window.location.href =
    "https://trial-2408192.okta.com/app/trial-2408192_cxmigrationsaml_1/exk11w1us5uRRPPi8698/sso/saml";
};



return (

<div className="container">

<div className="left">

<div className="logo">
🤖
</div>

<h1>
Next-Generation  
</h1>
<h2>CX Migration Engine</h2>

<p>
Seamlessly transform legacy Dialogflow state-machines
into dynamic Gemini agents using AI-powered automation.
</p>

<div className="features">

<div className="feature-badge">
  <span className="tick">✓</span>
  Automated Discovery
</div>

<div className="feature-badge">
  <span className="tick">✓</span>
  SSOT Generation
</div>

<div className="feature-badge">
  <span className="tick">✓</span>
  Agentic Deployment
</div>

</div>

</div>

<div className="right">

<div className="card">

<div className="company-logo">
<img class="signup-logo" src="/teksystems-logo.jpg" alt="TEKsystems" />

</div>

<h2>
Gemini Enterprise for Customer Experience
</h2>
<p className="sub-title">
Migration Assistance Engine
</p>

<div className="google-btn">
<GoogleLogin
onSuccess={(credentialResponse)=>{

const credential =
GoogleAuthProvider.credential(
credentialResponse.credential
);

signInWithCredential(auth,credential)
.then((result)=>{

console.log(result)
alert("Firebase Login Success")

})

}}

onError={()=>{

alert("Login Failed")

}}
/>
</div>

<button className="google-btn" onClick={azureLogin}>
  Sign in with Azure
</button>

<button onClick={loginOkta} className="google-btn">
Sign in with Okta
</button>

<button className="google-btn" onClick={samlLogin}>
  Sign in with SAML
</button>

<div className="signup-row">
<span>New to the platform?</span>
<a href="/signup">Create an Account</a>
</div>
</div>

</div>

</div>

);

};

export default Login;