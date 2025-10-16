# LEGAL DOCUMENTS FOR NAPALM SKY

**Created:** October 16, 2025  
**Status:** Templates requiring attorney review and customization

---

## ⚠️ CRITICAL DISCLAIMER

**THESE DOCUMENTS ARE TEMPLATES ONLY AND DO NOT CONSTITUTE LEGAL ADVICE.**

You **MUST** have these documents reviewed and customized by a licensed attorney in your jurisdiction before using them on your website. Using legal documents without professional legal review exposes you to significant legal risk.

**DO NOT PUBLISH THESE DOCUMENTS WITHOUT ATTORNEY REVIEW.**

---

## 📦 WHAT'S INCLUDED

This package contains **six (6) comprehensive legal documents** for operating Napalm Sky:

| Document | Purpose | Length | Priority |
|----------|---------|--------|----------|
| **TERMS-OF-SERVICE.md** | Master user agreement | ~15,000 words | ⭐⭐⭐ CRITICAL |
| **PRIVACY-POLICY.md** | Data collection & usage | ~8,000 words | ⭐⭐⭐ CRITICAL |
| **ACCEPTABLE-USE-POLICY.md** | Behavior rules | ~5,000 words | ⭐⭐⭐ CRITICAL |
| **COOKIE-POLICY.md** | Cookie usage | ~4,000 words | ⭐⭐ REQUIRED |
| **COMMUNITY-GUIDELINES.md** | User-friendly rules | ~6,000 words | ⭐⭐ REQUIRED |
| **CONTENT-POLICY-AND-CONSENT.md** | Content & webcam consent | ~8,000 words | ⭐⭐⭐ CRITICAL |

**Plus:**
- **LEGAL-DOCUMENTS-IMPLEMENTATION-GUIDE.md** - Comprehensive implementation instructions

**Total:** ~46,000 words of legal documentation

---

## 🎯 WHAT THESE DOCUMENTS COVER

### Specific to Your Platform

✅ **Video Chat & Webcam:**
- Camera and microphone consent
- Video chat conduct rules
- Recording prohibition
- WebRTC peer-to-peer disclosure

✅ **Payment ($0.50 One-Time):**
- Payment terms and processing
- No refund policy
- Stripe integration disclosure
- Invite code system

✅ **Age Verification:**
- 18+ age requirement
- Age enforcement mechanisms
- COPPA compliance
- Minor prohibition

✅ **Public Blacklist System:**
- Ban process and triggers
- Public disclosure consent
- IP banning
- Permanent ban consequences
- User content display on blacklist

✅ **Reporting & Moderation:**
- User reporting system
- 4-report auto-ban trigger
- Admin review process
- Ban appeal (or lack thereof)

✅ **Cooldown System:**
- 24-hour cooldown explanation
- Purpose and enforcement

✅ **Referral System:**
- Wingperson/matchmaker feature
- Invite code distribution
- QR code access

✅ **Content Requirements:**
- Selfie and video specifications
- Content standards
- Prohibited content (explicit list)
- Profile authenticity requirements

### Standard Compliance

✅ **GDPR (EU Users):**
- Legal bases for processing
- User rights (access, deletion, portability)
- Data retention
- International transfers
- Cookie consent requirements

✅ **CCPA (California Users):**
- Data collection disclosure
- Right to know and delete
- "Do Not Sell" statement
- Verification process

✅ **General Web Law:**
- Intellectual property
- Liability limitations
- Dispute resolution
- Termination rights
- Third-party services

---

## 🚨 WHAT YOU MUST DO BEFORE LAUNCH

### 1. ⚖️ LEGAL REVIEW (MANDATORY)

**Hire a licensed attorney to:**
- Review all six documents
- Identify jurisdiction-specific requirements
- Customize for your specific situation
- Verify arbitration clause enforceability
- Ensure GDPR/CCPA compliance if applicable
- Approve final versions

**Cost Estimate:** $1,500 - $5,000 for attorney review (varies by jurisdiction and attorney)

**DO NOT SKIP THIS STEP.**

### 2. ✏️ CUSTOMIZE PLACEHOLDERS

Replace these throughout all documents:

- `[your-email@napalmsky.com]` → Your actual email
- `[Your Physical Address]` → Your business address
- `[Your State/Country]` → Your jurisdiction
- `[Your County/State]` → Your legal venue
- `[Your Company Name]` → Your legal entity name

**See LEGAL-DOCUMENTS-IMPLEMENTATION-GUIDE.md for complete list.**

### 3. 🌐 PUBLISH ON WEBSITE

Create pages for each document:
- `/terms-of-service`
- `/privacy-policy`
- `/acceptable-use`
- `/cookie-policy`
- `/community-guidelines`
- `/content-policy`

Link to all documents in footer of every page.

### 4. ✅ IMPLEMENT CONSENT FLOWS

**During Signup:**
```
☐ I have read and agree to the Terms of Service,
  Privacy Policy, and Content Policy
```
User CANNOT proceed without checking this.

**Before Camera Access:**
Show content/camera consent with specific acknowledgments.

**Before First Video Chat:**
Show video chat consent reminder.

### 5. 🍪 COOKIE CONSENT (If EU Users)

Implement cookie consent banner:
- Show before setting non-essential cookies
- Allow "Accept All" or "Essential Only"
- Store user preference
- Respect choice

### 6. 🔧 TECHNICAL FEATURES

Implement:
- Data access request endpoint (GDPR/CCPA)
- Account deletion functionality
- Consent logging system
- Email notification system for policy updates

---

## 📋 IMPLEMENTATION CHECKLIST

### Pre-Launch

- [ ] Attorney has reviewed all documents
- [ ] All placeholders replaced with actual info
- [ ] Effective dates set to launch date
- [ ] Contact emails are functional
- [ ] Physical address is correct
- [ ] Jurisdiction specified correctly
- [ ] Documents published on website
- [ ] Footer links added to all pages
- [ ] Consent checkboxes added to signup
- [ ] Camera consent flow implemented
- [ ] Cookie consent banner implemented (if EU users)
- [ ] Data request endpoint created
- [ ] Account deletion feature built
- [ ] Consent logging system working
- [ ] Email templates created
- [ ] Full user flow tested

### Post-Launch

- [ ] Monitor for legal requirement changes
- [ ] Review policies quarterly
- [ ] Log all user consents
- [ ] Respond to data requests within 30-45 days
- [ ] Notify users of policy updates
- [ ] Maintain attorney relationship
- [ ] Annual comprehensive review

---

## 📧 REQUIRED EMAIL ADDRESSES

Set up these email addresses (minimum one functional email):

**Critical:**
- `legal@napalmsky.com` - General legal inquiries
- `privacy@napalmsky.com` - GDPR/CCPA requests, privacy questions
- `support@napalmsky.com` - General support

**Recommended:**
- `dmca@napalmsky.com` - Copyright notices
- `report@napalmsky.com` - Content reports
- `appeals@napalmsky.com` - Ban appeals
- `community@napalmsky.com` - Community questions

**If Operating in EU:**
- `dpo@napalmsky.com` - Data Protection Officer (if required)

---

## 🌍 JURISDICTION-SPECIFIC REQUIREMENTS

### If You Have Users In:

**European Union:**
- ✅ GDPR sections included in Privacy Policy
- ⚠️ Must implement cookie consent banner
- ⚠️ Must have Data Processing Agreements with vendors
- ⚠️ May need Data Protection Officer (250+ employees)
- ⚠️ Breach notification within 72 hours

**California:**
- ✅ CCPA sections included in Privacy Policy
- ⚠️ Must respond to data requests within 45 days
- ⚠️ Must disclose data sales (we don't sell, so OK)

**Canada:**
- ⚠️ PIPEDA compliance (consult Canadian attorney)
- ⚠️ Meaningful consent required

**Other Countries:**
- ⚠️ Consult local attorney for specific requirements
- ⚠️ Laws vary significantly by jurisdiction

---

## 🎨 HOW THESE DOCUMENTS WORK TOGETHER

```
┌─────────────────────────────────────┐
│      TERMS OF SERVICE               │  ← Master agreement, legally binding
│  • References all other documents   │
│  • Defines user relationship        │
│  • Covers liability & disputes      │
└─────────────────────────────────────┘
              │
              │ Incorporates by reference:
              │
    ┌─────────┴─────────┬──────────────┬────────────────┐
    │                   │              │                │
    ▼                   ▼              ▼                ▼
┌────────┐    ┌──────────────┐  ┌──────────┐   ┌──────────────┐
│PRIVACY │    │ACCEPTABLE USE│  │  COOKIE  │   │   CONTENT    │
│POLICY  │    │   POLICY     │  │  POLICY  │   │POLICY/CONSENT│
└────────┘    └──────────────┘  └──────────┘   └──────────────┘
    │                │                │                 │
    └────────────────┴────────────────┴─────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │    COMMUNITY     │  ← User-friendly version
                  │   GUIDELINES     │     of rules (non-legal)
                  └──────────────────┘
```

**Users must agree to:** Terms of Service (which incorporates the others)

**Users should read:** Community Guidelines (easier to understand)

---

## 🔍 SPECIAL FEATURES OF THESE DOCUMENTS

### 1. Public Blacklist Consent

**Unique clause:** Users explicitly consent to potential public disclosure of their profile (name, photo, video) if permanently banned.

**Why included:** Your platform has a public blacklist feature for transparency.

**Legal basis:** 
- Contractual consent (users agree as condition of use)
- Legitimate interest (platform safety)
- Public disclosure for accountability

**Note:** This is somewhat unusual and your attorney may want to adjust language or approach.

### 2. IP Tracking and Banning

**Disclosure:** Privacy Policy clearly states IP addresses are collected and used for ban enforcement.

**Legal basis:**
- Legitimate interest (fraud prevention, security)
- Platform integrity

**GDPR-compliant:** IP addresses are personal data, but we have legitimate interest for security.

### 3. 18+ Age Gate

**Strict requirement:** Platform is 18+ only (stricter than 13+ COPPA minimum).

**Enforcement mechanisms:**
- Age attestation during signup
- Right to request proof
- Immediate termination if discovered under 18
- NCMEC reporting for underage users

**Why:** Video chat with strangers requires adult age restriction.

### 4. Video Chat Consent

**Multiple consent layers:**
1. General platform consent (signup)
2. Camera/microphone access (browser permission)
3. Content upload consent (before profile creation)
4. Video chat participation consent (before first call)

**Recording prohibition:**
- Explicitly prohibited without consent
- May be illegal in many jurisdictions
- Ground for permanent ban

### 5. No Refund Policy

**Clear statement:** $0.50 payment is non-refundable.

**Exceptions:** Billing errors or technical failures preventing access.

**Justification:** Low price point, one-time payment, verification purpose.

---

## ⚠️ POTENTIAL LEGAL RISKS

### Risks These Documents Address:

✅ User claims they didn't consent to terms  
✅ GDPR/CCPA non-compliance fines  
✅ Copyright infringement liability (DMCA safe harbor)  
✅ User injuries/damages from platform use  
✅ Liability for other users' conduct  
✅ Data breach notification requirements  
✅ Age verification failures  
✅ IP/ban evasion  

### Risks That Remain:

⚠️ **Attorney review still required** - templates can't account for everything  
⚠️ **Jurisdiction-specific laws** - may need additional clauses  
⚠️ **Future legal changes** - policies need ongoing maintenance  
⚠️ **User challenges** - even good policies can be challenged in court  
⚠️ **International operations** - different countries have different rules  

**Mitigation:** Work with qualified attorney and maintain legal compliance program.

---

## 💰 COST CONSIDERATIONS

### Attorney Review (One-Time)
- **Budget:** $1,500 - $5,000
- **Timeline:** 1-2 weeks
- **Worth it?** Absolutely yes. This is essential.

### Ongoing Legal Costs
- **Quarterly review:** $500 - $1,000/quarter (if significant changes)
- **Annual review:** $1,000 - $2,000/year
- **Policy updates:** $500 - $1,500 per update
- **Data breach response:** $5,000 - $50,000+ (if it happens)

### Alternative: Legal Services for Startups
- **Rocket Lawyer:** $40/month (basic)
- **LegalZoom:** $20-50/month (basic)
- **Startup accelerator:** Often includes legal review

### DIY Risks
- **GDPR fines:** Up to €20 million or 4% of global revenue
- **CCPA fines:** Up to $7,500 per violation
- **Lawsuit costs:** $10,000 - $100,000+ in legal fees
- **Settlement costs:** Variable, potentially significant

**Bottom line:** Attorney review is cheap insurance.

---

## 📚 ADDITIONAL RESOURCES

### Learn More About:

**GDPR:**
- Official text: https://gdpr-info.eu/
- Guide: https://gdpr.eu/

**CCPA:**
- Official text: https://oag.ca.gov/privacy/ccpa
- Guide: https://www.oag.ca.gov/privacy/ccpa

**COPPA:**
- FTC guide: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions

**Section 230:**
- EFF explanation: https://www.eff.org/issues/cda230

### Find an Attorney:

- **Avvo:** https://www.avvo.com/
- **State Bar Association:** Google "[Your State] Bar Association"
- **Tech law specialists:** Search "tech startup attorney [your city]"
- **Privacy specialists:** Search "GDPR attorney" or "privacy attorney"

### Tools:

- **Cookie consent:** Cookiebot, OneTrust
- **Privacy compliance:** TrustArc, OneTrust
- **GDPR tools:** Usercentrics, Complianz

---

## 🚀 QUICK START

**If you're in a hurry (but still need attorney review):**

### Week 1:
1. Read all documents
2. Understand what they cover
3. Make list of questions for attorney
4. Contact 2-3 attorneys for quotes

### Week 2:
1. Select attorney
2. Send documents for review
3. Customize placeholders
4. Start building consent flows

### Week 3:
1. Receive attorney feedback
2. Make required changes
3. Finalize all documents
4. Publish to website

### Week 4:
1. Implement technical features
2. Test full user flow
3. Train team on policies
4. Launch!

**Realistic timeline:** 4-6 weeks from attorney review to launch-ready.

---

## ❓ FREQUENTLY ASKED QUESTIONS

### Q: Can I use these documents without an attorney?

**A:** Legally, yes. Advisable? **Absolutely not.** You're exposing yourself to significant legal and financial risk. Attorney review costs $1,500-$5,000. GDPR fines alone can be €20 million. Do the math.

### Q: What if I'm just testing/MVP?

**A:** Even MVPs need legal protection. Users don't care if it's a test—if something goes wrong, you're liable. Start with basic attorney review now, expand later.

### Q: Do I really need all six documents?

**A:** Yes. Each serves a distinct legal purpose:
- Terms of Service (contract)
- Privacy Policy (data transparency - **legally required in many jurisdictions**)
- Acceptable Use (conduct rules)
- Cookie Policy (tracking transparency - **required in EU**)
- Community Guidelines (user education)
- Content Policy (webcam consent - **critical for your platform**)

### Q: Can I just copy another dating app's terms?

**A:** No. That's copyright infringement. Also, your platform has unique features (blacklist, $0.50 payment, video-first) that generic documents don't cover.

### Q: What happens if I don't have these documents?

**Potential consequences:**
- Lawsuits from users
- GDPR fines (if EU users)
- CCPA fines (if CA users)
- No legal protection from user claims
- Difficulty getting investors/funding
- Payment processor issues (Stripe requires ToS)
- Can't enforce bans or rules

### Q: How often do I update these?

**A:** 
- **Annually:** General review
- **Quarterly:** Check for new laws
- **As needed:** When adding features, after incidents, when laws change

### Q: What if a user violates policies?

**A:** With proper policies in place, you can:
- Terminate their account (justified by ToS)
- Ban their IP (disclosed in Privacy Policy)
- Add to blacklist (they consented in ToS)
- Defend against lawsuits (limited liability in ToS)

### Q: Are these enforceable internationally?

**A:** Terms typically include governing law (e.g., "California law applies"). However:
- EU users have GDPR rights regardless
- Some countries won't enforce US arbitration
- International lawsuits are complex and expensive
- **Consult attorney about international operations**

---

## 📞 NEED HELP?

### Implementation Questions
→ See **LEGAL-DOCUMENTS-IMPLEMENTATION-GUIDE.md**

### Technical Implementation
→ See **LEGAL-DOCUMENTS-IMPLEMENTATION-GUIDE.md** Section: "Required Technical Implementations"

### Legal Questions
→ **Hire an attorney.** This is not DIY-able.

### Finding an Attorney
→ Contact your state bar association or search "tech startup attorney [your location]"

---

## ✅ FINAL CHECKLIST BEFORE USING THESE DOCUMENTS

- [ ] I understand these are templates, not legal advice
- [ ] I will have an attorney review before publishing
- [ ] I will customize all placeholders
- [ ] I will implement required consent flows
- [ ] I will implement data access/deletion features
- [ ] I will set up legal contact emails
- [ ] I will maintain and update these documents
- [ ] I will not skip attorney review to save money
- [ ] I understand the legal risks of non-compliance
- [ ] I am committed to operating legally and ethically

---

## 🎯 SUMMARY

**What you have:**
- 6 comprehensive legal documents (~46,000 words)
- Tailored to Napalm Sky's specific features
- GDPR and CCPA compliant sections
- Implementation guide

**What you need to do:**
1. **Hire attorney for review** (MANDATORY)
2. Customize placeholders
3. Publish on website
4. Implement consent flows
5. Build technical features (data access, deletion)
6. Test everything
7. Maintain and update

**Investment required:**
- **Money:** $1,500-$5,000 for attorney + implementation time
- **Time:** 4-6 weeks from review to launch
- **Ongoing:** Quarterly reviews, annual updates

**Why it's worth it:**
- Legal protection against lawsuits
- GDPR/CCPA compliance (avoid fines)
- User trust and transparency
- Platform legitimacy
- Investor/funding readiness
- Peace of mind

---

**You have a solid foundation. Now get it reviewed and launch legally!**

---

**Created with care for Napalm Sky | October 16, 2025**

*Remember: This is not legal advice. Consult with a qualified attorney.*

