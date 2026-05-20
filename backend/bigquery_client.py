import json
import os
import uuid
from copy import deepcopy
from datetime import datetime, timezone

from google.cloud import bigquery
from google.cloud.exceptions import NotFound


PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCP_PROJECT")
DATASET_ID = os.environ.get("BQ_DATASET", "cx_migration")
CURRENT_TABLE = os.environ.get("BQ_CURRENT_TABLE", "user_registration_current")
AUDIT_TABLE = os.environ.get("BQ_AUDIT_TABLE", "user_registration_audit")


def _utc_now():
    return datetime.now(timezone.utc)


def _client():
    return bigquery.Client(project=PROJECT_ID)


def _table_path(table_name: str):
    client = _client()
    return f"{client.project}.{DATASET_ID}.{table_name}"


def _json_dumps(value):
    return json.dumps(value, default=str, sort_keys=True) if value is not None else None


def _to_datetime(value):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return value


def _provider_column(login_type: str):
    return {
        "azure": "azure_oid",
        "google": "google_sub",
        "okta": "okta_sub",
        "saml": "saml_name_id",
    }.get(login_type)


def ensure_bigquery_tables():
    client = _client()
    dataset_ref = bigquery.DatasetReference(client.project, DATASET_ID)
    dataset = bigquery.Dataset(dataset_ref)
    dataset.location = os.environ.get("BQ_LOCATION", "US")

    try:
        client.get_dataset(dataset_ref)
    except NotFound:
        client.create_dataset(dataset)

    current_ref = dataset_ref.table(CURRENT_TABLE)
    audit_ref = dataset_ref.table(AUDIT_TABLE)

    try:
        client.get_table(current_ref)
    except NotFound:
        client.create_table(
            bigquery.Table(
                current_ref,
                schema=[
                    bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("primary_email", "STRING"),
                    bigquery.SchemaField("first_name", "STRING"),
                    bigquery.SchemaField("last_name", "STRING"),
                    bigquery.SchemaField("phone", "STRING"),
                    bigquery.SchemaField("company", "STRING"),
                    bigquery.SchemaField("customer_type", "STRING"),
                    bigquery.SchemaField("login_types", "STRING", mode="REPEATED"),
                    bigquery.SchemaField("azure_oid", "STRING"),
                    bigquery.SchemaField("google_sub", "STRING"),
                    bigquery.SchemaField("okta_sub", "STRING"),
                    bigquery.SchemaField("saml_name_id", "STRING"),
                    bigquery.SchemaField("address1", "STRING"),
                    bigquery.SchemaField("address2", "STRING"),
                    bigquery.SchemaField("city", "STRING"),
                    bigquery.SchemaField("state", "STRING"),
                    bigquery.SchemaField("postal_code", "STRING"),
                    bigquery.SchemaField("country", "STRING"),
                    bigquery.SchemaField("terms_accepted", "BOOL"),
                    bigquery.SchemaField("sso_config_json", "STRING"),
                    bigquery.SchemaField("is_active", "BOOL"),
                    bigquery.SchemaField("is_deleted", "BOOL"),
                    bigquery.SchemaField("created_at", "TIMESTAMP"),
                    bigquery.SchemaField("updated_at", "TIMESTAMP"),
                    bigquery.SchemaField("deleted_at", "TIMESTAMP"),
                    bigquery.SchemaField("deleted_by", "STRING"),
                    bigquery.SchemaField("version", "INT64"),
                ],
            )
        )

    try:
        client.get_table(audit_ref)
    except NotFound:
        client.create_table(
            bigquery.Table(
                audit_ref,
                schema=[
                    bigquery.SchemaField("event_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("user_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("event_type", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("event_timestamp", "TIMESTAMP", mode="REQUIRED"),
                    bigquery.SchemaField("actor", "STRING"),
                    bigquery.SchemaField("provider", "STRING"),
                    bigquery.SchemaField("old_values_json", "STRING"),
                    bigquery.SchemaField("new_values_json", "STRING"),
                    bigquery.SchemaField("reason", "STRING"),
                ],
            )
        )


def _row_to_user(row: dict):
    return {
        "userId": row.get("user_id"),
        "email": row.get("primary_email"),
        "firstName": row.get("first_name"),
        "lastName": row.get("last_name"),
        "phone": row.get("phone"),
        "company": row.get("company"),
        "loginTypes": list(row.get("login_types") or []),
        "preferences": {
            "customerType": row.get("customer_type"),
            "termsAccepted": row.get("terms_accepted"),
        },
        "providerIdentities": {
            "azure": row.get("azure_oid"),
            "google": row.get("google_sub"),
            "okta": row.get("okta_sub"),
            "saml": row.get("saml_name_id"),
        },
        "companyDetails": {
            "address1": row.get("address1"),
            "address2": row.get("address2"),
            "city": row.get("city"),
            "state": row.get("state"),
            "postalCode": row.get("postal_code"),
            "country": row.get("country"),
        },
        "ssoConfig": json.loads(row.get("sso_config_json") or "{}"),
        "isActive": row.get("is_active"),
        "isDeleted": row.get("is_deleted"),
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else None,
        "deletedAt": row.get("deleted_at").isoformat() if row.get("deleted_at") else None,
        "deletedBy": row.get("deleted_by"),
        "version": row.get("version"),
    }


def _fetch_one(query: str, parameters=None):
    client = _client()
    config = bigquery.QueryJobConfig(query_parameters=parameters or [])
    rows = list(client.query(query, job_config=config).result())
    if not rows:
        return None
    return _row_to_user(dict(rows[0]))


def get_user_by_user_id(user_id: str):
    query = f"""
        SELECT *
        FROM `{_table_path(CURRENT_TABLE)}`
        WHERE user_id = @user_id
        LIMIT 1
    """
    params = [bigquery.ScalarQueryParameter("user_id", "STRING", user_id)]
    return _fetch_one(query, params)


def get_user_by_email(email: str):
    query = f"""
        SELECT *
        FROM `{_table_path(CURRENT_TABLE)}`
        WHERE LOWER(primary_email) = LOWER(@email)
        LIMIT 1
    """
    params = [bigquery.ScalarQueryParameter("email", "STRING", email)]
    return _fetch_one(query, params)


def get_user_by_identity(login_type: str, identity_value: str):
    provider_col = _provider_column(login_type)
    if not provider_col or not identity_value:
        return None

    query = f"""
        SELECT *
        FROM `{_table_path(CURRENT_TABLE)}`
        WHERE {provider_col} = @identity_value
        LIMIT 1
    """
    params = [bigquery.ScalarQueryParameter("identity_value", "STRING", identity_value)]
    return _fetch_one(query, params)


def write_audit_event(user_id, event_type, actor=None, provider=None, old_values=None, new_values=None, reason=None):
    client = _client()
    table_id = _table_path(AUDIT_TABLE)
    row = {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "event_type": event_type,
        "event_timestamp": _utc_now().isoformat(),
        "actor": actor,
        "provider": provider,
        "old_values_json": _json_dumps(old_values),
        "new_values_json": _json_dumps(new_values),
        "reason": reason,
    }
    errors = client.insert_rows_json(table_id, [row])
    if errors:
        raise RuntimeError(f"Failed to write audit event: {errors}")


def create_user(data: dict):
    client = _client()
    user_id = str(uuid.uuid4())
    now = _utc_now().isoformat()
    login_type = data.get("loginType")
    provider_col = _provider_column(login_type)

    row = {
        "user_id": user_id,
        "primary_email": data.get("email"),
        "first_name": data.get("firstName"),
        "last_name": data.get("lastName"),
        "phone": data.get("phone"),
        "company": data.get("company"),
        "customer_type": data.get("customerType"),
        "login_types": [login_type] if login_type else [],
        "azure_oid": None,
        "google_sub": None,
        "okta_sub": None,
        "saml_name_id": None,
        "address1": data.get("address1"),
        "address2": data.get("address2"),
        "city": data.get("city"),
        "state": data.get("state"),
        "postal_code": data.get("postalCode"),
        "country": data.get("country"),
        "terms_accepted": data.get("termsAccepted"),
        "sso_config_json": _json_dumps(data.get("ssoConfig", {})),
        "is_active": True,
        "is_deleted": False,
        "created_at": now,
        "updated_at": now,
        "deleted_at": None,
        "deleted_by": None,
        "version": 1,
    }

    if provider_col and data.get("identityValue"):
        row[provider_col] = data.get("identityValue")

    errors = client.insert_rows_json(_table_path(CURRENT_TABLE), [row])
    if errors:
        raise RuntimeError(f"Failed to insert user row: {errors}")

    user = get_user_by_user_id(user_id)
    write_audit_event(
        user_id=user_id,
        event_type="REGISTERED",
        actor=data.get("actor", "system"),
        provider=login_type,
        old_values=None,
        new_values=user,
        reason="Initial registration",
    )
    return user


def _update_user_row(user_id: str, updated_user: dict):
    client = _client()
    query = f"""
        UPDATE `{_table_path(CURRENT_TABLE)}`
        SET
          primary_email = @primary_email,
          first_name = @first_name,
          last_name = @last_name,
          phone = @phone,
          company = @company,
          customer_type = @customer_type,
          login_types = @login_types,
          azure_oid = @azure_oid,
          google_sub = @google_sub,
          okta_sub = @okta_sub,
          saml_name_id = @saml_name_id,
          address1 = @address1,
          address2 = @address2,
          city = @city,
          state = @state,
          postal_code = @postal_code,
          country = @country,
          terms_accepted = @terms_accepted,
          sso_config_json = @sso_config_json,
          is_active = @is_active,
          is_deleted = @is_deleted,
          created_at = @created_at,
          updated_at = @updated_at,
          deleted_at = @deleted_at,
          deleted_by = @deleted_by,
          version = @version
        WHERE user_id = @user_id
    """
    params = [
        bigquery.ScalarQueryParameter("user_id", "STRING", user_id),
        bigquery.ScalarQueryParameter("primary_email", "STRING", updated_user.get("email")),
        bigquery.ScalarQueryParameter("first_name", "STRING", updated_user.get("firstName")),
        bigquery.ScalarQueryParameter("last_name", "STRING", updated_user.get("lastName")),
        bigquery.ScalarQueryParameter("phone", "STRING", updated_user.get("phone")),
        bigquery.ScalarQueryParameter("company", "STRING", updated_user.get("company")),
        bigquery.ScalarQueryParameter("customer_type", "STRING", updated_user.get("preferences", {}).get("customerType")),
        bigquery.ArrayQueryParameter("login_types", "STRING", updated_user.get("loginTypes") or []),
        bigquery.ScalarQueryParameter("azure_oid", "STRING", updated_user.get("providerIdentities", {}).get("azure")),
        bigquery.ScalarQueryParameter("google_sub", "STRING", updated_user.get("providerIdentities", {}).get("google")),
        bigquery.ScalarQueryParameter("okta_sub", "STRING", updated_user.get("providerIdentities", {}).get("okta")),
        bigquery.ScalarQueryParameter("saml_name_id", "STRING", updated_user.get("providerIdentities", {}).get("saml")),
        bigquery.ScalarQueryParameter("address1", "STRING", updated_user.get("companyDetails", {}).get("address1")),
        bigquery.ScalarQueryParameter("address2", "STRING", updated_user.get("companyDetails", {}).get("address2")),
        bigquery.ScalarQueryParameter("city", "STRING", updated_user.get("companyDetails", {}).get("city")),
        bigquery.ScalarQueryParameter("state", "STRING", updated_user.get("companyDetails", {}).get("state")),
        bigquery.ScalarQueryParameter("postal_code", "STRING", updated_user.get("companyDetails", {}).get("postalCode")),
        bigquery.ScalarQueryParameter("country", "STRING", updated_user.get("companyDetails", {}).get("country")),
        bigquery.ScalarQueryParameter("terms_accepted", "BOOL", updated_user.get("preferences", {}).get("termsAccepted")),
        bigquery.ScalarQueryParameter("sso_config_json", "STRING", _json_dumps(updated_user.get("ssoConfig", {}))),
        bigquery.ScalarQueryParameter("is_active", "BOOL", updated_user.get("isActive")),
        bigquery.ScalarQueryParameter("is_deleted", "BOOL", updated_user.get("isDeleted")),
        bigquery.ScalarQueryParameter("created_at", "TIMESTAMP", _to_datetime(updated_user.get("createdAt"))),
        bigquery.ScalarQueryParameter("updated_at", "TIMESTAMP", _to_datetime(updated_user.get("updatedAt"))),
        bigquery.ScalarQueryParameter("deleted_at", "TIMESTAMP", _to_datetime(updated_user.get("deletedAt"))),
        bigquery.ScalarQueryParameter("deleted_by", "STRING", updated_user.get("deletedBy")),
        bigquery.ScalarQueryParameter("version", "INT64", updated_user.get("version")),
    ]
    config = bigquery.QueryJobConfig(query_parameters=params)
    client.query(query, job_config=config).result()


def link_login_type(user_id: str, login_type: str, identity_value: str = None, actor: str = "system"):
    existing = get_user_by_user_id(user_id)
    if not existing:
        return None, "missing"

    updated = deepcopy(existing)
    changed = False

    if login_type and login_type not in (updated.get("loginTypes") or []):
        updated["loginTypes"] = [*(updated.get("loginTypes") or []), login_type]
        changed = True

    if identity_value and login_type in updated.get("providerIdentities", {}):
        if updated["providerIdentities"].get(login_type) != identity_value:
            updated["providerIdentities"][login_type] = identity_value
            changed = True

    if not changed:
        return existing, "exists"

    updated["updatedAt"] = _utc_now().isoformat()
    updated["version"] = (updated.get("version") or 1) + 1
    _update_user_row(user_id, updated)

    latest = get_user_by_user_id(user_id)
    write_audit_event(
        user_id=user_id,
        event_type="LOGIN_TYPE_LINKED",
        actor=actor,
        provider=login_type,
        old_values=existing,
        new_values=latest,
        reason=f"Linked login type {login_type}",
    )
    return latest, "updated"


def soft_delete_user(user_id: str, actor: str = "system", reason: str = None):
    existing = get_user_by_user_id(user_id)
    if not existing:
        return None

    updated = deepcopy(existing)
    deleted_at = _utc_now().isoformat()
    updated["isActive"] = False
    updated["isDeleted"] = True
    updated["deletedAt"] = deleted_at
    updated["deletedBy"] = actor
    updated["updatedAt"] = deleted_at
    updated["version"] = (updated.get("version") or 1) + 1

    _update_user_row(user_id, updated)
    latest = get_user_by_user_id(user_id)
    write_audit_event(
        user_id=user_id,
        event_type="DEREGISTERED",
        actor=actor,
        provider=None,
        old_values=existing,
        new_values=latest,
        reason=reason or "Soft delete requested",
    )
    return latest
