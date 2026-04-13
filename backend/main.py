from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from firestore_client import register_user

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Signup(BaseModel):
    firstName:str
    lastName:str
    email:str
    phone:str
    company:str

@app.get("/")
def home():
    return {"status":"Backend Running"}

@app.post("/signup")
def signup(data: dict):

    register_user(data)

    return {"message": "User Registered"}