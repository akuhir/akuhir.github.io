# AKUHIR History & International Relations — Class Portal

Static class portal (HTML/CSS/JS) hosted on GitHub Pages.

## Monthly spotlight features

The homepage now displays **Person of the Month** and **Quote of the Month**. The Admin Dashboard can publish a person's name, description and photo, and a quote plus its author. The page loads public content from the configured Render API so all students see the same published records.

### Backend connection

`api-config.js` contains:

- `AKUHIR_API_BASE_URL`: the Render service base URL (currently set to `https://solobrowse.onrender.com`).
- `AKUHIR_API_DEPARTMENT`: `hir`.

The frontend uses the existing backend route names for compatibility, even though the visible feature labels now say “Month”:

- `GET /api/hir/person-of-week`
- `GET /api/hir/quote-of-week`
- `PUT /api/admin/hir/person-of-week` with `{name, description}`
- `POST /api/admin/hir/person-of-week/photo` multipart field `photo`
- `DELETE /api/admin/hir/person-of-week`
- `PUT /api/admin/hir/quote-of-week` with `{quoteText, quoteAuthor}`
- `DELETE /api/admin/hir/quote-of-week`

The existing Render backend's admin routes require a signed JWT bearer token. The legacy AKUHIR static login does not issue that token, so public homepage reads can work immediately but admin publishing will need the backend authentication to issue/provide a compatible token. This update deliberately does not change the existing student login. Do not remove backend authorization or expose database secrets in frontend JavaScript.

### Local fallback

If the API URL is blank or the backend cannot be reached, the homepage keeps its hardcoded default content. Saving with no API URL uses browser-only localStorage and will not synchronize across students.

### Class Members groups

The Class Members page is grouped into AKU24 and AKU25 sections. Evelyn Joshua Malgwi and Usman Bello remain in the AKU24 display group as requested, while their matric numbers are shown unchanged.
