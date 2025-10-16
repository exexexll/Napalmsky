# LEGAL DOCUMENTS LAUNCH CHECKLIST

**Print this and check off as you complete each item**

---

## 📋 PHASE 1: REVIEW & CUSTOMIZE (Week 1-2)

### Attorney Review
- [ ] Contact 2-3 attorneys for quotes
- [ ] Select attorney and send documents
- [ ] Schedule review meeting
- [ ] Attorney has reviewed all 6 documents
- [ ] Receive attorney feedback and required changes
- [ ] Make all attorney-required modifications
- [ ] Get attorney's final approval

### Customize Placeholders
- [ ] Replace `[your-email@napalmsky.com]` with actual email
- [ ] Replace `[Your Physical Address]` with business address
- [ ] Replace `[Your State/Country]` with jurisdiction
- [ ] Replace `[Your County/State]` with legal venue
- [ ] Replace `[Your Company Name]` with legal entity name
- [ ] Replace all `[contact email]` instances
- [ ] Add specific contact emails (privacy@, dmca@, etc.)
- [ ] Update effective dates to launch date
- [ ] Verify all company information is correct

### Set Up Infrastructure
- [ ] Register legal entity (if not done)
- [ ] Get business address (physical, not PO Box)
- [ ] Set up legal contact email(s)
- [ ] Set up privacy@ email (or forwarding)
- [ ] Set up support@ email (or forwarding)
- [ ] Optional: dmca@, appeals@, community@, report@

---

## 📋 PHASE 2: PUBLISH (Week 2-3)

### Create Website Pages
- [ ] Create `/terms-of-service` page
- [ ] Create `/privacy-policy` page
- [ ] Create `/acceptable-use` page
- [ ] Create `/cookie-policy` page
- [ ] Create `/community-guidelines` page
- [ ] Create `/content-policy` page

### Add Footer Links
- [ ] Add legal links to footer component
- [ ] Verify links appear on ALL pages
- [ ] Test all links work correctly
- [ ] Make links easily readable (not tiny text)
- [ ] Mobile-responsive footer

### Test Accessibility
- [ ] Documents are readable on mobile
- [ ] Documents are readable on desktop
- [ ] Links work from all pages
- [ ] No broken links
- [ ] Pages load quickly

---

## 📋 PHASE 3: IMPLEMENT CONSENT (Week 3-4)

### Signup Consent
- [ ] Add consent checkbox to signup form
- [ ] Checkbox text: "I agree to Terms, Privacy Policy, Content Policy"
- [ ] Links in checkbox text work
- [ ] Cannot proceed without checking box
- [ ] Consent is logged to database
- [ ] Test: Try to sign up without checking (should fail)

### Camera Consent
- [ ] Show consent modal before camera access
- [ ] List specific consent items (see Content Policy Section 10)
- [ ] Require explicit "I Agree" button
- [ ] Cannot access camera without agreeing
- [ ] Consent is logged to database
- [ ] Test: Try to skip consent (should block)

### Video Chat Consent
- [ ] Show reminder before first video chat
- [ ] Include recording prohibition notice
- [ ] Allow user to proceed after acknowledgment
- [ ] Test: First call shows reminder
- [ ] Test: Subsequent calls don't re-show (or do, your choice)

### Cookie Consent (If EU Users)
- [ ] Implement cookie consent banner
- [ ] Show before setting non-essential cookies
- [ ] "Accept All" button
- [ ] "Essential Only" button
- [ ] Store user preference
- [ ] Respect user choice (don't load analytics if declined)
- [ ] Test: Both accept and decline paths

---

## 📋 PHASE 4: BUILD FEATURES (Week 3-4)

### Data Access Request (GDPR/CCPA)
- [ ] Build `/api/user/data-request` endpoint
- [ ] Verify user identity
- [ ] Collect all user data (profile, history, etc.)
- [ ] Return as JSON download or email
- [ ] Log all data requests
- [ ] Test: Request data as a user

### Account Deletion
- [ ] Build account deletion feature in Settings
- [ ] Show confirmation dialog
- [ ] Mark account for deletion
- [ ] Schedule permanent deletion after 90 days
- [ ] Immediately hide from matchmaking
- [ ] Delete session/logout user
- [ ] Test: Delete account, verify cannot login

### Consent Logging
- [ ] Create consent log table/collection
- [ ] Log signup consent (terms, privacy, content)
- [ ] Log camera consent
- [ ] Log video chat consent
- [ ] Log cookie consent
- [ ] Store: userId, type, version, timestamp, IP
- [ ] Test: Verify consents are logged

### Email System
- [ ] Set up email sending service (SendGrid, etc.)
- [ ] Create welcome email template
- [ ] Create policy update notification template
- [ ] Create account deletion confirmation template
- [ ] Test: Send test emails

---

## 📋 PHASE 5: TEST EVERYTHING (Week 4)

### Full User Flow
- [ ] Visit site for first time
- [ ] See cookie consent banner (if EU)
- [ ] Accept or decline cookies
- [ ] Click "Sign Up"
- [ ] See and read legal links from signup page
- [ ] Check consent checkbox
- [ ] Verify cannot proceed without checkbox
- [ ] Complete signup
- [ ] See camera consent before profile creation
- [ ] Read and agree to camera consent
- [ ] Upload selfie and video
- [ ] See video chat consent before first call
- [ ] Complete first video chat
- [ ] Request data download from Settings
- [ ] Receive data download
- [ ] Delete account from Settings
- [ ] Verify account is deleted
- [ ] Cannot login after deletion

### Edge Cases
- [ ] Try signup without consent checkbox
- [ ] Try camera access without consent
- [ ] Try to access after account deletion
- [ ] Test data request with no data
- [ ] Test cookie decline + site functionality

### Mobile Testing
- [ ] All legal pages readable on mobile
- [ ] Consent checkboxes work on mobile
- [ ] Cookie banner works on mobile
- [ ] Camera consent modal works on mobile

---

## 📋 PHASE 6: FINAL CHECKS (Before Launch)

### Documentation
- [ ] All placeholder text replaced
- [ ] All contact emails are functional
- [ ] Test: Send email to each legal contact address
- [ ] Effective dates are correct
- [ ] Company information is accurate
- [ ] No [brackets] remain in documents

### Legal Pages
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Acceptable Use Policy published
- [ ] Cookie Policy published
- [ ] Community Guidelines published
- [ ] Content Policy published
- [ ] All pages are live and accessible

### Technical Features
- [ ] Data request works
- [ ] Account deletion works
- [ ] Consent logging works
- [ ] Email notifications work
- [ ] Cookie consent works (if applicable)

### Team Training
- [ ] Team knows where legal documents are
- [ ] Team knows how to handle data requests
- [ ] Team knows how to handle DMCA notices
- [ ] Team knows ban policy and blacklist rules
- [ ] Support team has legal Q&A guide

---

## 📋 POST-LAUNCH MAINTENANCE

### Week 1 After Launch
- [ ] Monitor for user questions about policies
- [ ] Check consent logging is working
- [ ] Verify no broken links
- [ ] Check email delivery

### Month 1-3
- [ ] Review any data requests received
- [ ] Document any legal questions
- [ ] Note any policy issues
- [ ] Schedule 90-day review

### Quarterly (Every 3 Months)
- [ ] Review policies for needed updates
- [ ] Check for new laws in your jurisdiction
- [ ] Review third-party service terms (Stripe, Twilio)
- [ ] Check consent rates and UX
- [ ] Update version dates if changes made

### Annually
- [ ] Full legal review with attorney
- [ ] Update effective dates
- [ ] Review incident logs
- [ ] Audit data retention practices
- [ ] Review security measures
- [ ] Plan any needed policy updates

---

## 🚨 EMERGENCY PROCEDURES

### If You Receive a Data Breach
- [ ] Contain the breach immediately
- [ ] Assess what data was exposed
- [ ] Contact attorney within 24 hours
- [ ] Notify affected users within 72 hours (GDPR)
- [ ] Report to authorities if required
- [ ] Document everything
- [ ] Offer remediation to users

### If You Receive a Legal Request
- [ ] Verify legitimacy (valid subpoena/warrant)
- [ ] Contact attorney before responding
- [ ] Provide minimum necessary data
- [ ] Log the disclosure
- [ ] Follow timeline requirements

### If You Receive DMCA Notice
- [ ] Remove content within 24-48 hours
- [ ] Notify user of removal
- [ ] Allow counter-notification
- [ ] Document everything
- [ ] Consult attorney if complex

---

## ✅ LAUNCH READY CHECKLIST

**You are ready to launch when:**

- [✓] Attorney has approved all documents
- [✓] All placeholders customized
- [✓] All 6 documents published on website
- [✓] Footer links on every page
- [✓] Signup consent implemented
- [✓] Camera consent implemented
- [✓] Video chat consent implemented
- [✓] Cookie consent implemented (if EU)
- [✓] Data request feature built
- [✓] Account deletion feature built
- [✓] Consent logging works
- [✓] Email system works
- [✓] Full user flow tested
- [✓] Mobile tested
- [✓] Legal contact emails functional
- [✓] Team trained on policies

---

## 📊 PROGRESS TRACKER

**Start Date:** _______________

**Attorney Review:** _______________  
**Customization Complete:** _______________  
**Documents Published:** _______________  
**Consent Flows Complete:** _______________  
**Features Built:** _______________  
**Testing Complete:** _______________  
**Launch Date:** _______________

---

## 📞 CONTACTS

**Attorney:**  
Name: _______________  
Phone: _______________  
Email: _______________

**Legal Contact Emails:**  
legal@napalmsky.com: _______________  
privacy@napalmsky.com: _______________  
support@napalmsky.com: _______________

---

## ⚠️ BEFORE YOU CHECK "DONE"

Remember:
- [ ] Attorney review is MANDATORY
- [ ] All placeholders must be replaced
- [ ] Consent cannot be implied (must be explicit)
- [ ] Data request/deletion are legal requirements
- [ ] Cookie consent required for EU users
- [ ] Policies need ongoing maintenance

---

**Print this checklist and keep it handy throughout implementation!**

**Good luck with your launch!** 🚀

---

© 2025 Napalm Sky Legal Launch Checklist

