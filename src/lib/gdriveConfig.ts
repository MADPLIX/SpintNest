// Google OAuth Client ID für SprintNest.
// Erstelle in der Google Cloud Console ein Projekt, aktiviere die Google Drive API
// und lege eine OAuth 2.0 Client-ID (Typ: Desktop-Anwendung) an.
// Erlaubte Redirect-URIs: http://127.0.0.1 (Google erlaubt alle Ports automatisch)
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Für Desktop-Apps ist das Secret kein echtes Geheimnis (liegt im App-Code),
// Google verlangt es beim Token-Austausch trotzdem.
export const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
