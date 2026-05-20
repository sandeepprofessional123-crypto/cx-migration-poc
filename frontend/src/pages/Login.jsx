import React, { useEffect } from "react";
import "../styles/auth.css";
import { GoogleLogin } from '@react-oauth/google';
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../firebase";
import { msalInstance } from "../azureConfig";
import oktaAuth from "../oktaConfig";
import { BACKEND_BASE_URL, clearSession, decodeJwtPayload, saveSession } from "../session";


const Login = () => {

  useEffect(() => {

    const init = async () => {
      await msalInstance.initialize()

      const storedEmail = localStorage.getItem("userEmail")
      const storedIdentityValue = localStorage.getItem("identityValue")
      const storedLoginType = localStorage.getItem("loginType")
      const autoLogin = localStorage.getItem("autoLogin")

      // SAML callback takes priority over any previously cached session.
      const params = new URLSearchParams(window.location.search)
      const samlEmail = params.get("email")
      const samlLoginType = params.get("loginType")
      const samlIdentityValue = params.get("identityValue")

      if (samlEmail && samlLoginType === "saml") {
        await handleLogin({
          email: samlEmail,
          loginType: "saml",
          identityValue: samlIdentityValue || samlEmail
        })
        return
      }


      if (autoLogin && storedEmail && storedLoginType) {

        localStorage.removeItem("autoLogin")

        await handleLogin({
          email: storedEmail,
          loginType: storedLoginType,
          identityValue: storedIdentityValue || storedEmail
        })
        return

      }

      const response = await msalInstance.handleRedirectPromise()

      // Azure Redirect
      if (response) {

        const userEmail = response.account.username
        const identityValue =
          response.account.idTokenClaims?.oid ||
          response.account.idTokenClaims?.sub ||
          response.account.localAccountId ||
          userEmail

        await handleLogin({
          email: userEmail,
          loginType: "azure",
          identityValue
        })

        return

      }

      // Okta Redirect
      try {

        const res = await oktaAuth.handleLoginRedirect()

        if (res && res.idToken) {

          const userEmail = res.idToken.claims.email
          const identityValue = res.idToken.claims.sub || userEmail

          await handleLogin({
            email: userEmail,
            loginType: "okta",
            identityValue
          })

          return
        }

      } catch (e) { }

      // Azure fallback
      const accounts = msalInstance.getAllAccounts()

      if (accounts.length > 0 && localStorage.getItem("autoLogin")) {

        const userEmail = accounts[0].username
        const identityValue =
          accounts[0].idTokenClaims?.oid ||
          accounts[0].idTokenClaims?.sub ||
          accounts[0].localAccountId ||
          userEmail

        await handleLogin({
          email: userEmail,
          loginType: "azure",
          identityValue
        })

      }
    }

    init()

  }, [])


  const azureLogin = async () => {

    try {

      await msalInstance.initialize()

      await msalInstance.loginRedirect({
        scopes: ["user.read"]
      })

    } catch (error) {
      console.log(error)
    }

  }

  const loginOkta = async () => {
    localStorage.setItem("loginType", "okta");
    await oktaAuth.signInWithRedirect();
  };

  const samlLogin = () => {

    window.location.href =
      "https://trial-2408192.okta.com/app/trial-2408192_cxmigrationsaml_1/exk11w1us5uRRPPi8698/sso/saml"
  }

  const linkLoginType = async ({ userId, loginType, identityValue }) => {

    const response = await fetch(
      `${BACKEND_BASE_URL}/user/link-login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          loginType,
          identityValue,
          actor: "frontend-login"
        })
      }
    )

    if (!response.ok) {
      throw new Error("Failed to link login type")
    }

    return response.json()
  }


  const handleLogin = async ({ email, loginType, identityValue }) => {
    saveSession({ email, loginType, identityValue })
    localStorage.setItem("autoLogin", "true")

    const response = await fetch(
      `${BACKEND_BASE_URL}/auth/resolve-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          loginType,
          identityValue,
          actor: "frontend-login"
        })
      }
    )

    const data = await response.json()

    if (data.registered) {

      if (data.user?.isDeleted) {
        alert("This user is de-registered. Please contact support.")
        clearSession()
        return
      }

      saveSession({ userId: data.userId, email, loginType, identityValue })

      const loginTypes = data.user?.loginTypes || []
      if (!loginTypes.includes(loginType)) {
        await linkLoginType({ userId: data.userId, loginType, identityValue })
      }

      window.location.href = "/dashboard"

    } else {

      window.location.href =
        `/signup?email=${encodeURIComponent(email || "")}&loginType=${loginType}&identityValue=${encodeURIComponent(identityValue || "")}`
    }
  }


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
            <img className="signup-logo" src="/teksystems-logo.jpg" alt="TEKsystems" />

          </div>

          <h2>
            Gemini Enterprise for Customer Experience
          </h2>
          <p className="sub-title">
            Migration Assistance Engine
          </p>

          <div className="google-btn">
            <GoogleLogin
              onSuccess={(credentialResponse) => {

                const credential =
                  GoogleAuthProvider.credential(
                    credentialResponse.credential
                  );

                signInWithCredential(auth, credential)
                  .then((result) => {

                    console.log(result)

                    const userEmail = result.user.email
                    const claims = decodeJwtPayload(credentialResponse.credential)
                    const identityValue = claims.sub || userEmail

                    alert("Firebase Login Success")

                    handleLogin({
                      email: userEmail,
                      loginType: "google",
                      identityValue
                    })

                  })

              }}

              onError={() => {

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
