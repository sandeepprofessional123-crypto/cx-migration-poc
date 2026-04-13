from google.cloud import firestore

db = firestore.Client()

def register_user(data):
    db.collection("users").document(data["email"]).set(data)


def get_user(email):
    doc = db.collection("users").document(email).get()

    if doc.exists:
        return doc.to_dict()
    else:
        return None