import os
import re
import traceback
from pathlib import Path
from urllib.parse import quote

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware import Middleware
from fastapi.responses import JSONResponse, RedirectResponse
from onelogin.saml2.auth import OneLogin_Saml2_Auth

from bigquery_client import (
    create_user,
    ensure_bigquery_tables,
    get_user_by_email,
    get_user_by_identity,
    get_user_by_user_id,
    link_login_type,
    soft_delete_user,
)

FRONTEND_ORIGINS = [
    "https://frontend-67986467720.us-central1.run.app",
    "http://localhost:5173",
]

ALLOWED_LOGIN_TYPES = {"azure", "google", "okta", "saml"}
ALLOWED_CUSTOMER_TYPES = {"partner", "internal", "trial", "personal"}

EXPECTED_CONFIG = {
    "azure": {
        "tenantId": "ab1d17c7-20bb-4514-8264-666f91714841",
        "clientId": "f0ca9f56-8af4-44fe-b261-52b904b2ed38",
        "redirectUrl": "https://frontend-67986467720.us-central1.run.app",
    },
    "google": {
        "clientId": "67986467720-3bosuos6ditste9ke8uuat37bnlqakpl.apps.googleusercontent.com",
        "redirectUrl": "https://frontend-67986467720.us-central1.run.app",
    },
    "okta": {
        "domain": "https://trial-2408192.okta.com",
        "clientId": "0oa11w0c9spj9ddys698",
    },
    "saml": {
        "entityId": "https://backend-67986467720.us-central1.run.app/metadata",
        "ssoUrl": "https://trial-2408192.okta.com/app/trial-2408192_cxmigrationsaml_1/exk11w1us5uRRPPi8698/sso/saml",
    },
}

app = FastAPI(
    middleware=[
        Middleware(
            CORSMiddleware,
            allow_origins=FRONTEND_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    ]
)


@app.on_event("startup")
def startup_event():
    ensure_bigquery_tables()


def clean_str(value):
    if isinstance(value, str):
        return value.strip()
    return value


def normalize_url(value):
    cleaned = clean_str(value)
    if isinstance(cleaned, str):
        return cleaned.rstrip("/")
    return cleaned


def validate_signup_data(data: dict):
    errors = []

    first_name = clean_str(data.get("firstName"))
    last_name = clean_str(data.get("lastName"))
    email = clean_str(data.get("email"))
    phone = clean_str(data.get("phone"))
    company = clean_str(data.get("company"))
    address1 = clean_str(data.get("address1"))
    city = clean_str(data.get("city"))
    state = clean_str(data.get("state"))
    postal_code = clean_str(data.get("postalCode"))
    country = clean_str(data.get("country"))
    login_type = clean_str(data.get("loginType"))
    customer_type = clean_str(data.get("customerType"))
    terms_accepted = data.get("termsAccepted")

    if not first_name:
        errors.append("First name is required.")
    if not last_name:
        errors.append("Last name is required.")
    if not email:
        errors.append("Official email is required.")
    elif not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
        errors.append("Official email must be a valid email address.")
    if not phone:
        errors.append("Phone number is required.")
    if not company:
        errors.append("Company name is required.")
    if not address1:
        errors.append("Address line 1 is required.")
    if not city:
        errors.append("City is required.")
    if not state:
        errors.append("State is required.")
    if not postal_code:
        errors.append("Postal code is required.")
    if not country:
        errors.append("Country is required.")
    if not login_type:
        errors.append("Login type is required.")
    elif login_type not in ALLOWED_LOGIN_TYPES:
        errors.append("Login type must be one of: azure, google, okta, saml.")
    if not customer_type:
        errors.append("Customer type is required.")
    elif customer_type not in ALLOWED_CUSTOMER_TYPES:
        errors.append("Customer type must be one of: partner, internal, trial, personal.")
    if terms_accepted is not True:
        errors.append("You must accept the terms and conditions.")

    if login_type == "azure":
        tenant_id = clean_str(data.get("tenantId"))
        client_id = clean_str(data.get("clientId"))
        redirect_url = normalize_url(data.get("redirectUrl"))

        if not tenant_id:
            errors.append("Tenant ID is required for Azure SSO.")
        elif tenant_id != EXPECTED_CONFIG["azure"]["tenantId"]:
            errors.append(f"Azure Tenant ID must match the current setup: {EXPECTED_CONFIG['azure']['tenantId']}")

        if not client_id:
            errors.append("Client ID is required for Azure SSO.")
        elif client_id != EXPECTED_CONFIG["azure"]["clientId"]:
            errors.append(f"Azure Client ID must match the current setup: {EXPECTED_CONFIG['azure']['clientId']}")

        if not redirect_url:
            errors.append("Redirect URL is required for Azure SSO.")
        elif redirect_url != EXPECTED_CONFIG["azure"]["redirectUrl"]:
            errors.append(f"Azure Redirect URL must match the current setup: {EXPECTED_CONFIG['azure']['redirectUrl']}")

    if login_type == "google":
        client_id = clean_str(data.get("clientId"))
        redirect_url = normalize_url(data.get("redirectUrl"))

        if not client_id:
            errors.append("Client ID is required for Google SSO.")
        elif client_id != EXPECTED_CONFIG["google"]["clientId"]:
            errors.append(f"Google Client ID must match the current setup: {EXPECTED_CONFIG['google']['clientId']}")

        if not redirect_url:
            errors.append("Redirect URL is required for Google SSO.")
        elif redirect_url != EXPECTED_CONFIG["google"]["redirectUrl"]:
            errors.append(f"Google Redirect URL must match the current setup: {EXPECTED_CONFIG['google']['redirectUrl']}")

    if login_type == "okta":
        domain = normalize_url(data.get("domain"))
        client_id = clean_str(data.get("clientId"))

        if not domain:
            errors.append("Domain URL is required for Okta.")
        elif domain != EXPECTED_CONFIG["okta"]["domain"]:
            errors.append(f"Okta Domain URL must match the current setup: {EXPECTED_CONFIG['okta']['domain']}")

        if not client_id:
            errors.append("Client ID is required for Okta.")
        elif client_id != EXPECTED_CONFIG["okta"]["clientId"]:
            errors.append(f"Okta Client ID must match the current setup: {EXPECTED_CONFIG['okta']['clientId']}")

    if login_type == "saml":
        entity_id = normalize_url(data.get("entityId"))
        sso_url = normalize_url(data.get("ssoUrl"))

        if not entity_id:
            errors.append("Entity ID is required for SAML.")
        elif entity_id != EXPECTED_CONFIG["saml"]["entityId"]:
            errors.append(f"SAML Entity ID must match the current setup: {EXPECTED_CONFIG['saml']['entityId']}")

        if not sso_url:
            errors.append("SSO URL is required for SAML.")
        elif sso_url != EXPECTED_CONFIG["saml"]["ssoUrl"]:
            errors.append(f"SAML SSO URL must match the current setup: {EXPECTED_CONFIG['saml']['ssoUrl']}")

    return errors


@app.get("/")
def root():
    return {"status": "Backend Running"}


@app.post("/signup")
def signup(data: dict):
    errors = validate_signup_data(data)
    if errors:
        raise HTTPException(status_code=400, detail=errors)

    login_type = clean_str(data.get("loginType"))
    email = clean_str(data.get("email"))
    identity_value = clean_str(data.get("identityValue"))

    existing_user = None
    if identity_value:
        existing_user = get_user_by_identity(login_type, identity_value)
    if not existing_user and email:
        existing_user = get_user_by_email(email)

    if existing_user:
        return {
            "status": "exists",
            "message": "User already registered",
            "userId": existing_user["userId"],
            "user": existing_user,
        }

    user = create_user(
        {
            "firstName": clean_str(data.get("firstName")),
            "lastName": clean_str(data.get("lastName")),
            "email": email,
            "phone": clean_str(data.get("phone")),
            "company": clean_str(data.get("company")),
            "customerType": clean_str(data.get("customerType")),
            "termsAccepted": data.get("termsAccepted"),
            "address1": clean_str(data.get("address1")),
            "address2": clean_str(data.get("address2")),
            "city": clean_str(data.get("city")),
            "state": clean_str(data.get("state")),
            "postalCode": clean_str(data.get("postalCode")),
            "country": clean_str(data.get("country")),
            "loginType": login_type,
            "identityValue": identity_value,
            "actor": "signup",
            "ssoConfig": {
                "tenantId": clean_str(data.get("tenantId")),
                "clientId": clean_str(data.get("clientId")),
                "redirectUrl": normalize_url(data.get("redirectUrl")),
                "domain": normalize_url(data.get("domain")),
                "entityId": normalize_url(data.get("entityId")),
                "ssoUrl": normalize_url(data.get("ssoUrl")),
            },
        }
    )

    return {"status": "created", "message": "User Registered", "userId": user["userId"], "user": user}


@app.post("/auth/resolve-user")
def resolve_user(data: dict):
    login_type = clean_str(data.get("loginType"))
    identity_value = clean_str(data.get("identityValue"))
    email = clean_str(data.get("email"))
    actor = clean_str(data.get("actor")) or "resolve-user"

    if not login_type:
        raise HTTPException(status_code=400, detail="loginType is required")

    user = None
    if identity_value:
        user = get_user_by_identity(login_type, identity_value)

    if user:
        return {"registered": True, "userId": user["userId"], "user": user, "linked": False}

    if email:
        email_user = get_user_by_email(email)
        if email_user:
            linked_user, status = link_login_type(
                email_user["userId"],
                login_type,
                identity_value=identity_value,
                actor=actor,
            )
            return {
                "registered": True,
                "userId": (linked_user or email_user)["userId"],
                "user": linked_user or email_user,
                "linked": status == "updated",
            }

    return {"registered": False}


@app.get("/user/{user_id}")
def check_user(user_id: str):
    user = get_user_by_user_id(user_id)
    if user:
        return {"registered": True, "user": user}
    return {"registered": False}


@app.post("/user/link-login")
def link_login(data: dict):
    user_id = clean_str(data.get("userId"))
    login_type = clean_str(data.get("loginType"))
    identity_value = clean_str(data.get("identityValue"))
    actor = clean_str(data.get("actor")) or "link-login"

    if not user_id or not login_type:
        raise HTTPException(status_code=400, detail="userId and loginType are required")

    user = get_user_by_user_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    updated_user, status = link_login_type(user_id, login_type, identity_value=identity_value, actor=actor)
    if status == "updated":
        return {"status": "updated", "message": "New login type linked", "user": updated_user}
    return {"status": "exists", "message": "Login type already linked", "user": user}


@app.post("/user/deregister")
def deregister_user(data: dict):
    user_id = clean_str(data.get("userId"))
    actor = clean_str(data.get("actor")) or "self-service"
    reason = clean_str(data.get("reason"))

    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")

    user = soft_delete_user(user_id, actor=actor, reason=reason)
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")
    return {"status": "updated", "message": "User soft deleted", "user": user}


async def prepare_request(request: Request):
    forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    forwarded_host = request.headers.get("x-forwarded-host", request.headers.get("host", ""))
    forwarded_port = request.headers.get("x-forwarded-port")

    if not forwarded_port:
        forwarded_port = "443" if forwarded_proto == "https" else "80"

    return {
        "https": "on" if forwarded_proto == "https" else "off",
        "http_host": forwarded_host,
        "server_port": forwarded_port,
        "script_name": request.url.path,
        "get_data": dict(request.query_params),
        "post_data": dict(await request.form()),
    }


@app.post("/saml/callback")
async def saml_callback(request: Request):
    try:
        req = await prepare_request(request)
        saml_base_path = str(Path(__file__).resolve().parent / "saml")

        auth = OneLogin_Saml2_Auth(req, custom_base_path=saml_base_path)
        auth.process_response()

        errors = auth.get_errors()

        if errors:
            return JSONResponse(
                status_code=400,
                content={
                    "error": errors,
                    "reason": auth.get_last_error_reason(),
                    "request": {
                        "get_data": req.get("get_data"),
                        "post_data": req.get("post_data"),
                    },
                },
            )

        attributes = auth.get_attributes()
        email = None
        identity_value = auth.get_nameid()

        for key, value in attributes.items():
            if "email" in key.lower() and value:
                email = value[0]
                break

        if not email:
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Email not found in SAML response",
                    "attributes": attributes,
                    "request": {
                        "get_data": req.get("get_data"),
                        "post_data": req.get("post_data"),
                    },
                },
            )

        return RedirectResponse(
            f"https://frontend-67986467720.us-central1.run.app/?email={quote(email)}&loginType=saml&identityValue={quote(identity_value or email)}"
        )

    except Exception as exc:
        return JSONResponse(
            status_code=500,
            content={
                "error": "SAML callback failed",
                "exception": str(exc),
                "traceback": traceback.format_exc(),
            },
        )

    if not email:
        raise HTTPException(
            status_code=400,
            detail={"error": "Email not found in SAML response", "attributes": attributes},
        )

    return RedirectResponse(
        f"https://frontend-67986467720.us-central1.run.app/?email={quote(email)}&loginType=saml&identityValue={quote(identity_value or email)}"
    )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
