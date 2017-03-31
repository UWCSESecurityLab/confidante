npm install
node --version
echo '{
    "web": {
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "client_id": "not_a_real_client_id",
        "client_secret": "not_a_real_client_secret",
        "redirect_uris": [
            "http://localhost:9090/gmailRedirect"
        ],
        "token_uri": "https://accounts.google.com/o/oauth2/token"
    }
}' > credentials/web.json
npm test
