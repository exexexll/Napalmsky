# LEGAL DOCUMENTS IMPLEMENTATION GUIDE

**Created: October 16, 2025**

---

## ⚠️ IMPORTANT DISCLAIMER

**THESE DOCUMENTS ARE TEMPLATES AND DO NOT CONSTITUTE LEGAL ADVICE.**

These legal documents were created based on common practices and general legal requirements for web applications in the United States. However:

- **You MUST have these documents reviewed by a licensed attorney** in your jurisdiction before publishing
- Laws vary significantly by state and country
- Your specific business model may require additional clauses
- An attorney can identify jurisdiction-specific requirements
- Legal requirements are constantly evolving

**Do not rely solely on these templates. Consult with a qualified attorney.**

---

## 📋 DOCUMENTS INCLUDED

This package includes six comprehensive legal documents:

### 1. **TERMS-OF-SERVICE.md**
The master agreement governing use of your platform. Covers:
- User eligibility and age requirements (18+)
- Account types and payment terms
- User conduct and prohibited activities
- Reporting and moderation system
- Public blacklist policy
- IP tracking and ban enforcement
- Liability disclaimers and limitations
- Dispute resolution and arbitration
- Termination rights

**Length:** ~15,000 words, 25 sections

### 2. **PRIVACY-POLICY.md**
Describes data collection, use, storage, and sharing. Covers:
- Information collected (account data, profile content, IP addresses)
- How information is used
- Third-party sharing (Stripe, Twilio, hosting providers)
- Data retention and deletion
- User rights (access, correction, deletion)
- Security measures
- GDPR compliance (for EU users)
- CCPA compliance (for California users)
- International data transfers

**Length:** ~8,000 words, 16 sections

### 3. **ACCEPTABLE-USE-POLICY.md**
Defines acceptable and prohibited behaviors. Covers:
- Harassment and abuse prohibition
- Illegal activity prohibition
- Inappropriate content standards
- Impersonation and fraud prevention
- Commercial activity restrictions
- Privacy violation prevention
- Technical abuse prevention
- Content standards
- Reporting system rules
- Enforcement consequences

**Length:** ~5,000 words, 15 sections

### 4. **COOKIE-POLICY.md**
Explains cookie usage and tracking. Covers:
- Types of cookies used (essential, functional, analytics)
- Why cookies are used
- Third-party cookies
- User control over cookies
- Cookie duration and management
- Privacy implications
- Legal basis for cookie use (GDPR)

**Length:** ~4,000 words, 14 sections

### 5. **COMMUNITY-GUIDELINES.md**
User-friendly behavioral guidelines. Covers:
- Platform values and mission
- Expected behavior ("Do's")
- Prohibited behavior ("Don'ts")
- Video chat etiquette
- Rejection handling
- Safety guidelines and red flags
- Diversity and inclusion
- Reporting process
- Public blacklist explanation

**Length:** ~6,000 words, comprehensive sections

### 6. **CONTENT-POLICY-AND-CONSENT.md**
Governs uploaded content and video usage. Covers:
- Webcam and camera access consent
- Content ownership and licensing
- Prohibited content (explicit, violent, illegal, deceptive)
- Video chat consent and conduct
- Recording prohibition
- Content moderation process
- IP and copyright compliance
- Blacklist disclosure consent
- Specific consent acknowledgments

**Length:** ~8,000 words, 15 sections

---

## 🔧 CUSTOMIZATION REQUIRED

Before using these documents, you MUST customize the following:

### Replace Placeholders

Search for and replace these placeholders throughout all documents:

| Placeholder | Replace With | Where It Appears |
|-------------|--------------|------------------|
| `[your-email@napalmsky.com]` | Your actual contact email | All documents |
| `[contact email]` | Your actual contact email | All documents |
| `[Your Physical Address]` | Your business address | Terms, Privacy Policy |
| `[Your State/Country]` | Your jurisdiction | Terms of Service (Section 20) |
| `[Your County/State]` | Your legal venue | Terms of Service (Section 20) |
| `[Your Company Name]` | Your legal entity name | Various documents |
| `[dpo@napalmsky.com]` | Data Protection Officer email | Privacy Policy (if in EU) |
| `[privacy@napalmsky.com]` | Privacy inquiry email | Privacy Policy |
| `[dmca@napalmsky.com]` | DMCA notice email | Content Policy |
| `[community@napalmsky.com]` | Community support email | Community Guidelines |
| `[report@napalmsky.com]` | Content report email | Content Policy |
| `[appeals@napalmsky.com]` | Appeals email | Content Policy |
| `[content@napalmsky.com]` | Content policy questions email | Content Policy |

**Tip:** Use find-and-replace in your text editor to update all instances at once.

### Update Specific Sections

**1. Terms of Service - Section 20: Dispute Resolution**
- **Line:** "These Terms shall be governed by the laws of [Your State/Country]"
- **Action:** Specify your state (e.g., "California" or "Delaware") or country
- **Consult attorney:** About arbitration clauses - some states have specific requirements

**2. Terms of Service - Section 20.5: Venue**
- **Line:** "any legal action must be filed in courts located in [Your County/State]"
- **Action:** Specify your preferred legal venue (e.g., "San Francisco County, California")

**3. Privacy Policy - Section 12.2: Data Controller**
- **Action:** Add your business entity legal name and registered address

**4. Privacy Policy - Section 12.3: Data Protection Officer**
- **Action:** If you operate in the EU and meet GDPR thresholds, you may need a DPO
- **Consult attorney:** About GDPR DPO requirements

### Verify Applicability

**If you process EU residents' data:**
- ✅ GDPR sections are included
- ✅ Legal bases for processing are defined
- ⚠️ Verify with EU privacy attorney
- ⚠️ Implement cookie consent banners
- ⚠️ Set up data portability mechanisms

**If you have California users:**
- ✅ CCPA sections are included
- ✅ "Do Not Sell" statement included (we don't sell data)
- ⚠️ Verify with California privacy attorney
- ⚠️ Implement "Request My Data" mechanism

**If you're outside the US:**
- ⚠️ You MUST have local attorney review
- ⚠️ Your country may have different requirements (PIPEDA in Canada, LGPD in Brazil, etc.)
- ⚠️ Age requirements may differ (16+ in some EU countries)

---

## 📱 WHERE TO DISPLAY THESE DOCUMENTS

### 1. Website Footer (All Pages)

Add links in the footer of every page:
```
Privacy Policy | Terms of Service | Cookie Policy | Community Guidelines
```

Recommended footer structure:
```html
<footer>
  <div class="legal-links">
    <a href="/terms-of-service">Terms of Service</a>
    <a href="/privacy-policy">Privacy Policy</a>
    <a href="/acceptable-use">Acceptable Use Policy</a>
    <a href="/cookie-policy">Cookie Policy</a>
    <a href="/community-guidelines">Community Guidelines</a>
    <a href="/content-policy">Content Policy</a>
  </div>
  <div class="copyright">
    © 2025 Napalm Sky. All rights reserved.
  </div>
</footer>
```

### 2. Signup/Onboarding Flow

**During account creation, users MUST explicitly agree to:**
- Terms of Service
- Privacy Policy
- Content Policy and Consent

**Implementation:**

```tsx
// Example: Add checkbox to onboarding
<div className="legal-consent">
  <input type="checkbox" id="agree-terms" required />
  <label htmlFor="agree-terms">
    I have read and agree to the{' '}
    <a href="/terms-of-service" target="_blank">Terms of Service</a>,{' '}
    <a href="/privacy-policy" target="_blank">Privacy Policy</a>, and{' '}
    <a href="/content-policy" target="_blank">Content Policy</a>
  </label>
</div>
```

**Critical:** Users cannot proceed without checking this box.

### 3. Before First Video Upload

**Before allowing camera access for selfie/video, show:**
- Content Policy and Consent Agreement
- Specific consent acknowledgments from Section 10

**Implementation:**
```tsx
// Show consent modal before camera access
const [hasConsentedToCamera, setHasConsentedToCamera] = useState(false);

if (!hasConsentedToCamera) {
  return (
    <ConsentModal>
      <h2>Camera and Content Consent</h2>
      <p>Before proceeding, please review our Content Policy...</p>
      <ul>
        <li>✓ I consent to my selfie and video being shown to other users</li>
        <li>✓ I understand my content may be publicly displayed if I'm banned</li>
        <li>✓ I certify I am at least 18 years old</li>
        <li>✓ I grant Napalm Sky the license described in the Content Policy</li>
      </ul>
      <button onClick={() => setHasConsentedToCamera(true)}>
        I Agree
      </button>
    </ConsentModal>
  );
}
```

### 4. Before First Video Chat

**Before joining first video call, show:**
- Video Chat Consent (from Content Policy Section 5)
- Reminder about recording prohibition

### 5. Settings Page

Create a "Legal & Privacy" section:
- Link to all legal documents
- "Download My Data" button (GDPR/CCPA)
- "Delete My Account" option
- Consent history/management

---

## 🍪 COOKIE CONSENT IMPLEMENTATION

### For EU Users (GDPR Requirement)

You MUST show a cookie consent banner for EU users before setting non-essential cookies.

**Implementation:**

```tsx
// components/CookieConsent.tsx
'use client';

import { useState, useEffect } from 'react';

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', 'all');
    setShowBanner(false);
    // Enable analytics cookies here
  };

  const acceptEssential = () => {
    localStorage.setItem('cookie_consent', 'essential');
    setShowBanner(false);
    // Only essential cookies (no analytics)
  };

  if (!showBanner) return null;

  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <h3>Cookie Consent</h3>
        <p>
          We use cookies to provide essential functionality and analyze usage.
          See our <a href="/cookie-policy">Cookie Policy</a> for details.
        </p>
        <div className="cookie-buttons">
          <button onClick={acceptEssential}>Essential Only</button>
          <button onClick={acceptAll}>Accept All</button>
        </div>
      </div>
    </div>
  );
}
```

**Add to your root layout:**
```tsx
// app/layout.tsx
import { CookieConsent } from '@/components/CookieConsent';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
```

---

## 📧 EMAIL TEMPLATES FOR LEGAL COMPLIANCE

### 1. Welcome Email (Include Legal Links)

```
Subject: Welcome to Napalm Sky!

Hi [Name],

Welcome to Napalm Sky! Your account is ready.

Before you start, please review our policies:
• Terms of Service: [link]
• Privacy Policy: [link]
• Community Guidelines: [link]

Questions? Reply to this email.

Best,
The Napalm Sky Team
```

### 2. Policy Update Notification

```
Subject: Updated Privacy Policy - Napalm Sky

Hi [Name],

We've updated our Privacy Policy, effective [date].

What changed: [brief summary]

View the full policy: [link]

Your continued use of Napalm Sky constitutes acceptance of the updated policy.

Questions? Contact us at [email].

Best,
The Napalm Sky Team
```

### 3. Data Deletion Confirmation

```
Subject: Account Deletion Confirmation

Hi [Name],

Your account has been scheduled for deletion.

What happens next:
• Your profile is immediately hidden from matchmaking
• Your data will be deleted within 90 days
• Backups will be purged within 90 days

If you were banned, your blacklist entry will remain.

This action cannot be undone.

Best,
The Napalm Sky Team
```

---

## 🔐 REQUIRED TECHNICAL IMPLEMENTATIONS

### 1. Data Access Request (GDPR/CCPA)

Users must be able to request their data.

**Implementation:**
```typescript
// API endpoint: /api/user/data-request
// Triggered from Settings page

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const user = await store.getUser(session.userId);
  const callHistory = await store.getUserCallHistory(session.userId);
  
  const userData = {
    account: {
      userId: user.userId,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      // ... all user data
    },
    callHistory: callHistory,
    media: {
      selfieUrl: user.selfieUrl,
      videoUrl: user.videoUrl,
    },
  };

  // Send data as JSON download or email
  return Response.json(userData);
}
```

### 2. Account Deletion

Users must be able to delete their accounts.

**Implementation:**
```typescript
// API endpoint: /api/user/delete-account
// Triggered from Settings page with confirmation

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return new Response('Unauthorized', { status: 401 });

  // Mark for deletion
  await store.markUserForDeletion(session.userId);
  
  // Schedule background job to delete after 90 days
  await scheduleAccountDeletion(session.userId, 90);
  
  // Immediately hide from platform
  await store.updateUser(session.userId, {
    accountStatus: 'deleted',
  });

  // Delete session
  await store.deleteSession(session.sessionToken);

  return Response.json({ success: true });
}
```

### 3. Consent Logging

Log when users consent to policies.

**Implementation:**
```typescript
// API endpoint: /api/user/log-consent
// Called during onboarding

export async function POST(req: Request) {
  const { userId, consentType, version } = await req.json();
  
  await store.logConsent({
    userId,
    consentType, // 'terms', 'privacy', 'content', 'camera'
    version, // e.g., '2025-10-16'
    timestamp: Date.now(),
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  return Response.json({ success: true });
}
```

---

## 📊 COMPLIANCE CHECKLIST

Before launching with these documents:

### Legal Review
- [ ] Attorney has reviewed all documents
- [ ] Jurisdiction-specific requirements identified
- [ ] Age requirements comply with local law
- [ ] Arbitration clause is enforceable in your jurisdiction
- [ ] Data protection requirements are met

### Technical Implementation
- [ ] All legal documents are published on website
- [ ] Footer links to all documents on every page
- [ ] Signup flow requires explicit consent checkbox
- [ ] Camera consent shown before first camera access
- [ ] Video chat consent shown before first call
- [ ] Cookie consent banner implemented (if EU users)
- [ ] Data access request endpoint implemented
- [ ] Account deletion functionality implemented
- [ ] Consent logging system implemented

### Content Updates
- [ ] All placeholder text replaced with actual info
- [ ] Contact emails are functional
- [ ] Physical address is accurate
- [ ] Entity name is correct
- [ ] Jurisdiction is specified
- [ ] Effective dates are set

### User Experience
- [ ] Legal documents are easily accessible
- [ ] Consent flows don't obstruct UX excessively
- [ ] Users can review policies before agreeing
- [ ] Policies are written in reasonably understandable language
- [ ] Mobile users can access and read policies

### Ongoing Compliance
- [ ] Process for updating policies when needed
- [ ] Notification system for policy changes
- [ ] System for tracking user consent versions
- [ ] Regular review schedule (annually)
- [ ] Incident response plan for data breaches

---

## 🌍 INTERNATIONAL CONSIDERATIONS

### European Union (GDPR)

**Additional Requirements:**
- Data Protection Officer (if over 250 employees or high-risk processing)
- Data Processing Agreements with all vendors
- Cookie consent with granular controls
- Right to be forgotten (account deletion)
- Data portability (export user data)
- Breach notification within 72 hours

**Consult:** EU privacy attorney

### California (CCPA/CPRA)

**Additional Requirements:**
- "Do Not Sell My Personal Information" link (we don't sell, so simple disclosure)
- Right to know what data is collected
- Right to delete data
- Right to opt-out of sale (N/A for us)
- Privacy policy must be accessible and up-to-date

**Consult:** California privacy attorney

### Canada (PIPEDA)

**Key Differences:**
- Meaningful consent required (can't be buried in ToS)
- Right to withdraw consent
- Privacy Commissioner oversight

**Consult:** Canadian privacy attorney

### Other Jurisdictions

**If you operate in:**
- **Brazil:** Comply with LGPD (similar to GDPR)
- **China:** Comply with PIPL (strict data localization)
- **Australia:** Comply with Privacy Act
- **UK:** Comply with UK GDPR (post-Brexit)

**Always consult local counsel.**

---

## 🚨 SPECIAL SITUATIONS

### If You Add Features

**New features may require policy updates:**
- Payment changes → Update Terms of Service
- New data collection → Update Privacy Policy
- New content types → Update Content Policy
- New third-party services → Update Privacy Policy

**Process:**
1. Update relevant policy documents
2. Increment version/effective date
3. Notify users via email
4. Show in-app notification
5. Log user continued use as acceptance

### If You Receive Legal Requests

**DMCA Takedown Notice:**
- Respond within timeframes
- Follow DMCA procedures
- Log all notices

**Law Enforcement Requests:**
- Verify legitimacy (valid subpoena/warrant)
- Consult attorney before responding
- Provide minimum necessary data
- Log all disclosures

**User Data Requests (GDPR/CCPA):**
- Respond within 30 days (GDPR) or 45 days (CCPA)
- Verify user identity
- Provide data in portable format
- Log all requests

### If You Have a Data Breach

**Immediate Actions:**
1. Contain the breach
2. Assess what data was exposed
3. Notify affected users within 72 hours (GDPR) or as required by state law
4. Report to authorities if required
5. Offer remediation (credit monitoring, etc.)
6. Document everything
7. Consult attorney immediately

**Breach Notification Template:**
```
Subject: Important Security Notice - Napalm Sky

Dear [Name],

We are writing to inform you of a security incident that may have affected your account.

What happened: [Brief description]
What data was involved: [Specific data types]
What we're doing: [Response actions]
What you should do: [User actions]

We take your privacy seriously and deeply regret this incident.

For questions, contact: [email]

Sincerely,
[Your Name]
[Your Title]
Napalm Sky
```

---

## 📞 SUPPORT CONTACTS

Set up these email addresses (or route to your main email):

| Email | Purpose |
|-------|---------|
| legal@napalmsky.com | General legal inquiries |
| privacy@napalmsky.com | Privacy questions, GDPR/CCPA requests |
| dmca@napalmsky.com | Copyright infringement notices |
| support@napalmsky.com | General user support |
| report@napalmsky.com | Content violation reports |
| appeals@napalmsky.com | Ban appeals |
| community@napalmsky.com | Community guidelines questions |
| dpo@napalmsky.com | Data Protection Officer (if required) |

**Minimum Required:** One functional contact email that you check regularly.

---

## 📅 MAINTENANCE SCHEDULE

### Quarterly
- [ ] Review user reports and adjust content policy if needed
- [ ] Check for new legal requirements in your jurisdiction
- [ ] Review third-party service terms (Stripe, Twilio, etc.)

### Annually
- [ ] Full legal document review with attorney
- [ ] Update effective dates if policies change
- [ ] Review incident logs and adjust policies based on issues
- [ ] Audit data retention practices
- [ ] Review security measures

### As Needed
- [ ] When adding new features
- [ ] When laws change
- [ ] After security incidents
- [ ] When expanding to new jurisdictions

---

## 🎯 NEXT STEPS

### Immediate (Before Launch)

1. **Hire an attorney** to review these documents
2. **Customize all placeholders** with your actual information
3. **Create pages** on your website for each document
4. **Implement consent flows** in onboarding
5. **Set up email addresses** for legal contacts
6. **Test the full user flow** including consent checkboxes

### Short-term (Within 30 Days)

1. **Implement cookie consent** banner (if EU users)
2. **Set up data request** endpoint
3. **Implement account deletion** functionality
4. **Create email templates** for legal notifications
5. **Document consent logging** system

### Ongoing

1. **Monitor for legal changes** in your jurisdiction
2. **Review policies quarterly**
3. **Update as needed** and notify users
4. **Keep attorney relationship** for ongoing questions
5. **Log all legal requests** and responses

---

## ⚖️ FINAL REMINDERS

### DO:
✅ Have an attorney review these documents  
✅ Customize all placeholders  
✅ Implement technical requirements for GDPR/CCPA  
✅ Make policies easily accessible  
✅ Get explicit user consent  
✅ Keep policies up to date  
✅ Respond to legal requests promptly  

### DON'T:
❌ Launch without attorney review  
❌ Copy these documents without customization  
❌ Ignore GDPR/CCPA requirements  
❌ Hide legal documents in obscure locations  
❌ Assume implied consent is enough  
❌ Set and forget - policies need maintenance  
❌ Ignore data requests or legal notices  

---

## 📚 ADDITIONAL RESOURCES

### Legal Research

- **GDPR Full Text:** https://gdpr-info.eu/
- **CCPA Full Text:** https://oag.ca.gov/privacy/ccpa
- **COPPA Information:** https://www.ftc.gov/enforcement/rules/rulemaking-regulatory-reform-proceedings/childrens-online-privacy-protection-rule
- **Section 230:** https://www.eff.org/issues/cda230

### Tools

- **Privacy Policy Generators** (starting point only):
  - TermsFeed: https://www.termsfeed.com/
  - Termly: https://termly.io/
  - PrivacyPolicies.com: https://www.privacypolicies.com/

- **Cookie Consent Solutions:**
  - Cookiebot: https://www.cookiebot.com/
  - OneTrust: https://www.onetrust.com/

- **Attorney Directories:**
  - Avvo: https://www.avvo.com/
  - Martindale: https://www.martindale.com/
  - Your State Bar Association

### Compliance Services

Consider hiring specialized services for:
- Data Protection Officer (DPO) services
- Privacy compliance audits
- GDPR/CCPA compliance software
- Legal document management

---

## 📧 QUESTIONS?

If you have questions about implementing these documents, you should consult with:

1. **Licensed Attorney:** For legal interpretation and customization
2. **Privacy Consultant:** For GDPR/CCPA technical requirements
3. **Developer:** For technical implementation of consent and data access features

**Do not rely on these templates alone. Professional legal review is essential.**

---

**Good luck with your platform, and thank you for taking legal compliance seriously!**

---

© 2025 Guide prepared for Napalm Sky implementation. This guide itself does not constitute legal advice.

