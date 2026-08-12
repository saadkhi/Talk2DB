/**
 * mailer.ts — Nodemailer Gmail SMTP sender
 *
 * Uses Gmail App Password (not your normal Gmail password).
 * Setup:
 *   1. Enable 2FA on your Google account
 *   2. Go to https://myaccount.google.com/apppasswords
 *   3. Generate a 16-char App Password for "Mail"
 *   4. Set GMAIL_USER=airtrackeroffic@gmail.com and GMAIL_APP_PASSWORD=xxxx in .env
 *
 * Configured sender: airtrackeroffic@gmail.com
 */

import nodemailer from "nodemailer";

// ── Transport (lazy-init so it doesn't fail at build time if env is missing) ──
let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
    if (_transport) return _transport;

    const user = process.env.GMAIL_USER ?? "talk2db.org@gmail.com";
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!pass) {
        throw new Error(
            "GMAIL_APP_PASSWORD is not set. " +
            "Generate one at https://myaccount.google.com/apppasswords and add it to .env"
        );
    }

    _transport = nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass },
    });

    return _transport;
}

// ── Public helpers ────────────────────────────────────────────────────────────

/** Send a 6-digit OTP verification email */
export async function sendVerificationEmail(
    toEmail: string,
    userName: string | null,
    otp: string
): Promise<void> {
    const from = process.env.GMAIL_USER ?? "talk2db.org@gmail.com";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#060812;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:480px;margin:40px auto;padding:0 16px;">
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;margin-bottom:16px;">
        <span style="color:#fff;font-size:22px;font-weight:900;">T2</span>
      </div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.02em;">Talk2DB</h1>
    </div>

    <!-- Card -->
    <div style="background:#0d0f1a;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h2 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;letter-spacing:-0.02em;">
        Verify your email
      </h2>
      <p style="color:#9CA3AF;font-size:14px;line-height:1.6;margin:0 0 28px;">
        Hi ${userName ?? "there"}, use the code below to verify your Talk2DB account.
        This code expires in <strong style="color:#fff;">15 minutes</strong>.
      </p>

      <!-- OTP box -->
      <div style="background:#060812;border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="color:#6B7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Verification Code</p>
        <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#fff;font-family:monospace;padding:0 8px;">
          ${otp}
        </div>
      </div>

      <p style="color:#6B7280;font-size:12px;line-height:1.6;margin:0;">
        If you didn't create a Talk2DB account, you can safely ignore this email.
        Never share this code with anyone.
      </p>
    </div>

    <!-- Footer -->
    <p style="text-align:center;color:#374151;font-size:11px;margin-top:24px;">
      © 2025 Talk2DB · Sent from talk2db.org@gmail.com
    </p>
  </div>
</body>
</html>`;

    await getTransport().sendMail({
        from: `"Talk2DB" <${from}>`,
        to: toEmail,
        subject: `${otp} is your Talk2DB verification code`,
        html,
        text: `Your Talk2DB verification code is: ${otp}\n\nThis code expires in 15 minutes.\nDo not share this code with anyone.`,
    });
}
