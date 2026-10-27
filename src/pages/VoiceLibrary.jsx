import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Play, Save, Phone, Sparkles, Zap, DollarSign, Clock, Languages, Search, Heart, Star, Volume2, Check } from 'lucide-react';
import SolVoiceRanking from '@/components/voice/SolVoiceRanking';

// Benchmark data from research (2026)
const PROVIDER_BENCHMARKS = [
  { id: 'elevenlabs', name: 'ElevenLabs', tier: 'premium', latency: '~75ms', price: '$50/1M', cloning: true, languages: 70, best: 'Voice marketplace, cloning, broadest coverage' },
  { id: 'inworld', name: 'Inworld TTS-2', tier: 'premium', latency: '<100ms', price: '$25/1M', cloning: true, languages: 200, best: 'Realtime at volume, lowest enterprise price' },
  { id: 'cartesia', name: 'Cartesia Sonic', tier: 'premium', latency: '<90ms', price: '$40/1M', cloning: true, languages: 40, best: 'Lowest published TTFA, instant cloning' },
  { id: 'openai', name: 'OpenAI TTS', tier: 'premium', latency: '~500ms', price: '$19/1M', cloning: false, languages: 50, best: 'OpenAI stack integration, low cost' },
  { id: 'deepgram', name: 'Deepgram Aura-2', tier: 'standard', latency: '~200ms', price: '$30/1M', cloning: false, languages: 30, best: 'STT+TTS one vendor, phone quality' },
  { id: 'hume', name: 'Hume Octave', tier: 'premium', latency: 'N/A', price: '$70/mo', cloning: true, languages: 20, best: 'Emotion-forward, expressive voice' },
  { id: 'google', name: 'Google Cloud TTS', tier: 'standard', latency: '~200ms', price: '$16/1M', cloning: false, languages: 40, best: 'GCP stack, neural voices' },
  { id: 'azure', name: 'Azure Neural TTS', tier: 'standard', latency: '~150ms', price: '$16/1M', cloning: true, languages: 140, best: '400+ neural voices, enterprise-grade' },
  { id: 'polly', name: 'Amazon Polly', tier: 'standard', latency: '~150ms', price: '$16/1M', cloning: false, languages: 60, best: 'Twilio-native, always available, no API key' },
];

// ── MASSIVE FEMALE VOICE CATALOG (mirrors voiceProviders.ts) ──
const FEMALE_VOICE_CATALOG = [
  // Amazon Polly — 35 voices
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Kendra', name: 'Kendra', accent: 'US English', tone: 'Professional, authoritative', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Joanna', name: 'Joanna', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Salli', name: 'Salli', accent: 'US English', tone: 'Friendly, approachable', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Kimberly', name: 'Kimberly', accent: 'US English', tone: 'Mature, confident', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Ivy', name: 'Ivy', accent: 'US English', tone: 'Young, energetic', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Ruth', name: 'Ruth', accent: 'US English', tone: 'Deep, authoritative', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Stephen', name: 'Stephen', accent: 'US English', tone: 'Calm, neutral', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Aria', name: 'Aria', accent: 'US English', tone: 'Warm, expressive', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Nika', name: 'Nika', accent: 'US English', tone: 'Bright, youthful', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Danielle', name: 'Danielle', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Camila', name: 'Camila', accent: 'US Spanish', tone: 'Warm, natural', language: 'es-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Lupe', name: 'Lupe', accent: 'US Spanish', tone: 'Friendly, energetic', language: 'es-US' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Mia', name: 'Mia', accent: 'Mexican Spanish', tone: 'Warm, conversational', language: 'es-MX' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Lucia', name: 'Lucia', accent: 'Castilian Spanish', tone: 'Elegant, refined', language: 'es-ES' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Bianca', name: 'Bianca', accent: 'Italian', tone: 'Warm, melodic', language: 'it-IT' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Carla', name: 'Carla', accent: 'Italian', tone: 'Professional, clear', language: 'it-IT' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Amy', name: 'Amy', accent: 'British English', tone: 'Refined, professional', language: 'en-GB' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Emma', name: 'Emma', accent: 'British English', tone: 'Warm, friendly', language: 'en-GB' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Ada', name: 'Ada', accent: 'British English', tone: 'Calm, measured', language: 'en-GB' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Nicole', name: 'Nicole', accent: 'Australian English', tone: 'Natural, friendly', language: 'en-AU' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Olivia', name: 'Olivia', accent: 'Australian English', tone: 'Warm, approachable', language: 'en-AU' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Gwyneth', name: 'Gwyneth', accent: 'Welsh English', tone: 'Soft, melodic', language: 'cy-GB' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Zhiyu', name: 'Zhiyu', accent: 'Mandarin Chinese', tone: 'Warm, natural', language: 'cmn-CN' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Seoyeon', name: 'Seoyeon', accent: 'Korean', tone: 'Bright, friendly', language: 'ko-KR' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Kazuha', name: 'Kazuha', accent: 'Japanese', tone: 'Calm, professional', language: 'ja-JP' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Mizuki', name: 'Mizuki', accent: 'Japanese', tone: 'Warm, youthful', language: 'ja-JP' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Vicki', name: 'Vicki', accent: 'German', tone: 'Professional, precise', language: 'de-DE' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Marlene', name: 'Marlene', accent: 'German', tone: 'Mature, authoritative', language: 'de-DE' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Lea', name: 'Léa', accent: 'French', tone: 'Young, energetic', language: 'fr-FR' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Celine', name: 'Céline', accent: 'French', tone: 'Professional, refined', language: 'fr-FR' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Ingrid', name: 'Ingrid', accent: 'Norwegian', tone: 'Warm, natural', language: 'nb-NO' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Ewa', name: 'Ewa', accent: 'Polish', tone: 'Professional, clear', language: 'pl-PL' },
  { provider: 'polly', providerName: 'Amazon Polly', tier: 'standard', id: 'Tatyana', name: 'Tatyana', accent: 'Russian', tone: 'Professional, measured', language: 'ru-RU' },
  // ElevenLabs — 32 voices
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Rachel', name: 'Rachel', accent: 'American', tone: 'Calm, narrative', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Domi', name: 'Domi', accent: 'American', tone: 'Strong, warm', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Bella', name: 'Bella', accent: 'American', tone: 'Soft, friendly', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Sarah', name: 'Sarah', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Charlotte', name: 'Charlotte', accent: 'Swedish', tone: 'Bright, youthful', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Matilda', name: 'Matilda', accent: 'American', tone: 'Friendly, warm', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Lily', name: 'Lily', accent: 'British', tone: 'Warm, professional', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Elli', name: 'Elli', accent: 'American', tone: 'Emotional, expressive', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Freya', name: 'Freya', accent: 'British', tone: 'Calm, authoritative', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Grace', name: 'Grace', accent: 'American', tone: 'Warm, nurturing', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Hannah', name: 'Hannah', accent: 'American', tone: 'Professional, clear', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Isabella', name: 'Isabella', accent: 'Italian-American', tone: 'Warm, expressive', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Jessica', name: 'Jessica', accent: 'American', tone: 'Confident, professional', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Karen', name: 'Karen', accent: 'American', tone: 'Mature, authoritative', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Laura', name: 'Laura', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Mia', name: 'Mia', accent: 'American', tone: 'Young, energetic', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Nina', name: 'Nina', accent: 'American', tone: 'Soft, intimate', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Olivia', name: 'Olivia', accent: 'British', tone: 'Refined, elegant', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Penelope', name: 'Penelope', accent: 'Spanish', tone: 'Warm, melodic', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Quinn', name: 'Quinn', accent: 'American', tone: 'Confident, sharp', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Ruby', name: 'Ruby', accent: 'American', tone: 'Warm, storytelling', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Sophia', name: 'Sophia', accent: 'American', tone: 'Professional, clear', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Tara', name: 'Tara', accent: 'Irish', tone: 'Warm, friendly', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Uma', name: 'Uma', accent: 'Indian', tone: 'Professional, calm', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Victoria', name: 'Victoria', accent: 'British', tone: 'Authoritative, refined', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Willow', name: 'Willow', accent: 'American', tone: 'Soft, gentle', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Xena', name: 'Xena', accent: 'American', tone: 'Strong, confident', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Yara', name: 'Yara', accent: 'Middle Eastern', tone: 'Warm, professional', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Zara', name: 'Zara', accent: 'British', tone: 'Calm, measured', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Aria', name: 'Aria', accent: 'American', tone: 'Bright, youthful', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Diana', name: 'Diana', accent: 'American', tone: 'Professional, warm', language: 'en' },
  { provider: 'elevenlabs', providerName: 'ElevenLabs', tier: 'premium', id: 'Elena', name: 'Elena', accent: 'Spanish', tone: 'Warm, expressive', language: 'en' },
  // OpenAI — 6 voices
  { provider: 'openai', providerName: 'OpenAI TTS', tier: 'premium', id: 'nova', name: 'Nova', accent: 'American', tone: 'Warm, natural', language: 'en' },
  { provider: 'openai', providerName: 'OpenAI TTS', tier: 'premium', id: 'shimmer', name: 'Shimmer', accent: 'American', tone: 'Bright, clear', language: 'en' },
  { provider: 'openai', providerName: 'OpenAI TTS', tier: 'premium', id: 'alloy', name: 'Alloy', accent: 'Neutral', tone: 'Balanced, versatile', language: 'en' },
  { provider: 'openai', providerName: 'OpenAI TTS', tier: 'premium', id: 'sage', name: 'Sage', accent: 'American', tone: 'Calm, measured', language: 'en' },
  { provider: 'openai', providerName: 'OpenAI TTS', tier: 'premium', id: 'coral', name: 'Coral', accent: 'American', tone: 'Warm, friendly', language: 'en' },
  { provider: 'openai', providerName: 'OpenAI TTS', tier: 'premium', id: 'ash', name: 'Ash', accent: 'American', tone: 'Soft, gentle', language: 'en' },
  // Cartesia — 15 voices
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Lily', name: 'Lily', accent: 'American', tone: 'Warm, conversational', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Hannah', name: 'Hannah', accent: 'American', tone: 'Professional, clear', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Sarah', name: 'Sarah', accent: 'American', tone: 'Calm, measured', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Mia', name: 'Mia', accent: 'American', tone: 'Young, energetic', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Aria', name: 'Aria', accent: 'American', tone: 'Bright, expressive', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Emma', name: 'Emma', accent: 'British', tone: 'Warm, refined', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Charlotte', name: 'Charlotte', accent: 'American', tone: 'Professional, confident', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Sophia', name: 'Sophia', accent: 'American', tone: 'Warm, nurturing', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Isabella', name: 'Isabella', accent: 'American', tone: 'Expressive, warm', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Amelia', name: 'Amelia', accent: 'British', tone: 'Elegant, clear', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Olivia', name: 'Olivia', accent: 'American', tone: 'Calm, professional', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Ava', name: 'Ava', accent: 'American', tone: 'Bright, friendly', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Zoe', name: 'Zoe', accent: 'American', tone: 'Energetic, youthful', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Luna', name: 'Luna', accent: 'American', tone: 'Soft, dreamy', language: 'en' },
  { provider: 'cartesia', providerName: 'Cartesia Sonic', tier: 'premium', id: 'Maya', name: 'Maya', accent: 'American', tone: 'Warm, natural', language: 'en' },
  // Deepgram — 8 voices
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-asteria-en', name: 'Asteria', accent: 'American', tone: 'Warm, professional', language: 'en' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-luna-en', name: 'Luna', accent: 'American', tone: 'Calm, measured', language: 'en' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-stella-en', name: 'Stella', accent: 'American', tone: 'Bright, energetic', language: 'en' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-athena-en', name: 'Athena', accent: 'American', tone: 'Authoritative, clear', language: 'en' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-hera-en', name: 'Hera', accent: 'American', tone: 'Professional, warm', language: 'en' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-diana-en', name: 'Diana', accent: 'American', tone: 'Confident, refined', language: 'en' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-lorena-en', name: 'Lorena', accent: 'Spanish', tone: 'Warm, melodic', language: 'es' },
  { provider: 'deepgram', providerName: 'Deepgram Aura-2', tier: 'standard', id: 'aura-2-bianca-en', name: 'Bianca', accent: 'Italian', tone: 'Warm, expressive', language: 'it' },
  // Google — 18 voices
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Neural2-F', name: 'Neural2-F', accent: 'US English', tone: 'Warm, professional', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Neural2-A', name: 'Neural2-A', accent: 'US English', tone: 'Calm, measured', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Neural2-E', name: 'Neural2-E', accent: 'US English', tone: 'Bright, friendly', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Wavenet-F', name: 'Wavenet-F', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Wavenet-E', name: 'Wavenet-E', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Journey-F', name: 'Journey-F', accent: 'US English', tone: 'Natural, expressive', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-US-Journey-D', name: 'Journey-D', accent: 'US English', tone: 'Calm, professional', language: 'en-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-GB-Neural2-F', name: 'Neural2-F (UK)', accent: 'British English', tone: 'Refined, professional', language: 'en-GB' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-GB-Wavenet-F', name: 'Wavenet-F (UK)', accent: 'British English', tone: 'Warm, clear', language: 'en-GB' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'en-AU-Neural2-C', name: 'Neural2-C (AU)', accent: 'Australian English', tone: 'Natural, friendly', language: 'en-AU' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'es-US-Neural2-A', name: 'Neural2-A (ES)', accent: 'US Spanish', tone: 'Warm, natural', language: 'es-US' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'fr-FR-Neural2-B', name: 'Neural2-B (FR)', accent: 'French', tone: 'Elegant, warm', language: 'fr-FR' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'de-DE-Neural2-C', name: 'Neural2-C (DE)', accent: 'German', tone: 'Professional, precise', language: 'de-DE' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'it-IT-Neural2-C', name: 'Neural2-C (IT)', accent: 'Italian', tone: 'Warm, melodic', language: 'it-IT' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'pt-BR-Neural2-A', name: 'Neural2-A (PT)', accent: 'Brazilian Portuguese', tone: 'Warm, friendly', language: 'pt-BR' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'ja-JP-Neural2-B', name: 'Neural2-B (JA)', accent: 'Japanese', tone: 'Calm, professional', language: 'ja-JP' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'ko-KR-Neural2-A', name: 'Neural2-A (KO)', accent: 'Korean', tone: 'Bright, friendly', language: 'ko-KR' },
  { provider: 'google', providerName: 'Google Cloud TTS', tier: 'standard', id: 'hi-IN-Neural2-A', name: 'Neural2-A (HI)', accent: 'Hindi', tone: 'Warm, professional', language: 'hi-IN' },
  // Hume — 6 voices
  { provider: 'hume', providerName: 'Hume Octave', tier: 'premium', id: 'hume-eva', name: 'Eva', accent: 'American', tone: 'Warm, empathetic', language: 'en' },
  { provider: 'hume', providerName: 'Hume Octave', tier: 'premium', id: 'hume-sofia', name: 'Sofia', accent: 'American', tone: 'Calm, nurturing', language: 'en' },
  { provider: 'hume', providerName: 'Hume Octave', tier: 'premium', id: 'hume-iris', name: 'Iris', accent: 'American', tone: 'Bright, cheerful', language: 'en' },
  { provider: 'hume', providerName: 'Hume Octave', tier: 'premium', id: 'hume-nora', name: 'Nora', accent: 'American', tone: 'Professional, measured', language: 'en' },
  { provider: 'hume', providerName: 'Hume Octave', tier: 'premium', id: 'hume-luna', name: 'Luna', accent: 'American', tone: 'Soft, dreamy', language: 'en' },
  { provider: 'hume', providerName: 'Hume Octave', tier: 'premium', id: 'hume-aria', name: 'Aria', accent: 'American', tone: 'Expressive, warm', language: 'en' },
  // Azure — 20 voices
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-JennyNeural', name: 'Jenny', accent: 'US English', tone: 'Warm, conversational', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-AriaNeural', name: 'Aria', accent: 'US English', tone: 'Professional, clear', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-MichelleNeural', name: 'Michelle', accent: 'US English', tone: 'Warm, professional', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-AmberNeural', name: 'Amber', accent: 'US English', tone: 'Friendly, warm', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-AvaNeural', name: 'Ava', accent: 'US English', tone: 'Bright, youthful', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-EmmaNeural', name: 'Emma', accent: 'US English', tone: 'Calm, measured', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-LibbyNeural', name: 'Libby', accent: 'US English', tone: 'Warm, natural', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-SaraNeural', name: 'Sara', accent: 'US English', tone: 'Professional, confident', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-US-NancyNeural', name: 'Nancy', accent: 'US English', tone: 'Mature, authoritative', language: 'en-US' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-GB-SoniaNeural', name: 'Sonia', accent: 'British English', tone: 'Refined, professional', language: 'en-GB' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-GB-LibbyNeural', name: 'Libby (UK)', accent: 'British English', tone: 'Warm, friendly', language: 'en-GB' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-AU-NatashaNeural', name: 'Natasha', accent: 'Australian English', tone: 'Natural, warm', language: 'en-AU' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'en-CA-ClaraNeural', name: 'Clara', accent: 'Canadian English', tone: 'Warm, professional', language: 'en-CA' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'es-ES-ElviraNeural', name: 'Elvira', accent: 'Castilian Spanish', tone: 'Warm, natural', language: 'es-ES' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'fr-FR-DeniseNeural', name: 'Denise', accent: 'French', tone: 'Warm, professional', language: 'fr-FR' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'de-DE-KatjaNeural', name: 'Katja', accent: 'German', tone: 'Professional, clear', language: 'de-DE' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'it-IT-ElsaNeural', name: 'Elsa', accent: 'Italian', tone: 'Warm, melodic', language: 'it-IT' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'pt-BR-FranciscaNeural', name: 'Francisca', accent: 'Brazilian Portuguese', tone: 'Warm, friendly', language: 'pt-BR' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'ja-JP-NanamiNeural', name: 'Nanami', accent: 'Japanese', tone: 'Warm, professional', language: 'ja-JP' },
  { provider: 'azure', providerName: 'Azure Neural TTS', tier: 'standard', id: 'ko-KR-SunHiNeural', name: 'Sun-Hi', accent: 'Korean', tone: 'Bright, friendly', language: 'ko-KR' },
  // Inworld — 8 voices
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-kira', name: 'Kira', accent: 'American', tone: 'Energetic, youthful', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-mira', name: 'Mira', accent: 'American', tone: 'Calm, professional', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-sable', name: 'Sable', accent: 'American', tone: 'Warm, storytelling', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-ava', name: 'Ava', accent: 'American', tone: 'Bright, friendly', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-nova', name: 'Nova', accent: 'American', tone: 'Confident, clear', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-stella', name: 'Stella', accent: 'British', tone: 'Refined, elegant', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-luna', name: 'Luna', accent: 'American', tone: 'Soft, dreamy', language: 'en' },
  { provider: 'inworld', providerName: 'Inworld TTS-2', tier: 'premium', id: 'inworld-iris', name: 'Iris', accent: 'American', tone: 'Warm, empathetic', language: 'en' },
];

const PROVIDER_COLORS = {
  polly: 'border-orange-500/30 bg-orange-500/5',
  elevenlabs: 'border-purple-500/30 bg-purple-500/5',
  openai: 'border-green-500/30 bg-green-500/5',
  cartesia: 'border-blue-500/30 bg-blue-500/5',
  deepgram: 'border-cyan-500/30 bg-cyan-500/5',
  google: 'border-red-500/30 bg-red-500/5',
  hume: 'border-pink-500/30 bg-pink-500/5',
  azure: 'border-sky-500/30 bg-sky-500/5',
  inworld: 'border-indigo-500/30 bg-indigo-500/5',
};

export default function VoiceLibrary() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testText, setTestText] = useState('Hi, you\'ve reached Strategic Minds AI. How can I help you today?');
  const [selectedVoice, setSelectedVoice] = useState('Kendra');
  const [selectedProvider, setSelectedProvider] = useState('polly');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => {
    loadProfiles();
    const saved = localStorage.getItem('voice_favorites');
    if (saved) setFavorites(new Set(JSON.parse(saved)));
  }, []);

  async function loadProfiles() {
    try {
      const { items } = await base44.entities.VoiceProfile.filter({}, { sort: '-created_date', limit: 50 });
      setProfiles(items);
    } catch (err) {
      // Entity might not exist yet
    }
    setLoading(false);
  }

  function toggleFavorite(voiceKey) {
    const next = new Set(favorites);
    if (next.has(voiceKey)) next.delete(voiceKey);
    else next.add(voiceKey);
    setFavorites(next);
    localStorage.setItem('voice_favorites', JSON.stringify([...next]));
  }

  function previewVoice(voice) {
    setGenerating(true);
    setPreviewUrl(null);
    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(testText);
      // Try to find a matching browser voice by name or language
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = voice?.language?.split('-')[0] || 'en';
      const match = voices.find(v =>
        v.name.toLowerCase().includes(voice?.name?.toLowerCase() || '___') ||
        v.lang.startsWith(langPrefix)
      );
      if (match) utter.voice = match;
      utter.lang = voice?.language || 'en-US';
      utter.rate = 1.0;
      utter.onend = () => setGenerating(false);
      utter.onerror = () => setGenerating(false);
      window.speechSynthesis.speak(utter);
    } else {
      setGenerating(false);
    }
  }

  async function saveProfile(voice) {
    try {
      await base44.entities.VoiceProfile.create({
        profile_name: `${voice.name} — ${voice.providerName}`,
        provider: voice.provider,
        voice_id: voice.id,
        gender: 'female',
        tone: 'professional',
        language_code: voice.language,
        speed: 1.0,
        is_default: false,
        assigned_number: '+18665711174',
        persona_name: 'Eden Skye',
        system_prompt: 'You are Eden Skye, the AI voice receptionist for Strategic Minds AI. You are professional, confident, and concise. Keep responses under 3 sentences. Speak in plain conversational English.',
        greeting: `Hi, you've reached Eden Skye with Strategic Minds AI. How can I help you today?`,
        active: true,
      });
      loadProfiles();
    } catch (err) {
      console.error(err);
    }
  }

  // Filter voices
  const filteredVoices = useMemo(() => {
    return FEMALE_VOICE_CATALOG.filter(v => {
      if (filterProvider !== 'all' && v.provider !== filterProvider) return false;
      if (filterLanguage !== 'all' && !v.language.startsWith(filterLanguage)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return v.name.toLowerCase().includes(q) ||
          v.accent.toLowerCase().includes(q) ||
          v.tone.toLowerCase().includes(q) ||
          v.providerName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [searchQuery, filterProvider, filterLanguage]);

  const totalFemaleVoices = FEMALE_VOICE_CATALOG.length;
  const voicesByProvider = useMemo(() => {
    const counts = {};
    FEMALE_VOICE_CATALOG.forEach(v => { counts[v.provider] = (counts[v.provider] || 0) + 1; });
    return counts;
  }, []);

  return (
    <div className="portal-gold-scope min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
              <Mic className="w-8 h-8 text-accent-orange" />
              AI Voice Library
            </h1>
            <p className="text-muted-foreground mt-1">
              {totalFemaleVoices} female voices across 9 providers — multi-language, multi-accent
            </p>
          </div>
          <Badge variant="outline" className="border-accent-orange/40 text-accent-orange">
            <Sparkles className="w-3 h-3 mr-1" /> {totalFemaleVoices} Voices Indexed
          </Badge>
        </div>

        <Tabs defaultValue="catalog" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl">
            <TabsTrigger value="sol">Sol Match</TabsTrigger>
            <TabsTrigger value="catalog">Voice Catalog</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
            <TabsTrigger value="studio">Voice Studio</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
          </TabsList>

          {/* ── SOL MATCH TAB — audited Oct 2026 ── */}
          <TabsContent value="sol" className="space-y-4">
            <SolVoiceRanking />
          </TabsContent>

          {/* ── VOICE CATALOG TAB (massive browsable grid) ── */}
          <TabsContent value="catalog" className="space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
              {Object.entries(voicesByProvider).map(([prov, count]) => (
                <div key={prov} className={`rounded-lg border p-2 text-center ${PROVIDER_COLORS[prov] || 'border-border'}`}>
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{prov}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search voices, accents, tones..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterProvider} onValueChange={setFilterProvider}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Provider" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Providers</SelectItem>
                      <SelectItem value="polly">Amazon Polly</SelectItem>
                      <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                      <SelectItem value="openai">OpenAI TTS</SelectItem>
                      <SelectItem value="cartesia">Cartesia</SelectItem>
                      <SelectItem value="deepgram">Deepgram</SelectItem>
                      <SelectItem value="google">Google Cloud</SelectItem>
                      <SelectItem value="hume">Hume Octave</SelectItem>
                      <SelectItem value="azure">Azure Neural</SelectItem>
                      <SelectItem value="inworld">Inworld TTS-2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Languages</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="ko">Korean</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="ru">Russian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">{filteredVoices.length} of {totalFemaleVoices} voices shown</p>
              </CardContent>
            </Card>

            {/* Voice grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredVoices.map((voice) => {
                const voiceKey = `${voice.provider}:${voice.id}`;
                const isFav = favorites.has(voiceKey);
                return (
                  <div
                    key={voiceKey}
                    className={`rounded-xl border p-4 transition-all hover:border-accent-orange/50 hover:shadow-lg ${PROVIDER_COLORS[voice.provider] || 'border-border'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-accent-orange/15 flex items-center justify-center">
                          <Mic className="w-4 h-4 text-accent-orange" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-tight">{voice.name}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{voice.providerName}</p>
                        </div>
                      </div>
                      <button onClick={() => toggleFavorite(voiceKey)} className="text-muted-foreground hover:text-accent-orange transition-colors">
                        {isFav ? <Heart className="w-4 h-4 fill-accent-orange text-accent-orange" /> : <Heart className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{voice.accent}</p>
                    <p className="text-xs text-foreground/70 mb-3">{voice.tone}</p>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5">{voice.language}</Badge>
                      <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${voice.tier === 'premium' ? 'border-accent-orange/40 text-accent-orange' : ''}`}>
                        {voice.tier}
                      </Badge>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-8"
                        onClick={() => { setSelectedVoice(voice.id); setSelectedProvider(voice.provider); previewVoice(voice); }}
                      >
                        <Play className="w-3 h-3 mr-1" /> Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 px-2"
                        onClick={() => saveProfile(voice)}
                        title="Save as Voice Profile"
                      >
                        <Save className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredVoices.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No voices match your filters.</p>
              </div>
            )}
          </TabsContent>

          {/* ── BENCHMARKS TAB ── */}
          <TabsContent value="benchmarks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top AI Voice Systems — 2026 Benchmark</CardTitle>
                <CardDescription>
                  Researched and ranked by latency, price, cloning, and language coverage.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-4">Provider</th>
                        <th className="py-2 pr-4">Tier</th>
                        <th className="py-2 pr-4"><Clock className="w-4 h-4 inline" /> Latency</th>
                        <th className="py-2 pr-4"><DollarSign className="w-4 h-4 inline" /> Price/1M</th>
                        <th className="py-2 pr-4">Cloning</th>
                        <th className="py-2 pr-4"><Languages className="w-4 h-4 inline" /> Langs</th>
                        <th className="py-2 pr-4">Best For</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PROVIDER_BENCHMARKS.map(p => (
                        <tr key={p.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 pr-4 font-medium">{p.name}</td>
                          <td className="py-3 pr-4">
                            <Badge variant={p.tier === 'premium' ? 'default' : 'secondary'} className={p.tier === 'premium' ? 'bg-accent-orange text-black' : ''}>
                              {p.tier}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.latency}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.price}</td>
                          <td className="py-3 pr-4">{p.cloning ? '✅' : '❌'}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.languages}+</td>
                          <td className="py-3 pr-4 text-xs text-muted-foreground max-w-xs">{p.best}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── VOICE STUDIO TAB ── */}
          <TabsContent value="studio" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Studio — Preview & Configure</CardTitle>
                <CardDescription>Test different voices and save profiles for your phone numbers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Provider</Label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="polly">Amazon Polly</SelectItem>
                        <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                        <SelectItem value="openai">OpenAI TTS</SelectItem>
                        <SelectItem value="cartesia">Cartesia</SelectItem>
                        <SelectItem value="deepgram">Deepgram</SelectItem>
                        <SelectItem value="google">Google Cloud</SelectItem>
                        <SelectItem value="hume">Hume Octave</SelectItem>
                        <SelectItem value="azure">Azure Neural</SelectItem>
                        <SelectItem value="inworld">Inworld TTS-2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Voice ID</Label>
                    <Input value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} placeholder="e.g. Kendra, Rachel, nova" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Test Text</Label>
                  <Textarea value={testText} onChange={(e) => setTestText(e.target.value)} rows={3} className="resize-none" />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button onClick={() => previewVoice({ provider: selectedProvider, id: selectedVoice })} disabled={generating} className="bg-accent-orange text-black hover:bg-accent-orange/90">
                    {generating ? 'Generating...' : <><Play className="w-4 h-4 mr-2" /> Preview Voice</>}
                  </Button>
                </div>

                {previewUrl && (
                  <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm text-muted-foreground mb-2">Audio preview:</p>
                    <audio controls src={previewUrl} className="w-full" />
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                  <strong>Note:</strong> Browser TTS preview uses your device's built-in voices. In live calls, Twilio uses Amazon Polly voices via &lt;Say&gt; — the selected voice ID is passed directly to Twilio.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── PROFILES TAB ── */}
          <TabsContent value="profiles" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Voice Profiles</CardTitle>
                <CardDescription>Saved voice configurations assigned to phone numbers</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-muted-foreground text-sm">Loading...</p>
                ) : profiles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mic className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No voice profiles yet. Browse the Voice Catalog and save voices you like.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profiles.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium">{p.profile_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.provider} · {p.voice_id} · {p.gender} · {p.assigned_number || 'unassigned'}
                          </p>
                          {p.persona_name && <p className="text-xs text-muted-foreground mt-1">Persona: {p.persona_name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.is_default && <Badge className="bg-accent-orange text-black">Default</Badge>}
                          {p.active && <Badge variant="outline">Active</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}