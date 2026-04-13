import React, { useState } from "react";
import "../styles/auth.css";
import axios from "axios";

const Signup = () => {

const [form,setForm]=useState({})

const register = async () => {
try {

console.log("Sending form:", form)

await axios.post("https://backend-67986467720.us-central1.run.app/signup", form)

alert("User Registered")

} catch(error){

console.error("Error:", error)

alert("Registration Failed")

}
}

return (

<div className="signup-container">

<div className="signup-card">

<div className="company-logo">
<img class="signup-logo" src="/teksystems-logo.jpg" alt="TEKsystems" />

</div>

<h3 className="section-title">YOUR DETAILS</h3>

<div className="form-row">

<div className="form-group">
<label>First Name</label>
<input 
placeholder="Enter first name"
onChange={(e)=>setForm({...form,firstName:e.target.value})}
/>
</div>

<div className="form-group">
<label>Last Name</label>
<input 
placeholder="Enter last name"
onChange={(e)=>setForm({...form,lastName:e.target.value})}
/>
</div>

</div>

<div className="form-row">

<div className="form-group">
<label>Official Email</label>
<input 
placeholder="Enter official email"
onChange={(e)=>setForm({...form,email:e.target.value})}
/>
</div>

<div className="form-group">
<label>Phone No</label>
<input 
placeholder="Enter phone number"
onChange={(e)=>setForm({...form,phone:e.target.value})}
/>
</div>

</div>


<h3 className="section-title">COMPANY DETAILS</h3>

<div className="form-group">
<label>Company Name</label>
<input 
placeholder="Enter company name"
onChange={(e)=>setForm({...form,company:e.target.value})}
/>
</div>

<div className="form-group">
<label>Address Line 1</label>
<input placeholder="Address line 1" />
</div>

<div className="form-group">
<label>Address Line 2 (Optional)</label>
<input placeholder="Address line 2" />
</div>

<div className="form-row">

<div className="form-group">
<label>City</label>
<input placeholder="City" />
</div>

<div className="form-group">
<label>State</label>
<input placeholder="State" />
</div>

</div>

<div className="form-row">

<div className="form-group">
<label>Postal Code</label>
<input placeholder="Postal code" />
</div>

<div className="form-group">
<label>Country</label>
<input placeholder="Country" />
</div>

</div>


<h3 className="section-title">PREFERENCES</h3>

<div className="radio-row">

<div className="radio-label">
Promotion:
</div>

<div className="promotion-badge">
APR26
</div>

</div>


<div className="radio-row">

<div className="radio-label">
Login Type:
</div>

<div className="radio-options">

<label>
<input type="radio" name="loginType" /> Azure SSO
</label>

<label>
<input type="radio" name="loginType" /> Google SSO
</label>

<label>
<input type="radio" name="loginType" /> Okta
</label>

<label>
<input type="radio" name="loginType" /> SAML
</label>

</div>

</div>


<div className="radio-row">

<div className="radio-label">
Customer Type:
</div>

<div className="radio-options">

<label>
<input type="radio" name="customer"/> Partner
</label>

<label>
<input type="radio" name="customer"/> Internal
</label>

<label>
<input type="radio" name="customer"/> Trial
</label>

<label>
<input type="radio" name="customer"/> Personal
</label>

</div>

</div>


<div className="terms">
<label>
<input type="checkbox" />
Terms and Conditions
</label>
</div>


<div className="button-group">

<button className="cancel-btn">
Cancel
</button>

<button className="register-btn" onClick={register}>
Register
</button>

</div>

</div>

</div>

);

};

export default Signup;