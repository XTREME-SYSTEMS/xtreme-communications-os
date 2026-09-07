import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <img src="https://media.base44.com/images/public/6a9b71a5d35335afb9198950/6806177bd_LOGO.png" className="h-16 w-16 mx-auto mb-6 object-contain" alt="Xtreme Communications" />
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">Thank you for your purchase. Your account is being activated and will be ready shortly.</p>
        <div className="rounded-xl border border-border bg-card p-4 mb-6 text-left">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">What happens next?</p>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Check your email for a receipt and activation instructions</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> If you're new, create an account with the same email to claim your purchase</li>
            <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> Access your dashboard to start using your plan</li>
          </ul>
        </div>
        <Link to="/portal" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg gold-gradient text-black font-medium hover:opacity-90 transition-opacity">
          Go to Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-muted-foreground mt-4">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}