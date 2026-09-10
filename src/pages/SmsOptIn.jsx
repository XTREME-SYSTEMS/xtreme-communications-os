import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageSquare, Shield, Phone, Mail, Globe } from "lucide-react";

export default function SmsOptIn() {
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!consent || !phone) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-bold text-foreground text-lg leading-none">Xtreme AI Systems</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">SMS Consent & Opt-In</p>
            </div>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">xtremeaisystems.com</Link>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">SMS Opt-In Consent</h2>
          <p className="text-sm text-muted-foreground">
            By providing your phone number and checking the consent box below, you agree to receive recurring SMS/MMS
            messages from Xtreme AI Systems. Message frequency varies. Standard message and data rates may apply.
          </p>
        </div>

        {/* Consent terms */}
        <div className="rounded-xl border border-border bg-card p-6 mb-6 space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground text-sm">What you're agreeing to</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You consent to receive promotional and account-related messages from Xtreme AI Systems, including
                limited-time discounts, product launches, loyalty offers, demos, appointments, and relevant service
                updates. This consent is not a condition of any purchase.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground text-sm">Sample message you'll receive</h3>
              <div className="mt-2 rounded-lg border border-border bg-accent/40 p-3">
                <p className="text-xs text-foreground italic">
                  "Xtreme AI Systems: Thanks for requesting information about our AI systems. We'll text you updates
                  regarding your inquiry, demos, appointments, account activity, and relevant Xtreme AI Systems
                  services. Reply STOP to opt out or HELP for help. Msg &amp; data rates may apply."
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="rounded-lg border border-border bg-accent/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Opt-out</p>
              <p className="text-xs text-foreground">Reply <span className="font-mono font-medium">STOP</span> to unsubscribe at any time.</p>
            </div>
            <div className="rounded-lg border border-border bg-accent/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Help</p>
              <p className="text-xs text-foreground">Reply <span className="font-mono font-medium">HELP</span> for support information.</p>
            </div>
            <div className="rounded-lg border border-border bg-accent/20 p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Opt-in keywords</p>
              <p className="text-xs text-foreground"><span className="font-mono font-medium">START, YES, UNSTOP</span></p>
            </div>
          </div>
        </div>

        {/* Opt-in form */}
        {!submitted ? (
          <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Provide Your Consent</h3>

            <div className="mb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(772) 209-0266"
                required
                className="w-full h-11 px-3 mt-1 rounded-lg border border-border bg-background text-sm focus:border-primary outline-none"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-xs text-muted-foreground leading-relaxed">
                I am the owner of this phone number and I consent to receive recurring SMS/MMS messages from
                Xtreme AI Systems at the number provided. I understand message frequency varies, that standard
                message and data rates may apply, and that I can reply STOP to opt out or HELP for help at any time.
              </span>
            </label>

            <button
              type="submit"
              disabled={!consent || !phone}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              I Consent — Opt In to SMS
            </button>
          </form>
        ) : (
          <div className="rounded-xl border border-status-green/40 bg-status-green/5 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-status-green mx-auto mb-3" />
            <h3 className="font-display font-semibold text-foreground text-lg mb-1">You're Subscribed!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              You've opted in to receive SMS updates from Xtreme AI Systems at {phone}. You'll receive a confirmation
              message shortly. Reply STOP to opt out or HELP for help at any time.
            </p>
          </div>
        )}

        {/* Contact info */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h3 className="font-medium text-foreground text-sm mb-3">Contact &amp; Policies</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" /> jeremy@xtremepolishingsystems.com
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" /> (772) 209-0266
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-4 w-4 text-primary" /> xtremepolishingsystems.com
            </div>
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-border">
            <Link to="/privacy" className="text-xs text-primary hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-primary hover:underline">Terms of Service</Link>
            <Link to="/acceptable-use" className="text-xs text-primary hover:underline">Acceptable Use</Link>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Xtreme AI Systems · A division of Xtreme Polishing Systems · 2200 NW 32nd Street, Suite 700, Pompano Beach, FL 33069
        </p>
      </main>
    </div>
  );
}