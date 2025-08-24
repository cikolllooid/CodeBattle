from fastapi import FastAPI
import os
from routes import router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


UPLOAD_DIR = "static/imgs_avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)


app = FastAPI()
app.include_router(router)

app.mount("/static/imgs_avatars", StaticFiles(directory="static/imgs_avatars"), name="static_imgs")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)