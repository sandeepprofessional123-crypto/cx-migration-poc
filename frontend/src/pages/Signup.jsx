import React, { useState, useEffect } from "react";
import "../styles/auth.css";
import axios from "axios";
import { BACKEND_BASE_URL, saveSession } from "../session";

const EXPECTED_CONFIG = {
    azure: {
        tenantId: "ab1d17c7-20bb-4514-8264-666f91714841",
        clientId: "f0ca9f56-8af4-44fe-b261-52b904b2ed38",
        redirectUrl: "https://frontend-67986467720.us-central1.run.app"
    },
    google: {
        clientId: "67986467720-3bosuos6ditste9ke8uuat37bnlqakpl.apps.googleusercontent.com",
        redirectUrl: "https://frontend-67986467720.us-central1.run.app"
    },
    okta: {
        domain: "https://trial-2408192.okta.com",
        clientId: "0oa11w0c9spj9ddys698"
    },
    saml: {
        entityId: "https://backend-67986467720.us-central1.run.app/metadata",
        ssoUrl: "https://trial-2408192.okta.com/app/trial-2408192_cxmigrationsaml_1/exk11w1us5uRRPPi8698/sso/saml"
    }
}

const normalizeValue = (value) => (value || "").trim()

const Signup = () => {

    const [form, setForm] = useState({})
    const [loginType, setLoginType] = useState("")
    const [errors, setErrors] = useState([])

    const updateForm = (field, value) => {
        setForm(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const validateForm = () => {
        const nextErrors = []
        const email = normalizeValue(form.email)

        if (!normalizeValue(form.firstName)) nextErrors.push("First name is required.")
        if (!normalizeValue(form.lastName)) nextErrors.push("Last name is required.")
        if (!email) nextErrors.push("Official email is required.")
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            nextErrors.push("Official email must be a valid email address.")
        }
        if (!normalizeValue(form.phone)) nextErrors.push("Phone number is required.")
        if (!normalizeValue(form.company)) nextErrors.push("Company name is required.")
        if (!normalizeValue(form.address1)) nextErrors.push("Address line 1 is required.")
        if (!normalizeValue(form.city)) nextErrors.push("City is required.")
        if (!normalizeValue(form.state)) nextErrors.push("State is required.")
        if (!normalizeValue(form.postalCode)) nextErrors.push("Postal code is required.")
        if (!normalizeValue(form.country)) nextErrors.push("Country is required.")
        if (!loginType) nextErrors.push("Login type is required.")
        if (!normalizeValue(form.customerType)) nextErrors.push("Customer type is required.")
        if (!form.termsAccepted) nextErrors.push("You must accept the terms and conditions.")

        if (loginType === "azure") {
            if (!normalizeValue(form.tenantId)) nextErrors.push("Tenant ID is required for Azure SSO.")
            if (!normalizeValue(form.clientId)) nextErrors.push("Client ID is required for Azure SSO.")
            if (!normalizeValue(form.redirectUrl)) nextErrors.push("Redirect URL is required for Azure SSO.")

            if (normalizeValue(form.tenantId) && normalizeValue(form.tenantId) !== EXPECTED_CONFIG.azure.tenantId) {
                nextErrors.push(`Azure Tenant ID must match the current setup: ${EXPECTED_CONFIG.azure.tenantId}`)
            }
            if (normalizeValue(form.clientId) && normalizeValue(form.clientId) !== EXPECTED_CONFIG.azure.clientId) {
                nextErrors.push(`Azure Client ID must match the current setup: ${EXPECTED_CONFIG.azure.clientId}`)
            }
            if (normalizeValue(form.redirectUrl) && normalizeValue(form.redirectUrl) !== EXPECTED_CONFIG.azure.redirectUrl) {
                nextErrors.push(`Azure Redirect URL must match the current setup: ${EXPECTED_CONFIG.azure.redirectUrl}`)
            }
        }

        if (loginType === "google") {
            if (!normalizeValue(form.clientId)) nextErrors.push("Client ID is required for Google SSO.")
            if (!normalizeValue(form.redirectUrl)) nextErrors.push("Redirect URL is required for Google SSO.")

            if (normalizeValue(form.clientId) && normalizeValue(form.clientId) !== EXPECTED_CONFIG.google.clientId) {
                nextErrors.push(`Google Client ID must match the current setup: ${EXPECTED_CONFIG.google.clientId}`)
            }
            if (normalizeValue(form.redirectUrl) && normalizeValue(form.redirectUrl) !== EXPECTED_CONFIG.google.redirectUrl) {
                nextErrors.push(`Google Redirect URL must match the current setup: ${EXPECTED_CONFIG.google.redirectUrl}`)
            }
        }

        if (loginType === "okta") {
            if (!normalizeValue(form.domain)) nextErrors.push("Domain URL is required for Okta.")
            if (!normalizeValue(form.clientId)) nextErrors.push("Client ID is required for Okta.")

            if (normalizeValue(form.domain) && normalizeValue(form.domain) !== EXPECTED_CONFIG.okta.domain) {
                nextErrors.push(`Okta Domain URL must match the current setup: ${EXPECTED_CONFIG.okta.domain}`)
            }
            if (normalizeValue(form.clientId) && normalizeValue(form.clientId) !== EXPECTED_CONFIG.okta.clientId) {
                nextErrors.push(`Okta Client ID must match the current setup: ${EXPECTED_CONFIG.okta.clientId}`)
            }
        }

        if (loginType === "saml") {
            if (!normalizeValue(form.entityId)) nextErrors.push("Entity ID is required for SAML.")
            if (!normalizeValue(form.ssoUrl)) nextErrors.push("SSO URL is required for SAML.")

            if (normalizeValue(form.entityId) && normalizeValue(form.entityId) !== EXPECTED_CONFIG.saml.entityId) {
                nextErrors.push(`SAML Entity ID must match the current setup: ${EXPECTED_CONFIG.saml.entityId}`)
            }
            if (normalizeValue(form.ssoUrl) && normalizeValue(form.ssoUrl) !== EXPECTED_CONFIG.saml.ssoUrl) {
                nextErrors.push(`SAML SSO URL must match the current setup: ${EXPECTED_CONFIG.saml.ssoUrl}`)
            }
        }

        return nextErrors
    }

    useEffect(() => {

        const params = new URLSearchParams(window.location.search)
        const email = params.get("email")
        const identityValue = params.get("identityValue") || localStorage.getItem("identityValue")
        const loginType = params.get("loginType") || localStorage.getItem("loginType")

        if (email) {
            setForm(prev => ({
                ...prev,
                email: email
            }))
            localStorage.setItem("userEmail", email)
        }

        if (identityValue) {
            setForm(prev => ({
                ...prev,
                identityValue: identityValue
            }))
            localStorage.setItem("identityValue", identityValue)
        }

        if (loginType) {

            setLoginType(loginType)

            setForm(prev => ({
                ...prev,
                loginType: loginType
            }))

            localStorage.setItem("loginType", loginType)
        }


    }, [])



    const register = async () => {
        const validationErrors = validateForm()

        if (validationErrors.length > 0) {
            setErrors(validationErrors)
            return
        }

        try {
            setErrors([])

            console.log("Sending form:", form)

            const response = await axios.post(
                `${BACKEND_BASE_URL}/signup`,
                form
            )

            saveSession({
                userId: response.data.userId,
                email: form.email,
                loginType: form.loginType,
                identityValue: form.identityValue
            })


            alert("User Registered")

            setTimeout(() => {
                window.location.href = "/dashboard"
            }, 500)

        } catch (error) {

            console.error("Error:", error)
            const message =
                error.response?.data?.detail ||
                error.response?.data?.message ||
                "Registration Failed"
            setErrors(Array.isArray(message) ? message : [message])

        }
    }

    return (

        <div className="signup-container">
            <div className="signup-card">

                <div className="company-logo">
                    <img className="signup-logo" src="/teksystems-logo.jpg" alt="TEKsystems" />
                </div>

                <h3 className="section-title">YOUR DETAILS</h3>

                <div className="form-row">

                    <div className="form-group">
                        <label>First Name</label>
                        <input
                            placeholder="Enter first name"
                            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Last Name</label>
                        <input
                            placeholder="Enter last name"
                            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        />
                    </div>

                </div>

                <div className="form-row">

                    <div className="form-group">
                        <label>Official Email</label>
                        <input
                            placeholder="Enter official email"
                            value={form.email || ""}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Phone No</label>
                        <input
                            placeholder="Enter phone number"
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        />
                    </div>

                </div>

                <h3 className="section-title">COMPANY DETAILS</h3>

                <div className="form-group">
                    <label>Company Name</label>
                    <input
                        placeholder="Enter company name"
                        onChange={(e) => setForm({ ...form, company: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Address Line 1</label>
                    <input
                        placeholder="Address line 1"
                        onChange={(e) => setForm({ ...form, address1: e.target.value })}
                    />
                </div>

                <div className="form-group">
                    <label>Address Line 2</label>
                    <input
                        placeholder="Address line 2"
                        onChange={(e) => setForm({ ...form, address2: e.target.value })}
                    />
                </div>

                <div className="form-row">

                    <div className="form-group">
                        <label>City</label>
                        <input
                            placeholder="City"
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>State</label>
                        <input
                            placeholder="State"
                            onChange={(e) => setForm({ ...form, state: e.target.value })}
                        />
                    </div>

                </div>

                <div className="form-row">

                    <div className="form-group">
                        <label>Postal Code</label>
                        <input
                            placeholder="Postal Code"
                            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>Country</label>
                        <input
                            placeholder="Country"
                            onChange={(e) => setForm({ ...form, country: e.target.value })}
                        />
                    </div>

                </div>

                <h3 className="section-title">PREFERENCES</h3>

                {errors.length > 0 && (
                    <div
                        style={{
                            marginBottom: "16px",
                            padding: "12px 16px",
                            border: "1px solid #f2b8b5",
                            borderRadius: "10px",
                            backgroundColor: "#fff3f2",
                            color: "#9f1c1c"
                        }}
                    >
                        {errors.map((error, index) => (
                            <div key={`${error}-${index}`}>{error}</div>
                        ))}
                    </div>
                )}

                <div className="radio-row">
                    <div className="radio-label">Login Type:</div>

                    <div className="radio-options">

                        <label>
                            <input
                                type="radio"
                                value="azure"
                                name="loginType"
                                checked={loginType === "azure"}
                                onChange={(e) => {
                                    setLoginType(e.target.value)
                                    updateForm("loginType", e.target.value)
                                }}
                            /> Azure SSO
                        </label>

                        <label>
                            <input
                                type="radio"
                                value="google"
                                name="loginType"
                                checked={loginType === "google"}
                                onChange={(e) => {
                                    setLoginType(e.target.value)
                                    updateForm("loginType", e.target.value)
                                }}
                            /> Google SSO
                        </label>

                        <label>
                            <input
                                type="radio"
                                value="okta"
                                name="loginType"
                                checked={loginType === "okta"}
                                onChange={(e) => {
                                    setLoginType(e.target.value)
                                    updateForm("loginType", e.target.value)
                                }}
                            /> Okta
                        </label>

                        <label>
                            <input
                                type="radio"
                                value="saml"
                                name="loginType"
                                checked={loginType === "saml"}
                                onChange={(e) => {
                                    setLoginType(e.target.value)
                                    updateForm("loginType", e.target.value)
                                }}
                            /> SAML
                        </label>

                    </div>
                </div>

                {/* GOOGLE */}

                {loginType === "google" && (

                    <div className="popup-box">
                        <h4>Google Configuration</h4>

                        <input
                            placeholder="Client ID"
                            value={form.clientId || ""}
                            onChange={(e) => updateForm("clientId", e.target.value)}
                        />

                        <input
                            placeholder="Redirect URL"
                            value={form.redirectUrl || ""}
                            onChange={(e) => updateForm("redirectUrl", e.target.value)}
                        />

                    </div>

                )}

                {/* AZURE */}

                {loginType === "azure" && (

                    <div className="popup-box">
                        <h4>Azure Configuration</h4>

                        <input
                            placeholder="Tenant ID"
                            value={form.tenantId || ""}
                            onChange={(e) => updateForm("tenantId", e.target.value)}
                        />

                        <input
                            placeholder="Client ID"
                            value={form.clientId || ""}
                            onChange={(e) => updateForm("clientId", e.target.value)}
                        />

                        <input
                            placeholder="Redirect URL"
                            value={form.redirectUrl || ""}
                            onChange={(e) => updateForm("redirectUrl", e.target.value)}
                        />

                    </div>

                )}

                {/* OKTA */}

                {loginType === "okta" && (

                    <div className="popup-box">
                        <h4>Okta Configuration</h4>

                        <input
                            placeholder="Domain URL"
                            value={form.domain || ""}
                            onChange={(e) => updateForm("domain", e.target.value)}
                        />

                        <input
                            placeholder="Client ID"
                            value={form.clientId || ""}
                            onChange={(e) => updateForm("clientId", e.target.value)}
                        />

                    </div>

                )}

                {/* SAML */}

                {loginType === "saml" && (

                    <div className="popup-box">
                        <h4>SAML Configuration</h4>

                        <input
                            placeholder="Entity ID"
                            value={form.entityId || ""}
                            onChange={(e) => updateForm("entityId", e.target.value)}
                        />

                        <input
                            placeholder="SSO URL"
                            value={form.ssoUrl || ""}
                            onChange={(e) => updateForm("ssoUrl", e.target.value)}
                        />

                    </div>

                )}

                <div className="radio-row">

                    <div className="radio-label">
                        Customer Type:
                    </div>

                    <div className="radio-options">

                        <label>
                            <input
                                type="radio"
                                name="customer"
                                value="partner"
                                onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                            /> Partner
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="customer"
                                value="internal"
                                onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                            /> Internal
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="customer"
                                value="trial"
                                onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                            /> Trial
                        </label>

                        <label>
                            <input
                                type="radio"
                                name="customer"
                                value="personal"
                                onChange={(e) => setForm({ ...form, customerType: e.target.value })}
                            /> Personal
                        </label>

                    </div>

                </div>


                <div className="terms">
                    <label>
                        <input
                            type="checkbox"
                            onChange={(e) => setForm({ ...form, termsAccepted: e.target.checked })}
                        />
                        Terms and Conditions
                    </label>
                </div>


                <div className="button-group">

                    <button
                        className="cancel-btn"
                        onClick={() => window.location.href = "/"}
                    >
                        Cancel
                    </button>

                    <button className="register-btn" onClick={register}>
                        Register
                    </button>

                </div>

            </div>
        </div>

    )

}

export default Signup
