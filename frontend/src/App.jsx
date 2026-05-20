import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import oktaAuth from "./oktaConfig";
import { useEffect } from "react";
import { BACKEND_BASE_URL, saveSession } from "./session";

const OktaCallback = () => {

useEffect(() => {

const handleOkta = async () => {

try {

const { tokens } = await oktaAuth.token.parseFromUrl()

oktaAuth.tokenManager.setTokens(tokens)

const userEmail = tokens.idToken.claims.email
const identityValue = tokens.idToken.claims.sub || userEmail

console.log("Okta Email:", userEmail)

saveSession({
email: userEmail,
loginType: "okta",
identityValue
})
localStorage.setItem("autoLogin", "true")

const response = await fetch(`${BACKEND_BASE_URL}/auth/resolve-user`, {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify({
email: userEmail,
loginType: "okta",
identityValue,
actor: "okta-callback"
})
})

const data = await response.json()

if(data.registered){

if (data.user?.isDeleted) {
alert("This user is de-registered. Please contact support.")
return
}

saveSession({
userId: data.userId,
email: userEmail,
loginType: "okta",
identityValue
})

window.location.href="/dashboard"

}else{

window.location.href="/signup?email=" + encodeURIComponent(userEmail) + "&loginType=okta&identityValue=" + encodeURIComponent(identityValue)

}

} catch (err) {

console.log("Okta Error", err)

}

}

handleOkta()

},[])

return <div>Processing Okta Login...</div>

}

function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login/callback" element={<OktaCallback />} />        
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>

    </BrowserRouter>

  );

}

export default App;
