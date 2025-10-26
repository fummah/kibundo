# Kibundo - Deutsche Bildungsplattform

Kibundo ist eine umfassende Bildungsplattform, die darauf ausgelegt ist, das Lernen für Schüler, Eltern und Lehrer zu verbessern. Die Plattform bietet KI-gestützte Funktionen, Hausaufgabenscanner, Fortschrittsverfolgung und vieles mehr.

## 🚀 Funktionen

- **KI-gestützte Lernunterstützung**: Intelligente Assistenten für Schüler, Eltern und Lehrer
- **Hausaufgabenscanner**: Automatische Erkennung und Verarbeitung von Hausaufgaben
- **Fortschrittsverfolgung**: Detaillierte Berichte über den Lernfortschritt
- **Mehrsprachige Unterstützung**: Vollständig auf Deutsch lokalisiert
- **Sichere Kommunikation**: DSGVO-konforme Datenverarbeitung

## 🛠️ Technologie-Stack

### Frontend
- React 18 mit Vite
- Ant Design UI-Komponenten
- i18next für Internationalisierung
- Tailwind CSS für Styling
- React Router für Navigation

### Backend
- Node.js mit Express
- PostgreSQL Datenbank
- Sequelize ORM
- OpenAI Integration
- Tesseract.js für OCR

## 📦 Installation

### Voraussetzungen
- Node.js (Version 18 oder höher)
- PostgreSQL
- npm oder yarn

### Backend einrichten

```bash
cd backend1
npm install
```

Erstelle eine `.env` Datei mit folgenden Variablen:
```env
DB_NAME=kibundo
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
```

```bash
npm run dev
```

### Frontend einrichten

```bash
cd frontend
npm install
```

```bash
npm run dev
```

## 🌐 Spracheinstellungen

Die gesamte Anwendung ist standardmäßig auf Deutsch konfiguriert:

- **Frontend**: i18next mit Deutsch als Standardsprache
- **Backend**: Alle Kontext-Builder verwenden Deutsch
- **KI-Assistenten**: Konfiguriert für deutsche Kommunikation
- **Zeitzone**: Europa/Berlin

## 📁 Projektstruktur

```
kibundo/
├── backend1/                 # Backend API
│   ├── config/              # Konfigurationsdateien
│   ├── controllers/         # API Controller
│   ├── models/              # Datenbankmodelle
│   ├── routes/              # API Routen
│   └── services/            # Geschäftslogik
├── frontend/                # React Frontend
│   ├── src/
│   │   ├── components/      # Wiederverwendbare Komponenten
│   │   ├── pages/           # Seiten-Komponenten
│   │   ├── locales/         # Übersetzungsdateien
│   │   └── utils/           # Hilfsfunktionen
└── docker-compose.yml       # Docker-Konfiguration
```

## 🔧 Entwicklung

### Frontend-Entwicklung
```bash
cd frontend
npm run dev
```

### Backend-Entwicklung
```bash
cd backend1
npm run dev
```

### Datenbank-Migrationen
```bash
cd backend1
npx sequelize-cli db:migrate
```

## 🌍 Internationalisierung

Die Anwendung unterstützt vollständige Internationalisierung:

- **Deutsch (Standard)**: `frontend/src/locales/de/translation.json`
- **Englisch**: `frontend/src/locales/en/translation.json`

Neue Übersetzungen können in den entsprechenden JSON-Dateien hinzugefügt werden.

## 🔒 Sicherheit

- DSGVO-konforme Datenverarbeitung
- Sichere Authentifizierung mit JWT
- Verschlüsselte Datenübertragung
- Server in Deutschland

## 📞 Support

Bei Fragen oder Problemen wenden Sie sich an unser Support-Team.

## 📄 Lizenz

Dieses Projekt ist unter der ISC-Lizenz lizenziert.

