import "dotenv/config";
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

// Fix BigInt for JSON
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const app = express();
const prisma = new PrismaClient(); // Standard initialization works in Prisma 5!
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

const ConsentSchema = z.object({
  userIdentifier: z.string().min(1, "User ID is required"),
  purpose: z.string().min(3, "Purpose is required"),
  action: z.enum(["GRANTED", "DENIED", "REVOKED"]),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional()
});

app.get('/', (req, res) => {
  res.json({ status: 'TrustKey API is Online 🟢', version: 'Stable 5.0' });
});

app.post('/register', async (req: any, res: any) => {
  try {
    const { name, website } = req.body;
    const apiKey = "tk_" + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const tenant = await prisma.tenant.create({
      data: { name, website, apiKey }
    });
    res.json({ success: true, apiKey: tenant.apiKey });
  } catch (error) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post('/v1/consent', async (req: any, res: any) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: "Missing API Key" });
  
  const tenant = await prisma.tenant.findUnique({ where: { apiKey: String(apiKey) } });
  if (!tenant) return res.status(403).json({ error: "Invalid API Key" });

  const validation = ConsentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error.format() });
  }

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
    res.json({ success: true, log_id: log.id, timestamp: log.timestamp });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database Write Failed" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TrustKey Server running on http://localhost:${PORT}`);
});
