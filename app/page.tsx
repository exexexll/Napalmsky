import { Hero } from '@/components/Hero';
import { Container } from '@/components/Container';
import { Button } from '@/components/Button';
import Link from 'next/link';
import { PixelizedTeamPhoto } from '@/components/PixelizedTeamPhoto';

export default function HomePage() {
  return (
    <>
      <main id="main">
        <Hero />

        {/* More Section */}
        <section id="more" className="relative bg-[#0a0a0c] py-20 sm:py-24 lg:py-32 overflow-hidden">
          {/* Pixelized Team Photo Background */}
          <PixelizedTeamPhoto />
          
          <Container>
            <div className="relative z-10 mx-auto max-w-3xl">
              <h2 className="mb-6 font-playfair text-3xl font-bold tracking-tight sm:text-4xl">
                Meet people near you. Make friends IRL.
              </h2>
              <div className="space-y-6 text-base leading-relaxed text-[#e6e6e9]/90 sm:text-lg">
                <p>
                  <strong className="text-[#ffc46a]">BUMPIN</strong> is a networking platform designed to introduce relationships that last. We believe in the power of serendipity and the kind of authenticity few platforms still offer today. Our goal is to provide an algorithm-free, location-based matchmaking experience—like how you bump into people by accident, only now you can do it anywhere, anytime.
                </p>
                
                <div className="border-l-4 border-[#ffc46a] pl-6 my-6">
                  <h3 className="font-bold text-[#eaeaf0] mb-2">Up to 500 seconds.</h3>
                  <p className="text-[#e6e6e9]/80">
                    Most conversations should happen offline. Omegle made the mistake of allowing endless hours of chatting with strangers—that&apos;s time wasted. BUMPIN is strictly a meet-and-greet space, made for people looking to find friends nearby.
                  </p>
                </div>

                <div className="border-l-4 border-[#ffc46a] pl-6 my-6">
                  <h3 className="font-bold text-[#eaeaf0] mb-2">No AI.</h3>
                  <p className="text-[#e6e6e9]/80">
                    BUMPIN stands by the principle and movement of saying no to AI. Artificial intelligence shouldn&apos;t interfere in human connections—for both privacy and practical reasons.
                  </p>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button variant="primary" href="/check-access">
                  Get Started
                </Button>
                <div className="text-center">
                  <p className="text-sm text-[#eaeaf0]/60 mb-1">
                    USC Students / QR Invite Only
                  </p>
                  <Link 
                    href="/login"
                    className="text-sm font-medium text-[#eaeaf0]/70 hover:text-[#ffc46a] transition-colors"
                  >
                    Log in
                  </Link>
                </div>
              </div>
              
              {/* FAQ Link */}
              <div className="mt-8 text-center">
                <Link 
                  href="/faq"
                  className="inline-flex items-center gap-2 text-[#ffc46a] hover:underline transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Have questions? Check out our FAQ
                </Link>
              </div>
            </div>
          </Container>
        </section>

        {/* Mode Exhibit Section */}
        <section className="bg-[#0a0a0c] py-16 sm:py-20">
          <Container>
            <div className="flex flex-col md:flex-row gap-8 md:gap-12 justify-center items-center max-w-5xl mx-auto">
              
              {/* Text Mode Mock */}
              <div className="w-full md:w-1/2 max-w-sm">
                <div className="bg-[#111114] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffc46a] to-[#ff9f1a]" />
                    <div className="flex-1">
                      <div className="h-3 w-20 bg-white/20 rounded" />
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  
                  {/* Chat Area */}
                  <div className="p-4 space-y-3 min-h-[280px]">
                    {/* Received message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#ffc46a]/30 flex-shrink-0" />
                      <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]">
                        <div className="h-2 w-24 bg-white/30 rounded mb-1" />
                        <div className="h-2 w-16 bg-white/20 rounded" />
                      </div>
                    </div>
                    
                    {/* Sent message */}
                    <div className="flex justify-end">
                      <div className="bg-[#ffc46a] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
                        <div className="h-2 w-28 bg-black/20 rounded mb-1" />
                        <div className="h-2 w-20 bg-black/10 rounded" />
                      </div>
                    </div>
                    
                    {/* Received message */}
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#ffc46a]/30 flex-shrink-0" />
                      <div className="bg-white/10 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[75%]">
                        <div className="h-2 w-32 bg-white/30 rounded" />
                      </div>
                    </div>
                    
                    {/* Sent message */}
                    <div className="flex justify-end">
                      <div className="bg-[#ffc46a] rounded-2xl rounded-tr-sm px-3 py-2 max-w-[75%]">
                        <div className="h-2 w-20 bg-black/20 rounded" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Input Area */}
                  <div className="px-4 py-3 border-t border-white/10 flex items-center gap-2">
                    <div className="flex-1 h-10 bg-white/5 rounded-full border border-white/10" />
                    <div className="w-10 h-10 rounded-full bg-[#ffc46a] flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Mode Mock */}
              <div className="w-full md:w-1/2 max-w-sm">
                <div className="bg-[#111114] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  {/* Main Video Area */}
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-[#1a1a1f] to-[#0d0d10]">
                    {/* Remote video placeholder */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    
                    {/* Local video (picture-in-picture) */}
                    <div className="absolute bottom-4 right-4 w-24 h-32 rounded-xl bg-[#ffc46a]/20 border-2 border-[#ffc46a]/40 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#ffc46a]/30" />
                      </div>
                    </div>
                    
                    {/* Timer */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/50 backdrop-blur-sm rounded-full">
                      <div className="h-2 w-12 bg-white/40 rounded" />
                    </div>
                    
                    {/* Partner name */}
                    <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
                      <div className="h-2 w-16 bg-white/40 rounded" />
                    </div>
                  </div>
                  
                  {/* Controls */}
                  <div className="px-6 py-4 flex items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
                      </svg>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0a0a0c] py-8">
        <Container>
          <div className="text-center">
            <p className="text-sm text-[#e6e6e9]/70">
              Made with Passion
            </p>
            <div className="mt-4 flex items-center justify-center gap-6 text-sm">
              <Link 
                href="/blacklist"
                className="text-[#e6e6e9]/50 transition-colors hover:text-red-400"
              >
                Blacklist
              </Link>
              <span className="text-[#e6e6e9]/30">•</span>
              <Link 
                href="/manifesto"
                className="text-[#e6e6e9]/50 transition-colors hover:text-[#ffc46a]"
              >
                Meet Who and Do What?
              </Link>
            </div>
            <p className="mt-3 text-xs text-[#e6e6e9]/40">
              Community safety powered by transparency
            </p>
          </div>
        </Container>
      </footer>
    </>
  );
}

