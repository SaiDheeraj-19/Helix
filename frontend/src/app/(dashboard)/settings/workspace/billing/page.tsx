"use client";

/**
 * Helix — Billing Settings Page
 * Shows current plan and upgrade options.
 */

import { Check, Zap, Building2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for small teams getting started.",
    color: "from-zinc-500 to-zinc-600",
    current: true,
    features: [
      "Up to 5 members",
      "Unlimited projects",
      "Basic issue tracking",
      "1 GB storage",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$12",
    period: "per member/month",
    description: "For growing teams that need more power.",
    color: "from-blue-500 to-indigo-600",
    current: false,
    popular: true,
    features: [
      "Unlimited members",
      "Advanced workflows",
      "Cycles & sprints",
      "Analytics & reports",
      "10 GB storage",
      "Priority support",
      "AI Assistant (100 req/day)",
    ],
  },
  {
    name: "Business",
    price: "$24",
    period: "per member/month",
    description: "Enterprise-ready for large organizations.",
    color: "from-violet-500 to-purple-700",
    current: false,
    features: [
      "Everything in Pro",
      "SSO & SAML",
      "Custom workflows",
      "Audit logs",
      "100 GB storage",
      "Dedicated support",
      "Unlimited AI Assistant",
      "SLA guarantees",
    ],
  },
];

export default function BillingPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-bold mb-1">Plans & Billing</h1>
        <p className="text-sm text-muted-foreground">
          Choose the plan that works best for your team.
        </p>
      </div>

      {/* Current plan callout */}
      <div className="mb-8 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">
            You&apos;re on the <span className="text-primary">Free</span> plan
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upgrade to unlock unlimited members, AI assistant, and more.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
          style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}
        >
          <Zap className="w-4 h-4" />
          Upgrade
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "relative rounded-2xl border bg-card overflow-hidden transition-shadow hover:shadow-md",
              plan.popular ? "border-primary ring-2 ring-primary/20" : "border-border"
            )}
          >
            {plan.popular && (
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ background: "linear-gradient(90deg, #3b82f6, #6366f1)" }}
              />
            )}

            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold">{plan.name}</h3>
                  {plan.popular && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Most Popular
                    </span>
                  )}
                </div>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center`}>
                  {plan.name === "Free" ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : plan.name === "Pro" ? (
                    <Rocket className="w-4 h-4 text-white" />
                  ) : (
                    <Building2 className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="mb-2">
                <span className="text-3xl font-black">{plan.price}</span>
                <span className="text-xs text-muted-foreground ml-1">{plan.period}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">{plan.description}</p>

              {/* CTA */}
              {plan.current ? (
                <div className="w-full py-2 px-4 text-sm text-center rounded-lg bg-muted text-muted-foreground font-medium">
                  Current Plan
                </div>
              ) : (
                <button
                  className="w-full py-2 px-4 text-sm text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
                  style={{ background: `linear-gradient(135deg, ${plan.name === "Pro" ? "#3b82f6, #6366f1" : "#7c3aed, #4f46e5"})` }}
                >
                  Upgrade to {plan.name}
                </button>
              )}

              {/* Features */}
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ section */}
      <div className="mt-10 pt-8 border-t border-border">
        <h2 className="text-sm font-semibold mb-4">Billing FAQ</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Can I change plans anytime?</strong>{" "}
            Yes, you can upgrade or downgrade at any time. Changes take effect immediately.
          </p>
          <p>
            <strong className="text-foreground">How is billing calculated?</strong>{" "}
            Plans are billed per seat, per month. You&apos;re only charged for active members.
          </p>
          <p>
            <strong className="text-foreground">Is there a trial period?</strong>{" "}
            Pro and Business plans include a 14-day free trial, no credit card required.
          </p>
        </div>
      </div>
    </div>
  );
}
