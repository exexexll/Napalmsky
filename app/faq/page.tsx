'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Container } from '@/components/Container';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'account' | 'features' | 'safety' | 'technical';
}

const faqs: FAQItem[] = [
  // GENERAL
  {
    category: 'general',
    question: 'What is BUMPIN?',
    answer: 'BUMPIN lets you video chat or text with people nearby. No profiles to curate, no swiping—just real conversations with real people.'
  },
  {
    category: 'general',
    question: 'How does matchmaking work?',
    answer: "Browse who's online, pick someone interesting, set your preferred call length, and send an invite. If they accept, you're connected instantly. The call duration is averaged between both preferences."
  },
  {
    category: 'general',
    question: 'What makes BUMPIN different from other apps?',
    answer: 'Live video and text only—no endless messaging before meeting. Timed conversations create natural endings. Location-based matching shows people nearby. 24-hour cooldown keeps things fresh.'
  },
  
  // ACCOUNT
  {
    category: 'account',
    question: 'What are Guest vs Permanent accounts?',
    answer: 'Guest accounts are free and last 7 days. No email needed. Permanent accounts require email/password and last forever. Both have full access. Upgrade anytime in Settings.'
  },
  {
    category: 'account',
    question: 'How do I verify my account?',
    answer: 'Why verify? To keep bots out and build a trusted community. Three ways: (1) $0.50 one-time payment, (2) Invite code from a friend, or (3) USC students: Scan admin QR + Campus Card. Verified users get their own invite codes to share.'
  },
  {
    category: 'account',
    question: 'How does USC Campus Card verification work?',
    answer: 'USC students verify for free: Scan an admin QR code at campus events, then scan your Campus Card barcode. You get a 7-day guest account. Add your @usc.edu email in Settings to make it permanent.'
  },
  {
    category: 'account',
    question: 'What are invite codes?',
    answer: 'After verification, you get your own invite code with 4 uses. Share it with friends to give them free access. Check Settings to see your code and QR.'
  },
  {
    category: 'account',
    question: 'How do I delete my account?',
    answer: 'Settings → Delete Account. All your data is removed. Guest accounts auto-delete after 7 days of inactivity.'
  },
  
  // FEATURES
  {
    category: 'features',
    question: 'What is Video Mode vs Text Mode?',
    answer: 'Video Mode: Face-to-face calls with camera and audio (timed). Text Mode: Chat with text, images, and GIFs (unlimited, stays active while you\'re messaging). You can upgrade from text to video anytime.'
  },
  {
    category: 'features',
    question: 'What is the Torch Rule?',
    answer: "Text mode is unlimited but requires activity. If no one messages for 2 minutes, you get a warning. Send any message to keep going. 3 minutes of silence = chat ends."
  },
  {
    category: 'features',
    question: 'What is the 24-hour cooldown?',
    answer: "After a call, you can't match with the same person for 24 hours. This encourages meeting new people."
  },
  {
    category: 'features',
    question: 'How does location matching work?',
    answer: 'Opt-in only. Enable location to see nearby people first. We only show approximate distance ("500 ft away"), never your exact location. Disable anytime.'
  },
  {
    category: 'features',
    question: 'What is the Wingperson feature?',
    answer: "See someone your friend would like? Click 'Introduce Friend' to generate a link. When your friend signs up through it, they get connected."
  },
  {
    category: 'features',
    question: 'Can I share my socials during a call?',
    answer: "Yes! Click 'Share Socials' to exchange Instagram, Snapchat, TikTok, Discord, or phone number. Take the conversation off-platform."
  },
  
  // SAFETY
  {
    category: 'safety',
    question: 'How do you keep BUMPIN safe?',
    answer: 'Verification keeps bots out. Report system with auto-ban at 4+ reports. Admins review all bans. Permanent bans go on public blacklist. 24-hour cooldown prevents harassment.'
  },
  {
    category: 'safety',
    question: 'How do I report someone?',
    answer: 'After any call, click "Report & Block User". Admins review reports. 4+ reports from different people = auto-ban pending review.'
  },
  {
    category: 'safety',
    question: 'What happens if I\'m reported?',
    answer: 'One report = logged. 4+ reports = temporary ban while admins investigate. They can permanently ban (public blacklist) or clear you. Decisions are final.'
  },
  {
    category: 'safety',
    question: 'Are calls recorded?',
    answer: 'No. We don\'t record calls. But anyone can screen record—if someone does without consent, report them immediately.'
  },
  {
    category: 'safety',
    question: 'Is my location private?',
    answer: 'Yes. We only show approximate distance, never exact coordinates. Location expires after 24 hours. Disable anytime in Settings.'
  },
  
  // TECHNICAL
  {
    category: 'technical',
    question: 'What do I need to use BUMPIN?',
    answer: 'Webcam and mic for video. Modern browser (Chrome, Safari, Firefox, Edge). Decent internet. Must be 18+. Works on mobile but desktop is best for video.'
  },
  {
    category: 'technical',
    question: 'Why can\'t I connect to some calls?',
    answer: 'Common fixes: Check your internet connection. Make sure you allowed camera/mic permission. Try refreshing. On mobile, keep the app in foreground.'
  },
  {
    category: 'technical',
    question: 'What if I lose internet during a call?',
    answer: 'You have 10 seconds to reconnect automatically. If you make it back, the call continues. Otherwise, it ends and saves to history.'
  },
  {
    category: 'technical',
    question: 'Why verify with $0.50?',
    answer: 'Keeps bots and spam out. One-time payment, never recurring. Verified users get invite codes to share with 4 friends for free.'
  },
  {
    category: 'technical',
    question: 'Does BUMPIN work on mobile?',
    answer: 'Yes! iOS and Android browsers both work. Text mode is great on mobile. For the best experience, add BUMPIN to your home screen.'
  },
  {
    category: 'technical',
    question: 'Where is my data stored?',
    answer: 'Secure cloud servers. Video calls are direct between users—not recorded or stored. Text messages save to history. All data encrypted.'
  },
];

const categories = [
  { id: 'all', label: 'All Questions' },
  { id: 'general', label: 'General' },
  { id: 'account', label: 'Account & Verification' },
  { id: 'features', label: 'Features' },
  { id: 'safety', label: 'Safety & Privacy' },
  { id: 'technical', label: 'Technical' },
];

export default function FAQPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0a0a0c] py-20">
      <Container>
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <Link 
              href="/"
              className="inline-block mb-6 text-sm text-[#ffc46a] hover:underline"
            >
              ← Back to Home
            </Link>
            <h1 className="font-playfair text-4xl sm:text-5xl font-bold text-[#eaeaf0] mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-[#eaeaf0]/70">
              Everything you need to know about BUMPIN
            </p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-xl bg-white/10 px-6 py-4 text-[#eaeaf0] placeholder-[#eaeaf0]/50 focus:outline-none focus:ring-2 focus:ring-[#ffc46a]"
            />
          </div>

          {/* Category Filters */}
          <div className="mb-8 flex flex-wrap gap-3">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#ffc46a] text-[#0a0a0c]'
                    : 'bg-white/10 text-[#eaeaf0] hover:bg-white/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="space-y-4">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#eaeaf0]/70">No questions found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              filteredFAQs.map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl bg-white/5 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/10 transition-colors"
                  >
                    <span className="font-medium text-[#eaeaf0] pr-4">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-[#ffc46a] flex-shrink-0 transition-transform ${
                        expandedIndex === index ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {expandedIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-4 pt-2">
                          <p className="text-[#eaeaf0]/80 leading-relaxed">{faq.answer}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>

          {/* Still Have Questions? */}
          <div className="mt-16 rounded-2xl bg-gradient-to-br from-[#ffc46a]/10 to-[#ff7b4b]/10 border border-[#ffc46a]/30 p-8 text-center">
            <h2 className="font-playfair text-2xl font-bold text-[#eaeaf0] mb-3">
              Still have questions?
            </h2>
            <p className="text-[#eaeaf0]/70 mb-6">
              Can&apos;t find what you&apos;re looking for? We&apos;re here to help.
            </p>
            <a
              href="mailto:everything@napalmsky.com"
              className="inline-block rounded-xl bg-[#ffc46a] px-8 py-3 font-medium text-[#0a0a0c] hover:opacity-90 transition-opacity"
            >
              Contact Support
            </a>
          </div>

          {/* Related Links */}
          <div className="mt-12 flex flex-wrap gap-4 justify-center text-sm">
            <Link href="/terms-of-service" className="text-[#eaeaf0]/50 hover:text-[#ffc46a] transition-colors">
              Terms of Service
            </Link>
            <span className="text-[#eaeaf0]/30">•</span>
            <Link href="/privacy-policy" className="text-[#eaeaf0]/50 hover:text-[#ffc46a] transition-colors">
              Privacy Policy
            </Link>
            <span className="text-[#eaeaf0]/30">•</span>
            <Link href="/community-guidelines" className="text-[#eaeaf0]/50 hover:text-[#ffc46a] transition-colors">
              Community Guidelines
            </Link>
            <span className="text-[#eaeaf0]/30">•</span>
            <Link href="/blacklist" className="text-[#eaeaf0]/50 hover:text-red-400 transition-colors">
              Blacklist
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}

