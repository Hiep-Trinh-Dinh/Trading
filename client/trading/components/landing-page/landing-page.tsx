'use client'

import { ArrowRight, TrendingUp, BarChart3, Shield } from 'lucide-react'

interface LandingPageProps {
  onSwitchToLogin: () => void
  onSwitchToRegister: () => void
}

export default function LandingPage({
  onSwitchToLogin,
  onSwitchToRegister,
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 dark overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center">
              <TrendingUp size={20} className="text-slate-950 font-bold" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeDemo</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onSwitchToLogin}
              className="px-6 py-2 text-foreground hover:text-primary transition-colors"
            >
              Login
            </button>
            <button
              onClick={onSwitchToRegister}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 sm:py-32 overflow-hidden">
        {/* Background gradient elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-full mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-sm text-muted-foreground">
              Free demo trading with $10,000 virtual balance
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 text-balance leading-tight">
            Practice Trading with{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 text-transparent bg-clip-text">
              Real Market Prices
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl text-balance">
            Experience live crypto and forex trading in a risk-free environment. Master trading strategies, develop skills,
            and compete with other traders—all with virtual money.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-start gap-4 mb-16">
            <button
              onClick={onSwitchToRegister}
              className="group flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium text-lg"
            >
              Start Demo Trading
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
            <button
              onClick={onSwitchToLogin}
              className="flex items-center gap-2 px-8 py-4 border border-slate-700 text-foreground rounded-lg hover:bg-slate-800/50 transition-colors font-medium text-lg"
            >
              Login to Account
            </button>
          </div>

          {/* Trust Metrics */}
          <div className="grid grid-cols-3 gap-8 border-t border-slate-800 pt-8">
            <div>
              <div className="text-2xl font-bold text-primary mb-2">50K+</div>
              <p className="text-sm text-muted-foreground">Active Traders</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">24/7</div>
              <p className="text-sm text-muted-foreground">Market Access</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary mb-2">$500M</div>
              <p className="text-sm text-muted-foreground">Practice Volume</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 sm:py-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
            Why Choose TradeDemo?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to become a better trader, with zero financial risk.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 size={24} className="text-slate-950" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Prices</h3>
              <p className="text-muted-foreground">
                Trade with live market data for crypto and forex pairs. Get accurate pricing and realistic market
                conditions.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center mb-4">
                <Shield size={24} className="text-slate-950" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Risk-Free Demo Trading
              </h3>
              <p className="text-muted-foreground">
                Trade with virtual money with no financial risk. Reset your balance anytime to keep practicing without
                consequences.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative p-8 border border-slate-800 rounded-xl bg-slate-900/50 backdrop-blur hover:border-slate-700 transition-colors">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp size={24} className="text-slate-950" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Professional Charts</h3>
              <p className="text-muted-foreground">
                Access advanced candlestick charts with multiple timeframes. Analyze trends and test strategies like a
                pro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-20 sm:py-32">
        <div className="relative bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-slate-700 rounded-2xl p-12 sm:p-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -z-10" />

          <div className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">
              Ready to Start Trading?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of traders learning and perfecting their strategies with real market conditions.
            </p>

            <button
              onClick={onSwitchToRegister}
              className="group inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-all font-medium text-lg"
            >
              Create Free Account
              <ArrowRight
                size={20}
                className="group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Guides
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Terms
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8">
            <p className="text-center text-sm text-muted-foreground">
              © 2025 TradeDemo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
