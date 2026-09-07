import { X, Trash2, ShoppingCart, ArrowRight, Plus, Minus } from "lucide-react";

export default function CartDrawer({ items, total, onRemove, onUpdateQty, onCheckout, isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border h-full flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <h2 className="font-display font-semibold text-foreground">Your Cart</h2>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Your cart is empty</p>
              <p className="text-xs text-muted-foreground mt-1">Add plans or credits to get started</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex items-start justify-between p-3 rounded-lg border border-border bg-accent/30">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button onClick={() => onUpdateQty(item.id, item.quantity - 1)} className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><Minus className="h-3 w-3" /></button>
                    <span className="text-xs text-foreground font-medium">{item.quantity}</span>
                    <button onClick={() => onUpdateQty(item.id, item.quantity + 1)} className="w-5 h-5 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">${(item.price * item.quantity).toFixed(2)}</span>
                  <button onClick={() => onRemove(item.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-xl font-display font-bold text-foreground">${total.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout} disabled={items.length === 0}
            className="w-full py-3 rounded-lg gold-gradient text-black font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            Proceed to Checkout <ArrowRight className="h-4 w-4" />
          </button>
          <p className="text-[10px] text-muted-foreground text-center">Secure checkout · Cancel anytime · No hidden fees</p>
        </div>
      </div>
    </div>
  );
}