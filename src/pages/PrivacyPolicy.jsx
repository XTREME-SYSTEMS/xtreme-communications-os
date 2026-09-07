import { Link } from "react-router-dom";
import { Shield } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-8 w-8 rounded-lg object-contain" alt="Xtreme Communications" />
            <span className="font-display text-sm tracking-[0.15em] uppercase text-foreground">Xtreme Communications</span>
          </Link>
          <Link to="/register" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">Start Free</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Legal</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 7, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Overview</h2>
            <p>Xtreme Communications ("we", "us", "our") provides a communications platform offering SMS, MMS, voice, WhatsApp, email, and AI agent services. This Privacy Policy explains how we collect, use, store, and protect your data when you use our platform at xtreme-communications.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <p className="mb-2"><strong className="text-foreground">Account Data:</strong> Name, email address, company name, billing information (processed by Wix/Stripe), and authentication credentials.</p>
            <p className="mb-2"><strong className="text-foreground">Communications Data:</strong> Message content (SMS, MMS, WhatsApp, email), call recordings, transcripts, voicemails, and metadata (sender, recipient, timestamps, delivery status).</p>
            <p className="mb-2"><strong className="text-foreground">Usage Data:</strong> API calls, feature usage, IP addresses, device information, and session logs.</p>
            <p><strong className="text-foreground">Contact Data:</strong> Phone numbers, email addresses, and contact lists you upload or communicate with through the platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide, operate, and maintain the communications platform and AI agent services</li>
              <li>To route SMS, MMS, voice, WhatsApp, and email messages through our carrier partners</li>
              <li>To process payments and manage subscriptions via Wix Payments</li>
              <li>To generate AI-powered content, templates, and conversation intelligence</li>
              <li>To provide analytics, call recordings, and conversation logs</li>
              <li>To comply with legal obligations and carrier requirements (TCPA, 10DLC, A2P)</li>
              <li>To prevent fraud, spam, and abuse of the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Service Providers</h2>
            <p className="mb-2">We share data with the following categories of providers to deliver our services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong className="text-foreground">Telecom carriers</strong> (Telnyx and partners) — for SMS, MMS, voice, and number provisioning</li>
              <li><strong className="text-foreground">Payment processing</strong> (Wix Payments / Stripe) — for billing and subscriptions</li>
              <li><strong className="text-foreground">Google Workspace</strong> (Calendar, Gmail, Tasks, Drive) — when you connect your account for scheduling and email automation</li>
              <li><strong className="text-foreground">AI providers</strong> — for conversational AI, speech-to-text, text-to-speech, and content generation</li>
              <li><strong className="text-foreground">Cloud infrastructure</strong> (Supabase, Base44) — for data storage and application hosting</li>
            </ul>
            <p className="mt-2">Each provider processes data under their own privacy policy and applicable data processing agreements. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Data Retention</h2>
            <p>Communications data (messages, call recordings, transcripts) is retained for the life of your account unless you delete it. You may delete messages, recordings, and contact data at any time from your dashboard. Account data is retained for 90 days after account closure for billing reconciliation, then permanently deleted unless legal retention is required.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Data Security</h2>
            <p>All data is encrypted in transit (TLS 1.2+) and at rest. API keys are hashed and stored securely. Access to production data is restricted to authorized personnel with multi-factor authentication. We conduct regular security audits and maintain SOC2-aligned controls.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. SMS & Communications Consent</h2>
            <p>By using the platform, you confirm that you have obtained proper consent from your contacts before sending SMS, MMS, WhatsApp, or voice communications. You are responsible for compliance with the TCPA, CTIA A2P 10DLC rules, WhatsApp Business policies, and CAN-SPAM Act. We do not send messages on your behalf without your explicit action or configured automation.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Your Rights</h2>
            <p className="mb-2">Depending on your jurisdiction (CCPA/CPRA for California, GDPR for EU/UK residents), you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction or deletion of your data</li>
              <li>Opt out of the sale or sharing of personal information</li>
              <li>Restrict or object to certain processing</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for communications at any time</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at privacy@xtreme-communications.com.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Children's Privacy</h2>
            <p>Our platform is intended for business use only. We do not knowingly collect data from children under 16. If you believe a minor has provided us data, contact us and we will delete it.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. International Data Transfers</h2>
            <p>Your data may be processed in the United States and other countries where our providers operate. We rely on Standard Contractual Clauses and adequacy decisions for lawful international transfers under GDPR.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Material changes will be notified via email and posted on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Contact Us</h2>
            <p>For privacy questions or data requests, email privacy@xtreme-communications.com or write to: Xtreme Communications, Attn: Privacy, [Business Address].</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
          <Link to="/acceptable-use" className="text-muted-foreground hover:text-foreground">Acceptable Use</Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}