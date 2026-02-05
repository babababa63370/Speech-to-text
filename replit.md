# VoiceScribe

## Overview

VoiceScribe is a mobile-first audio transcription application built with Expo/React Native. Users can record audio directly in the app or upload audio files, which are then transcribed using OpenAI's speech-to-text API. The app stores transcription history locally and provides features to view, copy, share, and delete past transcriptions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Expo SDK 54 with React Native 0.81
- **Routing**: expo-router with file-based routing (app/ directory)
- **State Management**: 
  - React Query for server state and API calls
  - React Context (TranscriptionContext) for local transcription state
  - AsyncStorage for persistent local storage of transcriptions
- **UI Components**: Custom components using React Native primitives with platform-specific adaptations
- **Styling**: StyleSheet API with dark/light mode support via useColorScheme

### Backend Architecture

- **Framework**: Express.js server running alongside Expo
- **API Design**: RESTful endpoints with SSE (Server-Sent Events) for streaming transcription responses
- **Audio Processing**: 
  - Server-side audio format detection (WAV, MP3, WebM, MP4, OGG)
  - FFmpeg conversion to WAV for compatibility with OpenAI API
  - Supports large audio files up to 50MB

### Data Storage

- **Client-side**: AsyncStorage for transcription history (no server persistence for transcriptions currently)
- **Server-side**: PostgreSQL with Drizzle ORM configured, though currently using in-memory storage for users
- **Schema Location**: shared/schema.ts contains database table definitions

### AI Integration

- **Provider**: OpenAI via Replit AI Integrations
- **Primary Feature**: Speech-to-text transcription with streaming responses
- **Additional Capabilities**: Chat, image generation, and voice chat utilities available in server/replit_integrations/

### Key Design Patterns

1. **Streaming Transcription**: Audio is sent as base64, server streams back text via SSE for real-time UI updates
2. **Cross-Platform Compatibility**: Code handles web vs native differences (file reading, audio recording)
3. **Shared Types**: shared/ directory contains schemas used by both client and server
4. **Modular Integrations**: server/replit_integrations/ provides reusable AI service wrappers

## External Dependencies

### AI Services
- **OpenAI API** (via Replit AI Integrations): Speech-to-text transcription, chat completions, image generation
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Database
- **PostgreSQL**: Configured via Drizzle ORM
  - Environment variable: `DATABASE_URL`
  - Migration files in ./migrations/

### System Dependencies
- **FFmpeg**: Required for audio format conversion on the server

### Key NPM Packages
- expo-audio, expo-av: Audio recording capabilities
- expo-document-picker: File upload functionality
- expo-clipboard, expo-sharing: Content sharing features
- drizzle-orm, drizzle-zod: Database ORM and validation
- @tanstack/react-query: Data fetching and caching
- openai: OpenAI API client
- p-limit, p-retry: Rate limiting and retry logic for batch operations