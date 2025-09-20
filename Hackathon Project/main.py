import os
from spotipy.oauth2 import SpotifyOAuth
from spotipy import Spotify
from flask import Flask, request, redirect
import requests
from dotenv import load_dotenv

load_dotenv()

sp = Spotify(auth_manager=SpotifyOAuth(
    client_id=os.getenv("CLIENT_ID"),
    client_secret=os.getenv("CLIENT_ID_SECRET"),
    redirect_uri=os.getenv("URI"),
    scope="playlist-modify-private"
))



