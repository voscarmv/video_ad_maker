curl -X POST -d client_id=FREESOUND_CLIENT_ID&client_secret=FREESOUND_KEY&grant_type=authorization_code&code=FREESOUND_AUTH https://freesound.org/apiv2/oauth2/access_token/
# result is FREESOUND_ACCESS and FREESOUND_REFRESH
# {"access_token": FREESOUND_ACCESS, "expires_in": 86400, "token_type": "Bearer", "scope": "read write", "refresh_token": FREESOUND_REFRESH}
curl -H "Authorization: Bearer FREESOUND_ACCESS" https://freesound.org/apiv2/sounds/193902/download/ --output sound.wav
# to refresh the token
curl -X POST -d "client_id=FREESOUND_CLIENT_ID&client_secret=FREESOUND_KEY&grant_type=refresh_token&refresh_token=FREESOUND_REFRESH" "https://freesound.org/apiv2/oauth2/access_token/"
# result is a new FREESOUND_ACCESS and FREESOUND_REFRESH

# For this app, generte FREESOUND_ACCESS through this chain and refresh with every single use