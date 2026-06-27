"use client";

import { useState } from "react";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip } from "@nextui-org/react";
import { ShoppingCart, Download, X, Package, Truck, Shield } from "lucide-react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  designDataUrl: string;
  shirtColor: string;
  shirtStyle: string;
  onProceed: () => void;
}

const PRICES = {
  classic: 24.99,
  vneck: 26.99,
  polo: 29.99,
  longsleeve: 31.99,
  crop: 22.99,
  hoodie: 44.99,
};

const SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
const QUANTITIES = [1, 2, 3, 4, 5, 10];

export function PreviewModal({
  isOpen, onClose, designDataUrl, shirtColor, shirtStyle, onProceed,
}: PreviewModalProps) {
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const [ordered, setOrdered] = useState(false);

  const price = PRICES[shirtStyle as keyof typeof PRICES] || 24.99;
  const total = (price * quantity).toFixed(2);

  const handleOrder = () => {
    setOrdered(true);
    setTimeout(() => {
      onProceed();
      setOrdered(false);
    }, 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      classNames={{
        base: "bg-[#0d0d14] border border-white/10",
        header: "border-b border-white/8",
        footer: "border-t border-white/8",
      }}
    >
      <ModalContent>
        {() => (
          <>
            <ModalHeader className="flex items-center gap-2 text-white">
              {ordered ? "✅ Order Confirmed!" : "Review Your Design"}
            </ModalHeader>
            <ModalBody>
              {ordered ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(124,58,237,0.2)", border: "2px solid rgba(124,58,237,0.5)" }}
                  >
                    <span className="text-3xl">🎉</span>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold text-lg mb-1">Order placed successfully!</p>
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                      Your custom t-shirt design has been saved and sent to production.
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-4 w-full"
                    style={{ background: "rgba(124,58,237,0.1)", border: "0.5px solid rgba(124,58,237,0.3)" }}
                  >
                    <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
                      Order #TC-{Math.floor(Math.random() * 90000 + 10000)} · Estimated delivery: 5–7 business days
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex gap-6">
                  {/* Preview */}
                  <div className="flex-1">
                    <div
                      className="rounded-2xl overflow-hidden flex items-center justify-center"
                      style={{
                        background: "repeating-conic-gradient(rgba(255,255,255,0.04) 0% 25%, transparent 0% 50%) 0 0 / 16px 16px",
                        minHeight: 280,
                      }}
                    >
                      {designDataUrl && (
                        <img
                          src={designDataUrl}
                          alt="Design preview"
                          className="max-w-full max-h-72 object-contain"
                          style={{ borderRadius: 8 }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-center mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Final design export
                    </p>
                  </div>

                  {/* Details */}
                  <div className="w-52 flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Size</p>
                      <div className="flex flex-wrap gap-1.5">
                        {SIZES.map(s => (
                          <button
                            key={s}
                            onClick={() => setSelectedSize(s)}
                            className="w-9 h-9 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: selectedSize === s ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                              border: selectedSize === s ? "1px solid rgba(124,58,237,0.7)" : "0.5px solid rgba(255,255,255,0.1)",
                              color: selectedSize === s ? "#c4b5fd" : "rgba(255,255,255,0.5)",
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>Qty</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg text-lg flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "0.5px solid rgba(255,255,255,0.1)" }}
                        >−</button>
                        <span className="text-white font-semibold w-6 text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity(q => q + 1)}
                          className="w-8 h-8 rounded-lg text-lg flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "0.5px solid rgba(255,255,255,0.1)" }}
                        >+</button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Unit price</span>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>${price}</span>
                      </div>
                      <div className="flex justify-between text-xs mb-2">
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>Quantity</span>
                        <span style={{ color: "rgba(255,255,255,0.7)" }}>×{quantity}</span>
                      </div>
                      <div className="h-px mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-white">Total</span>
                        <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>${total}</span>
                      </div>
                    </div>

                    {/* Trust signals */}
                    <div className="flex flex-col gap-1.5">
                      {[
                        { icon: Package, text: "Print-on-demand" },
                        { icon: Truck, text: "Ships in 3–5 days" },
                        { icon: Shield, text: "Satisfaction guarantee" },
                      ].map(({ icon: Icon, text }) => (
                        <div key={text} className="flex items-center gap-2">
                          <Icon size={12} style={{ color: "rgba(167,139,250,0.7)" }} />
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>
            {!ordered && (
              <ModalFooter>
                <Button variant="flat" onPress={onClose} className="text-gray-400">
                  Keep editing
                </Button>
                <Button
                  onPress={handleOrder}
                  className="font-semibold text-white px-8"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                  startContent={<ShoppingCart size={15} />}
                >
                  Place Order — ${total}
                </Button>
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
