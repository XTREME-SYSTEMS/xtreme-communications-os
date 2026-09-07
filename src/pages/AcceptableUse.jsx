import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function AcceptableUse() {
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
          <AlertTriangle className="h-5 w-5 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Legal</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Acceptable Use Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 7, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Purpose</h2>
            <p>This Acceptable Use Policy ("AUP") defines the rules for using Xtreme Communications' SMS, MMS, voice, WhatsApp, email, and AI agent services. Violation of this policy may result in message blocking, account suspension, or termination without refund.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Consent Requirements</h2>
            <p className="mb-2"><strong className="text-foreground">You must obtain prior express written consent</strong> from every recipient before sending:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Automated or prerecorded voice calls (TCPA §227(b))</li>
              <li>Marketing SMS or MMS messages (TCPA §227(b), A2P 10DLC)</li>
              <li>WhatsApp Business template messages outside 24-hour session window</li>
              <li>Commercial email (CAN-SPAM Act)</li>
            </ul>
            <p className="mt-2">You must maintain records of consent for each contact and provide them upon request. Consent must be opt-in — pre-checked boxes and bundled consent are not valid.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. 10DLC & A2P Registration</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>All US local numbers used for A2P messaging must be registered with a 10DLC campaign</li>
              <li>You must accurately describe your use case and message content in campaign registration</li>
              <li>Message content must match the registered campaign use case</li>
              <li>Unregistered traffic will be blocked or filtered by carriers</li>
              <li>Toll-free numbers require separate toll-free verification for SMS</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Prohibited Content</h2>
            <p className="mb-2">You may not send any of the following via the platform:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Illegal, fraudulent, or deceptive content</li>
              <li>Phishing, malware, or malicious links</li>
              <li>Adult/sexual content via SMS/MMS (carrier-prohibited)</li>
              <li>Weapons, drugs, or controlled substances marketing</li>
              <li>Hate speech, harassment, or threatening content</li>
              <li>Content that violates intellectual property rights</li>
              <li>SHAFT-regulated content (Sex, Hate, Alcohol, Firearms, Tobacco) via 10DLC</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Prohibited Practices</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sending unsolicited messages to contacts who have not consented</li>
              <li>Using purchased, scraped, or rented contact lists without verified consent</li>
              <li>Message spoofing or falsifying sender information</li>
              <li>Call bombing, SMS flooding, or denial-of-service attacks</li>
              <li>Circumventing carrier filters or message blocking</li>
              <li>Using AI voice agents to impersonate real people without disclosure</li>
              <li>Deepfake voice cloning without the speaker's consent</li>
              <li>Sending messages at unreasonable volumes or frequencies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. AI Voice Agent Requirements</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>AI voice agents must identify themselves as AI at the start of the call where required by law</li>
              <li>You must comply with state AI voice disclosure laws (e.g., California, Florida)</li>
              <li>AI agents must not make unauthorized commitments or financial transactions</li>
              <li>Call recipients must be able to opt out or reach a human</li>
              <li>AI-generated calls to wireless numbers require prior express consent (TCPA)</li>
              <li>Do not use AI to generate emergency (911) calls or health/safety-critical communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. WhatsApp Business Rules</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use only pre-approved WhatsApp template messages for outbound outreach</li>
              <li>Session messages are allowed only within 24 hours of a customer-initiated message</li>
              <li>Do not send promotional content outside approved templates</li>
              <li>Comply with WhatsApp Commerce Policy and Business Messaging Policy</li>
              <li>Honor opt-out requests immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Email Compliance</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Include a clear unsubscribe link in all commercial emails</li>
              <li>Honor opt-out requests within 10 business days (CAN-SPAM)</li>
              <li>Use accurate "From" names and subject lines</li>
              <li>Include your physical postal address in commercial emails</li>
              <li>Do not send to purchased or harvested email lists</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Opt-Out & Suppression</h2>
            <p>You must process opt-out requests (STOP, UNSUBSCRIBE, etc.) immediately and add the contact to a suppression list. Suppressed contacts must not receive further messages through any channel. We maintain a platform-level suppression list for carriers and regulatory bodies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Data Protection</h2>
            <p>You are responsible for ensuring you have lawful bases to process the personal data of your contacts under GDPR, CCPA/CPRA, and other applicable laws. You must honor data subject requests (access, deletion, opt-out) within statutory timeframes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Monitoring & Enforcement</h2>
            <p>We monitor message traffic for compliance with this AUP and carrier requirements. We may block messages, suspend numbers, or terminate accounts for violations. We cooperate with carriers and regulatory bodies (FCC, FTC, CTIA, Meta) in investigations of abuse.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Reporting Violations</h2>
            <p>To report abuse or violations, email abuse@xtreme-communications.com. We investigate all reports and take appropriate action.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}