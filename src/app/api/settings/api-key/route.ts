import { NextRequest, NextResponse } from 'next/server';
import { geminiElectoralExtractor } from '@/lib/ocr/gemini-extractor';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const CONFIG_FILE = path.join(process.cwd(), 'data', 'gemini_config.json');

export async function GET() {
  try {
    const isConfigured = geminiElectoralExtractor.isConfigured();
    const fullKey = geminiElectoralExtractor.getApiKey() || '';
    
    let maskedKey = '';
    if (fullKey.length > 8) {
      maskedKey = `${fullKey.slice(0, 4)}...${fullKey.slice(-4)}`;
    } else if (fullKey.length > 0) {
      maskedKey = '••••••••';
    }

    return NextResponse.json({
      configured: isConfigured,
      maskedKey,
      hasEnvKey: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 5) {
      return NextResponse.json({ error: 'Valid Gemini API key is required.' }, { status: 400 });
    }

    const trimmedKey = apiKey.trim();
    geminiElectoralExtractor.setApiKey(trimmedKey);

    // Persist to data/gemini_config.json
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ gemini_api_key: trimmedKey }, null, 2), 'utf-8');

    // Also update .env.local if exists
    try {
      const envPath = path.join(process.cwd(), '.env.local');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
      }
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${trimmedKey}`);
      } else {
        envContent = `GEMINI_API_KEY=${trimmedKey}\n` + envContent;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');
    } catch (e) {
      console.warn('Could not update .env.local:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Gemini API Key successfully updated and saved!',
      configured: true,
      maskedKey: `${trimmedKey.slice(0, 4)}...${trimmedKey.slice(-4)}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
