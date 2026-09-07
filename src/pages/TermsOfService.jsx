import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

export default function TermsOfService() {
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
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Legal</span>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: September 7, 2026</p>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Agreement to Terms</h2>
            <p>By creating an account or using the Xtreme Communications platform ("Service"), you agree to be bound by these Terms of Service and our Privacy Policy. If you are using the Service on behalf of a company, you represent that you have authority to bind that company.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p>Xtreme Communications provides a cloud-based communications platform offering SMS, MMS, voice calling, WhatsApp Business messaging, email automation, AI voice agents, phone number provisioning, and related developer APIs. The Service is provided on a subscription and pay-as-you-go basis.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Account Registration</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate registration information and keep it updated</li>
              <li>You are responsible for safeguarding your API keys and account credentials</li>
              <li>You must be at least 18 years old and authorized to enter contracts</li>
              <li>One account per person or entity; no account sharing or reselling without permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Acceptable Use</h2>
            <p className="mb-2">You agree to comply with our <Link to="/acceptable-use" className="text-primary hover:underline">Acceptable Use Policy</Link> and all applicable laws including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Telephone Consumer Protection Act (TCPA) — prior express consent for automated calls/texts</li>
              <li>CTIA A2P 10DLC — registration and campaign compliance for application-to-person messaging</li>
              <li>CAN-SPAM Act — opt-out and identification requirements for commercial email</li>
              <li>WhatsApp Business Messaging Policy — template approval and 24-hour session rules</li>
              <li>GDPR, CCPA/CPRA, and other applicable data protection laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Billing & Payments</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Subscription plans are billed monthly or annually via Wix Payments (Base44 Payments)</li>
              <li>Pay-as-you-go usage is metered and billed based on actual consumption</li>
              <li>Phone numbers incur monthly rental fees until released</li>
              <li>Overages beyond plan limits are billed at published rates</li>
              <li>Refunds are issued at our discretion for service outages per our SLA</li>
              <li>Failed payments may result in service suspension after a 5-day grace period</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. AI Agent Services</h2>
            <p>AI voice agents, content generation, and conversational AI are provided "as is" with no guarantee of accuracy or specific outcomes. You are responsible for reviewing and approving AI-generated content before sending. You are responsible for ensuring AI agents comply with all applicable laws, including disclosure requirements for AI-generated voice (FCC rules) and obtaining proper consent from call recipients.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">7. Phone Numbers & Porting</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Phone numbers are leased from carrier partners and remain subject to carrier terms</li>
              <li>You may port numbers in and out of the platform subject to carrier porting requirements</li>
              <li>Numbers not used for 60+ days may be reclaimed per carrier policy</li>
              <li>You must register 10DLC campaigns for A2P messaging before sending</li>
              <li>Toll-free numbers require separate verification for SMS use</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">8. Intellectual Property</h2>
            <p>You retain ownership of your content (messages, templates, contact data). We retain ownership of the platform, software, and AI models. You grant us a limited license to process your content solely to provide the Service. We may use anonymized, aggregated data to improve our AI models and platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">9. Service Level Agreement (SLA)</h2>
            <p>We target 99.99% uptime for the platform. Enterprise plan customers receive service credits for outages exceeding the SLA. Credits are calculated as a percentage of the monthly fee based on downtime duration. Scheduled maintenance is announced in advance and excluded from SLA calculations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, Xtreme Communications shall not be liable for indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues. Our total liability for any claim shall not exceed the amount you paid us in the 3 months preceding the claim. We are not liable for carrier outages, message delivery failures, or third-party service interruptions.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">11. Indemnification</h2>
            <p>You agree to indemnify and hold harmless Xtreme Communications from any claims arising from your use of the Service, your content, your violation of these Terms, or your violation of any law or third-party rights (including TCPA, CAN-SPAM, or privacy violations).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">12. Termination</h2>
            <p>You may cancel your account at any time. We may suspend or terminate your account for violation of these Terms, non-payment, or abuse. Upon termination, your data will be deleted after 90 days unless legal retention is required. Phone numbers will be released unless ported out.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">13. Governing Law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, USA. Disputes will be resolved in the courts of Delaware, except where local consumer protection laws mandate otherwise.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-2">14. Contact</h2>
            <p>For questions about these Terms, email legal@xtreme-communications.com.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-4 text-sm">
          <Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
          <Link to="/acceptable-use" className="text-muted-foreground hover:text-foreground">Acceptable Use</Link>
          <Link to="/" className="text-muted-foreground hover:text-foreground">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}