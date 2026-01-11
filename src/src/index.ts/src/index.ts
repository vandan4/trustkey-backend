// src/index.ts
import "dotenv/config";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// --- TOYOTA FIX: Handle BigInt ---
// JavaScript crashes if you try to send "BigInt" (Huge numbers) via JSON.
// This line fixes it by converting them to strings automatically.
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

// Initialize
const app = express();
const prisma = new PrismaClient();
const PORT = 3000;

// Middleware (Security & Logging)
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// --- VALIDATION (The Bouncer) ---
const ConsentSchema = z.object({
  userIdentifier: z.string().min(1, "User ID is required"),
  purpose: z.string().min(3, "Purpose is required"),
  action: z.enum(["GRANTED", "DENIED", "REVOKED"]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

// --- API ENDPOINTS ---

// 1. Health Check
app.get('/', (req, res) => {
  res.json({ status: 'TrustKey API is Online 🟢', version: '1.0.0' });
});

// 2. Register Tenant (Simulated "Sign Up")
app.post('/register', async (req: any, res: any) => {
  try {
    const { name, website } = req.body;
    // Generate a secure random API Key
    const apiKey = "tk_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    const tenant = await prisma.tenant.create({
      data: { name, website, apiKey }
    });

    res.json({ success: true, message: "Save this key safe!", apiKey: tenant.apiKey });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// 3. Record Consent (THE CORE PRODUCT)
app.post('/v1/consent', async (req: any, res: any) => {
  const apiKey = req.headers['x-api-key'];
  
  // A. Authenticate
  if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
  const tenant = await prisma.tenant.findUnique({ where: { apiKey: String(apiKey) } });
  if (!tenant) return res.status(403).json({ error: "Invalid API Key" });

  // B. Validate Input
  const validation = ConsentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.errors });
  }

  // C. Save Immutable Log
  try {
    const { userIdentifier, purpose, action, ipAddress, userAgent } = validation.data;
    
    const log = await prisma.consentLog.create({
      data: {
        tenantId: tenant.id,
        userIdentifier,
        purpose,
        action,
        ipAddress: ipAddress || req.ip,
        userAgent: userAgent || req.get('User-Agent')
      }
    });

    res.json({ 
      success: true, 
      log_id: log.id, 
      timestamp: log.timestamp 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database Write Failed" });
  }
});

// Start the Engine
app.listen(PORT, () => {
  console.log(`🚀 TrustKey Server running on http://localhost:${PORT}`);
});