import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { LoginCallback } from "@okta/okta-react";

const SamlCallback = () => {
  alert("SAML Login Successful");
  window.location.href = "/";
  return null;
};

function App(){

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Login />} />
<Route path="/signup" element={<Signup />} />
<Route path="/login/callback" element={<LoginCallback />} />
<Route path="/saml/callback" element={<SamlCallback />} />
</Routes>

</BrowserRouter>

);

}

export default App;