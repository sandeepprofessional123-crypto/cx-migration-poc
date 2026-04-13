import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { Security } from "@okta/okta-react"
import oktaAuth from "./oktaConfig"

const restoreOriginalUri = async (_oktaAuth, originalUri) => {
  window.location.replace(originalUri || "/")
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="67986467720-3bosuos6ditste9ke8uuat37bnlqakpl.apps.googleusercontent.com">
  <Security oktaAuth={oktaAuth} restoreOriginalUri={restoreOriginalUri}>
    <App />
	</Security>
  </GoogleOAuthProvider>
)