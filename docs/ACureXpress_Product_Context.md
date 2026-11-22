# A-CureXpress: Product Context for Claude Code

Version: 2026-11-22
Client: HCQ Care Private Limited (product name: A-CureXpress)
Built by: Flucks (development partner)
Existing site (medicine store only, for reference): https://a-curexpress.com/

This file is the working context for the whole build. It contains (1) the full client brief and addendum, extracted and organised, (2) the decisions and clarifications the dev team agreed, (3) the open points that still wait for the client, with the default we build meanwhile, (4) the technical stack and rules, and (5) the UI direction.

Brief references look like `(Brief §04, p.6)`. Addendum references look like `(Add. §B, p.3)`. Page numbers are the numbers printed in the brief's footer (page 1 is the cover).

---

## 0. Read this first

### What we are building
A connected healthcare platform for India (first focus: tier-2 and tier-3 cities). It is **not** only a medicine store and **not** only a doctor directory. Its defining feature is the chain: **clinic, doctors, appointment modes, booking, consultation, prescription, medicine fulfilment, and a verified local medical-shop network.** One website (responsive), a PWA/mobile experience, partner portals and an admin dashboard share one secure backend.

### Stack (decided)
Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) plus third-party services (payments, video, SMS/WhatsApp, maps). See section 24.

### Scale target
Design and build for **100,000 users** without any feature degrading. Working assumption: 100,000 monthly active users, roughly 2,000 to 5,000 concurrent at peak, 99.9% availability for booking and payments, data recovery point within 15 minutes, service restored within 4 hours.

### Hard rules (never break these)
1. A **clinic** and a **doctor** are separate entities. Never merge them into one record.
2. Online and offline availability are configured **explicitly**. Never infer one from the other.
3. An online-only doctor must **not** need a public physical address.
4. The booking engine must make double-booking **impossible at database level** (not only in the UI).
5. Doctor status rules (pending, rejected, suspended, expired) are enforced **on the server and in the database**. Hiding a button is never enough.
6. Registration never auto-publishes a doctor and never gives a Verified badge. "Registered Doctor" and "A-CureXpress Verified" look different and mean different things.
7. Shop pins use verified addresses or coordinates only. Never fabricate a location, a count, a review or a "doctor online now" claim. All numbers on screen come from real data.
8. The platform does not diagnose, prescribe or act as a clinician. The AI Health Consultant never issues or edits prescriptions.
9. Patient health data is private: row-level security on every table, private storage, audit logs, no health data in analytics or logs.
10. Payment confirmation is verified **server-side** (signed webhooks), is idempotent, and money records live in an append-only **ledger**.
11. Regulated services (medicine sale and dispensing, online prescribing) sit behind **feature flags** and are switched on only after HCQ Care confirms licences and approvals.
12. No secrets in the frontend. Environment-managed secrets only.

---

## 1. Precedence: which rule wins

1. Section 22 of this file (decisions agreed by the dev team).
2. The addendum rules (AI Health Consultant, doctor verification, admin approval). The addendum says its more specific rules govern those three modules if they conflict with the original brief (Add. p.1).
3. The original brief.
4. Working defaults in section 23 for points the client has not answered yet. Implement the default **as configuration**, never hard-coded, so it is cheap to change.

---

## 2. Company context, vision and objectives (Brief §01, p.3)

A-CureXpress is a digital healthcare access platform. It helps clinics keep relationships with their patients, helps independent doctors offer online consultations, and connects patients to local medical shop partners for assisted access and eligible medicine fulfilment.

Positioning: a digital partner of clinics and doctors, with an assisted local healthcare network. It helps patients discover, book and follow through on care. It does not replace clinical judgement or regulated pharmacy operations.

Business objectives:
- Every participating clinic gets a discoverable profile: address, map, services, hours, contact, booking options.
- Clinics can have one doctor or many. A clinic profile lists all approved doctors, each with their own speciality, schedule, fee and booking modes.
- Doctors who work independently online get their own profile and can accept online bookings without a clinic listing.
- Offline appointments and online consultations are shown clearly, based on what each clinic or doctor has actually enabled.
- Consultations and prescriptions connect to medicine ordering through a compliant fulfilment workflow.
- Patients can find verified partner medical shops by location and see useful details first.
- HCQ Care staff get operational visibility across profiles, bookings, medicine orders, partner applications, settlements and support.

Document control facts (Brief p.2): primary market is India with initial focus on tier-2 and tier-3 city access. Connected services: doctor booking, online consultation, prescription workflow, medicine ordering and delivery.

---

## 3. Business models and principles (Brief §02, p.4)

### Model A: digital partner of clinics and doctors

| Requirement | Expected behaviour |
|---|---|
| Clinic-first profile | A clinic has one main profile and may have multiple doctors linked to it. |
| Multiple doctors | The clinic page shows all linked doctors, their specialities, profile details and bookable services. |
| Booking mode | Each clinic or doctor can enable offline, online or both. The mode is shown before booking. |
| Independent online doctor | A doctor can create an independent online-only profile with no clinic address shown to patients. |
| Doctor schedule | Availability and slot capacity are managed at doctor level. Clinic hours are an optional constraint. |
| Booking ownership | Every booking stores the clinic, doctor, mode, slot, patient and status. |
| Changes and cancellations | Reschedule and cancel rules are visible before confirmation and enforced consistently. |

### Model B: medical shop partner network

| Requirement | Expected behaviour |
|---|---|
| Partner profile | Shop name, verified address, phone, hours, services, approval status. |
| Map and location | Map pin, address, directions link, distance when location permission exists. |
| Nearby search | Search by city or PIN code, or use current location with permission. |
| Shop assistance | Show what the shop can help with, such as booking help or eligible order coordination. |
| Medicine availability | Show real-time availability only if connected to reliable inventory data. Otherwise label it "requires confirmation". |
| Partner onboarding | Application, document review, approval, suspension and renewal workflow. |

### Non-negotiable principles
- A clinic is an entity; a doctor is a separate entity.
- Online and offline availability are configured explicitly.
- An online-only doctor is not forced to publish a physical location.
- Shop maps use verified addresses or geocoordinates.
- The booking engine prevents overlapping appointments for the same doctor and slot.
- Medicine sale and dispensing are enabled only for appropriately authorised operations.
- Patient health information is accessible only to authorised users for a legitimate purpose.

---

## 4. Roles and permissions (Brief §03, p.5)

| Role | Core permissions | Restrictions |
|---|---|---|
| Patient | Search clinics, doctors, shops; book; consult; upload prescriptions; order eligible medicines; view own records | Own account and records only, or those lawfully managed with authorisation |
| Clinic administrator | Manage clinic profile, hours, services, linked doctor roster; view clinic bookings as authorised | Cannot change doctor credentials or access unrelated patient records |
| Doctor | Manage professional profile, online/offline availability, bookings, consultations, notes, prescriptions | Credential verification; access only to relevant patients and clinical purposes |
| Independent online doctor | Doctor functions for online services without a public physical clinic listing | Online service eligibility and professional verification must be confirmed |
| Pharmacy / authorised dispensing staff | Review prescriptions where required, manage stock, batch, expiry, dispensing, fulfilment | Only licensed or authorised staff perform regulated dispensing actions |
| Medical shop partner | Maintain shop profile, address, hours, services, permitted customer-assistance workflow | No unrestricted access to medical records or prescriptions |
| Delivery partner | View assigned deliveries, limited recipient details, status updates, proof of delivery | No access to consultation records or prescription content unless required and authorised |
| Customer support | Handle booking and order issues and tickets with limited information | Sensitive health data masked unless necessary and authorised |
| Super admin | Approve users and partners, configure settings, manage operations, audit logs, reports | Privileged access logged; strong authentication; least privilege |

Permission model:
- Role-based access control with row-level data access policies.
- Log sensitive actions: profile verification, prescription access, booking edits, refunds, permission changes.
- Separate permissions for clinic staff, doctors, pharmacy staff, partners, support agents and administrators.
- Support account suspension, credential expiry, staff offboarding and access revocation.

---

## 5. Clinic and multi-doctor booking module (Brief §04, p.6)

This is the primary product module. The clinic profile is the entry point for a clinic with one or more doctors, while each doctor stays individually bookable.

### Clinic profile fields
- Name, logo/photo, description, address, map pin, phone, email, opening hours.
- Services, specialities, facilities, accessibility information, appointment instructions.
- Offline availability and online consultation availability, each explicitly configured.
- Linked doctor roster: photo, name, qualifications, verified registration details, speciality, languages, experience.
- Booking rules, cancellation policy, service area, status (draft, pending verification, active, paused).

### Doctor-to-clinic relationship
- A doctor may be linked to one or several clinics if the business rules permit.
- Each link defines the doctor's schedule and offline availability **at that clinic**.
- The doctor profile separately enables online consultation availability.
- Clinic admins can request to add or remove a doctor. Verification and approval rules must be defined (see decision D6).
- Removing a doctor from a clinic must **not** erase the doctor's profile, prior bookings or legally required records.

### Patient booking flow

| Step | Screen / action | System behaviour |
|---|---|---|
| 1 | Search or open clinic | Show clinic identity, address, map, services, available booking modes |
| 2 | Choose appointment mode | Patient picks Offline at Clinic or Online Consultation, where enabled |
| 3 | Choose doctor | Show all eligible linked doctors filtered by service, mode, availability |
| 4 | Choose date and slot | Show real-time availability in the correct time zone; prevent double booking |
| 5 | Enter patient details | Collect minimum required information and consent |
| 6 | Review and confirm | Show clinic, doctor, mode, date/time, fee, payment terms, cancellation policy |
| 7 | Confirmation | Create booking ID; notify patient, doctor and relevant clinic staff |
| 8 | Appointment outcome | Support checked-in, completed, cancelled, rescheduled, no-show states |

---

## 6. Independent online doctor module (Brief §05, p.7)

Doctors who only serve online need a first-class onboarding path. No clinic listing and no public physical address required.

### Doctor onboarding fields
- Name, photo, qualifications, speciality, languages, experience, biography.
- Medical registration number and verification status, with secure evidence upload for authorised reviewers.
- Consultation modes enabled: video, audio and/or secure messaging, subject to clinical suitability and applicable rules.
- Consultation fee by mode, duration, follow-up policy, weekly availability.
- Online-only status or clinic-linked status. If clinic-linked, list clinic locations and offline schedules separately.
- Secure payout and settlement information, agreement acceptance.

### Online consultation functions
- Book, reschedule, cancel and join from appointment details.
- Waiting room, join-time controls, network interruption handling, connection status.
- Patient-provided symptoms, history and uploaded documents, subject to consent.
- Doctor notes, follow-up instructions, prescription workflow where appropriate.
- Post-consultation summary, receipt, feedback, support request.
- Emergency messaging: clearly say the platform is not an emergency service and direct patients to local emergency care.

### Scheduling and conflict rules
- Recurring weekly availability plus one-off exceptions, holidays, leave.
- Reserve a slot during checkout for a configurable short period, then release it if confirmation fails.
- Block overlapping slots across the doctor's online schedule and any shared offline schedule where schedules conflict.
- Record all times consistently (UTC timestamps) and display them in the patient's local time zone (India is IST, UTC+05:30).
- Admin overrides only with permission and an audit trail.

Clinical safety: the platform supports access and workflow. It must not independently diagnose, choose treatment or issue prescriptions. Telemedicine eligibility, consent, record keeping and prescribing rules must be validated for the launch jurisdiction.

---

## 7. Patient journey, booking and consultation (Brief §06, p.8)

### Main patient navigation

| Area | Key requirements |
|---|---|
| Home | Search clinics, doctors, medical shops; prominent online/offline filters; medicine and prescription entry points |
| Search | By clinic, doctor, speciality, service, city/PIN code, availability |
| Clinic details | Map, directions, hours, services, doctor roster, mode-specific booking buttons |
| Doctor details | Credentials, speciality, supported modes, fee, schedule, clinic affiliation, booking CTA |
| Booking checkout | Selected provider, mode, slot, patient, fee, cancellation policy, payment, confirmation |
| My appointments | Upcoming, completed, cancelled, rescheduled bookings with join/check-in instructions |
| Patient profile | Contact details, saved addresses, consent settings, relevant health information, account controls |
| Support | Booking changes, payment issues, complaints, refund status, accessible contact routes |

### Booking status model
`Requested -> Confirmed -> Checked-in / Consultation started -> Completed`, with alternative states: `Pending Payment`, `Reschedule Requested`, `Cancelled`, `Rejected`, `No-show`. Each transition has an **authorised actor**, a **timestamp** and a **notification rule**.

### Offline appointments
- Show clinic address and a directions link after booking.
- Show appointment time, check-in instructions, clinic contact.
- Support arrival/check-in status if the clinic uses it, without requiring it for all clinics.
- Online consultation is a **separate choice**, not a hidden feature of offline booking.

---

## 8. Prescription and medicine ordering (Brief §07, p.9)

Connected but compliant. A consultation does not automatically mean a prescription is required, or that every prescribed product is available through the platform.

### Prescription requirements
- Upload an existing prescription securely, with file-size and file-type limits.
- Link a prescription generated by an authorised doctor to the consultation and patient.
- Statuses: uploaded, pending review, approved for fulfilment, clarification requested, rejected, expired (where applicable).
- Restrict viewing to authorised clinical or pharmacy roles and the patient.
- Record reviewer identity, timestamp, decision, reason. Preserve required records.
- AI must never generate or modify a prescription as if signed by a clinician.

### Medicine catalogue and stock

| Data | Requirement |
|---|---|
| Product identity | Unique SKU/product ID, brand, generic name/composition, strength, dosage form, manufacturer |
| Pack and price | Pack size, MRP, selling price, tax classification, pricing controls |
| Prescription status | Product classification and prescription requirement based on verified rules |
| Inventory | Location, batch number, expiry, available quantity, reserved quantity, stock movement |
| Dispensing | Authorised pharmacy, prescription check, batch allocation, invoice, fulfilment status |
| Supplier and cost | Supplier, purchase order, purchase cost, reconciliation (restricted to authorised staff) |
| Safety | Near-expiry alerts, expired stock block, recalls, damaged stock, return tracking |

### Order flow
Search product -> check serviceability and stock -> add to cart -> upload or select prescription if required -> authorised review -> confirm final items and price -> payment -> dispensing and packing -> delivery or eligible pickup -> invoice and order history.

### Exception handling
- Prescription rejected or incomplete: explain next steps without making clinical decisions.
- Out of stock: offer a request/availability-update flow. Do not auto-substitute without required professional authorisation and patient consent.
- Payment failed: prevent duplicate orders, allow safe retry.
- Partial fulfilment, cancellation, return, refund and delivery failure must be supported.
- Activate medicine sales only for licensed operations and legally eligible products.

---

## 9. Medical shop partner discovery and map (Brief §08, p.10)

A location-discovery and local-assistance layer.

### Partner shop profile
- Name, logo/photo, partner status, unique partner ID.
- Verified street address, locality, city, state, PIN code.
- Latitude/longitude or validated map location, map preview, directions link.
- Phone, opening hours, weekly closure, holiday schedule.
- Services: booking assistance, customer support, eligible order coordination, other approved services.
- Licence or registration information where required, verification status, last-verified date.
- A clear indicator whether medicine stock is live-integrated, manually updated, or must be confirmed with the shop.

### Location search and map behaviour
- Search by city, locality or PIN code. Offer nearby results only after the user allows location use.
- Show map pins and a synchronised list.
- Sort by distance only when user location and partner coordinates are reliable.
- Each result: name, distance if available, address, open/closed status (from configured hours), phone, View Details and Get Directions.
- Filters: currently open, service type, supported services.
- If maps or geocoding fail, keep address-based search and a directions link as fallback.
- Admin can correct inaccurate locations, hide a shop temporarily, and re-verify.

### Partner workflow
Partner application -> document submission -> HCQ Care verification -> profile and location approval -> publish on map and search -> maintain hours and services -> receive eligible customer assistance requests -> track agreed referrals/orders and settlements.

Data quality rule: do not publish a shop as an approved partner until verification is complete. Do not claim real-time medicine availability unless the inventory feed is dependable.

---

## 10. Admin dashboard and operational controls (Brief §09, p.11)

| Module | Required controls |
|---|---|
| Dashboard | Bookings by mode, clinics/doctors/shops pending review, medicine orders, service issues, financial summaries |
| Clinic management | Approve profile, edit public details, manage status, verify address, view doctor roster |
| Doctor management | Verify credentials, approve online-only profiles, manage clinic links, suspend access |
| Booking management | Search/filter, reschedule or cancel with permission, review disputes, inspect audit history |
| Shop partner management | Verify documents, approve map pin, manage services, pause listing, view activity |
| Medicine and inventory | Catalogue, batch/expiry, stock, purchase orders, prescription review, fulfilment controls |
| Payments and settlements | Reconciliation, refunds, commissions, outstanding balances, settlement exports |
| Support and complaints | Ticket assignment, response history, escalation, resolution SLA, complaint reports |
| Content and SEO | Homepage sections, service pages, location pages, FAQs, metadata, approved content |
| Roles and audit | Staff accounts, role permissions, admin MFA, access logs, security event review |
| Reports | CSV/XLSX exports for bookings, partner performance, inventory, payments, support |

Operational rules:
- Approval queues for clinics, doctors, shops and any regulated partner.
- Show verification status publicly only in a truthful, consistent way.
- Require **reasons** for high-impact actions: rejection, suspension, refund, manual settlement adjustment.
- Immutable or tamper-evident audit history for sensitive actions.
- Keep health information out of general-purpose analytics dashboards unless access is necessary and authorised.

---

## 11. Payments, commissions and settlements (Brief §10, p.12)

Support multiple revenue streams without hard-coding commercial terms. Exact fees and partner-sharing rules are configured after commercial agreements.

| Transaction type | System requirements |
|---|---|
| Clinic appointment | Record provider, mode, fee, payment status, cancellation/refund rule, settlement treatment |
| Online consultation | Record doctor fee, platform charge if any, gateway reference, settlement schedule |
| Medicine order | Item subtotal, discounts, taxes, delivery charges, refunds, final payable amount |
| Medical shop referral/partner | Configurable formula with explicit definition of eligible revenue, costs, adjustments, commission |
| Refund / cancellation | Link refund to the original transaction; record amount, reason, status, gateway reference, reconciliation |
| Settlement | Statement, period, gross amount, deductions, adjustments, net payable, approval, paid date |

Controls:
- Verify payment confirmation server-side, including signed webhooks.
- Prevent duplicate payment processing and duplicate order creation (idempotency keys).
- Reconcile platform records with payment-provider reports.
- Keep a **transaction ledger**. Editable dashboard totals are never the source of truth.
- Settlement cycles (weekly or 15 to 20 days) only as allowed by signed agreements.
- Itemise payment gateway fees and other recurring transaction costs.

---

## 12. Website, mobile and screen requirements (Brief §11, p.13)

### Website / responsive web app
- Homepage: search clinics, doctors, medical shops and medicines; clear booking mode selectors.
- Clinic search/results and clinic details with doctor roster.
- Doctor search/results and doctor details, including online-only profiles.
- Appointment booking, checkout, confirmation, appointment management.
- Medical shop list/map, partner profile, directions.
- Medicine catalogue, product detail, cart, prescription upload, order tracking.
- Customer login/profile, privacy controls, support, policy pages.
- Partner registration pages for clinics, doctors and medical shops.

### Mobile
- Patient-focused Android app is the initial mobile priority; iOS scoped separately. A responsive installable PWA may be the early release if it meets the booking and upload experience.
- Doctor/clinic and shop partner functions may start as secure web portals.
- Push notifications, deep links, secure uploads, accessibility, crash reporting, release management.
- Low-bandwidth-friendly layouts and clear empty, error and loading states.

### Design and accessibility
- Mobile-first, core booking actions easy to reach on small screens.
- Clear separation of **Offline Appointment** and **Online Consultation**.
- Plain-language labels, readable text, high contrast, accessible form controls.
- Show loading, empty, error and retry states for search, map, booking and payment.
- **Never use colour alone** to communicate booking or verification status.
- Consistent A-CureXpress / HCQ Care branding and reusable components.

---

## 13. Architecture and data model: the brief's expectations (Brief §12, p.14 to 15)

One source of truth for profiles, availability, bookings, prescriptions, medicine inventory and partner locations. Website and app use the same documented backend APIs.

Brief's suggested architecture (agency may propose alternatives with justification): React/Next.js web; Flutter or React Native mobile (PWA acceptable early); NestJS or Django backend; PostgreSQL; role-based access with row-level controls; private object storage for prescriptions with time-limited access; maintained maps/geocoding provider; Indian payment gateway with webhooks; SMS/OTP, email, push, WhatsApp Business; managed cloud with staging and production, backups, monitoring, CI/CD.

### Core data entities

| Entity | Key relationship / data |
|---|---|
| User | Login identity, role, contact, consent, account status |
| Clinic | Public profile, verified location, services, hours, status |
| Doctor | Professional profile, credentials, verification, enabled consultation modes |
| ClinicDoctor | Relationship between clinic and doctor; clinic-specific schedule and status |
| AvailabilitySlot | Doctor, mode, clinic when applicable, start/end, capacity, booking status |
| Booking | Patient, clinic (optional), doctor, mode, slot, fee, payment, lifecycle status |
| Consultation | Booking reference, consent, secure access details, notes/prescription references |
| Prescription | Patient, prescriber, issue date, document/structured details, review status, audit |
| MedicineProduct / Batch | Product identity plus batch, expiry, stock location, sellable quantity |
| MedicineOrder | Patient, items, prescription link if required, fulfilment, payment, delivery |
| MedicalShopPartner | Verified shop details, coordinates, hours, services, approval status |
| Transaction / Settlement | Ledger entries, commissions, adjustments, refunds, settlement periods |
| AuditLog | Actor, action, affected record, timestamp, reason where required |

### Expectations
- Provide an entity relationship diagram and API documentation.
- Use transactions or concurrency controls to avoid double-booking and inventory overselling.
- Keep sensitive medical files in private storage, never public directories.
- Search filters and indexes for doctor, clinic, service, city/PIN code, location, availability.
- Environment-managed secrets; no private API keys in the frontend.
- Staging, production, automated deployment, documented rollback.

---

## 14. Security, privacy and compliance (Brief §13, p.16)

Security and regulatory readiness are launch requirements.

Minimum controls:
- TLS in transit; encryption at rest for sensitive data and backups.
- Least-privilege access; stronger authentication for privileged accounts.
- Secure OTP and session management, rate limiting, abuse prevention.
- Private prescription/report storage with access checks and audit trails.
- Input validation, secure file upload scanning, file-type restrictions.
- Dependency management, vulnerability scanning, security testing.
- Backup and restore testing, incident response, breach escalation procedures.
- Retention, correction, access and deletion workflows where applicable.
- Data minimisation in notifications, analytics, logs, third-party integrations.

Compliance checklist (HCQ Care and its advisers own validation): pharmacy and drug-sale licensing; telemedicine eligibility, practitioner registration, consent and record rules; applicable Indian data-protection law in force at launch; consumer e-commerce obligations, refunds, grievance handling, transparent pricing; payments, invoicing, GST and partner commission treatment; medical shop partner verification and licence display rules; contractual roles and data-processing terms with clinics, doctors, pharmacies, labs and vendors; app-store privacy disclosures.

**Launch gate:** no regulated service goes live merely because the software is ready. HCQ Care verifies licences, credentials, partner agreements, workflows and legal approvals per service.

---

## 15. SEO, analytics and notifications (Brief §14, p.17)

### SEO
- Search-friendly public pages for clinics, doctors, approved shops, services, and medicines where appropriate.
- Unique titles, descriptions, canonical URLs, XML sitemap, indexing controls.
- Structured data only where accurate and supported by page content.
- Google Search Console and privacy-conscious analytics.
- Local SEO must match verified clinic and shop details. **Never generate fake location pages.**
- Content management for About, services, FAQs, partner pages, policies.
- AI-assisted content drafts allowed, but medicine and clinical claims need review.

### Analytics events
Search started, search result opened, clinic profile viewed, doctor profile viewed, offline/online mode selected, booking started, booking confirmed, cancellation, no-show, shop profile viewed, directions opened, contact action clicked, medicine search, product view, prescription upload outcome, checkout, order completed, payment failure, support ticket created, partner onboarding completed. **No health data in events.**

### Notification matrix

| Trigger | Recipients / channel |
|---|---|
| Booking requested / confirmed / changed | Patient and relevant doctor/clinic staff; push, SMS, email as configured |
| Upcoming appointment | Patient and provider, with appropriate timing and opt-out rules |
| Online consultation reminder | Patient and doctor; secure join path, no sensitive details |
| Prescription status update | Patient and authorised pharmacy/doctor participants |
| Medicine order update | Patient; pharmacy and delivery partner as needed |
| Partner application status | Clinic, doctor or shop applicant |
| Payment / refund / settlement update | Relevant account holder and authorised finance staff |
| Security / account event | Account owner and security team as appropriate |

---

## 16. Testing, acceptance and launch readiness (Brief §15, p.18)

A polished interface alone is not acceptance. Provide a test plan, test evidence and known limitations.

Mandatory end-to-end scenarios:
1. A clinic with several doctors shows the correct roster and supports bookings for each eligible doctor.
2. Offline appointment and online consultation appear only when enabled for that clinic/doctor and service.
3. An online-only doctor can register, be verified, publish availability and receive online bookings with no physical clinic listing.
4. A doctor linked to multiple clinics has separate clinic-specific offline schedules and no conflicting slots.
5. Two patients attempting the same last slot cannot both confirm it.
6. A medical shop appears on the map only after approval, with the correct verified address and location.
7. Location permission denied: city and PIN search and address-based discovery still work.
8. Prescription upload, review, rejection/clarification and approved fulfilment paths work.
9. Expired or unavailable inventory cannot be sold; stock reservation and release behave correctly.
10. Payment failure, duplicate webhook, cancellation, refund and reconciliation scenarios work.
11. Role-based access stops unrelated users and delivery staff from opening medical records.
12. Backups can be restored and critical errors can be monitored.

Acceptance gates: Design approval; Core workflow staging (clinic, doctor, booking, shop map, admin); Commerce staging (prescription, inventory, order, payment, refund); Security / UAT (access-control tests, vulnerability fixes, sign-off, known issues); Production handover (deployment, monitoring, backup proof, source code, API docs, training, credentials).

---

## 17. Roadmap and milestones (Brief §16, p.19)

Brief's indicative plan (16 weeks):

| Phase | Weeks | Deliverables |
|---|---|---|
| Discovery and design | 1 to 2 | Requirements, architecture, data model, key screens, backlog |
| Core platform | 3 to 5 | Auth, roles, clinic/doctor/shop entities, admin approval, public profiles |
| Booking engine | 5 to 8 | Multi-doctor clinics, online-only doctors, schedules, mode selection, booking, notifications |
| Prescription and pharmacy | 7 to 10 | Prescription upload/review, catalogue, stock, order workflow (scope depends on licensing) |
| Partner map and operations | 8 to 11 | Approved shop discovery, location search, map, directions, partner portal, admin controls |
| Mobile and integrations | 9 to 13 | Responsive/PWA or native scope, payments, notifications, external integrations |
| QA, security, UAT | 12 to 15 | End-to-end testing, fixes, load/security checks, training, acceptance |
| Production launch | 15 to 16+ | Deployment, monitoring, handover, app submission if included, stabilisation |

Our working phasing (default; see D17): Phase 1 = identity, clinics, doctors and verification, booking, payments, shop map, admin. Phase 2 = prescriptions, pharmacy, delivery. Phase 3 = AI Health Consultant and native apps. Medicine-shopping UI is built behind a feature flag from the start.

---

## 18. Addendum A: AI Health Consultant (Add. §A, p.2)

A clearly labelled option for patients on web and mobile. A separate digital guidance feature. **Never presented as a human doctor or a replacement for professional care.**

Patient-facing capabilities:
- Users describe symptoms in everyday language and ask general health, wellness, medicine-information and care-navigation questions.
- Asks relevant follow-up questions, gives general understandable information, shows that answers may be incomplete and are not a diagnosis.
- Offers a clear next step: book a doctor, choose a clinic, contact a professional, or see emergency guidance.
- Share conversation context with a doctor **only with the user's consent**. Controls to end or delete a conversation where the retention policy allows.
- Clear language selection and accessible design for tier-2 and tier-3 users. Do not imply a language is available until implemented and tested.

Safety and boundaries:
- Must not issue prescriptions, create a doctor-signed prescription, claim to be a licensed clinician, or make definitive diagnoses.
- For severe or potentially life-threatening symptoms show an **urgent emergency message** (contact local emergency services or go to the nearest emergency department). Do not delay escalation with a long chat.
- Do not advise starting, stopping or changing prescription medicines based only on AI output. Direct medicine-specific or complex questions to a doctor or pharmacist.
- Protect health information: access controls, encryption, clear consent, minimal collection, retention and deletion rules, audit logs. Do not use identifiable conversations for model training without lawful basis and consent.
- Label the feature "AI Health Consultant" with a persistent notice: "AI-generated information is for general guidance only and is not a medical diagnosis or a substitute for a qualified healthcare professional."

Acceptance: demonstrate symptom-question flows, emergency escalation, visible disclaimers, doctor-booking handoff, consent-based sharing, failure/fallback states, and testing for unsafe or misleading responses. The company must approve the clinical safety content and AI provider before production launch.

---

## 19. Addendum B: Doctor registration, verification and badges (Add. §B, p.3)

Distinguish a doctor who merely registered from one formally verified by A-CureXpress. Never use the same badge, label or visual treatment for both.

### Doctor account states

| State | Meaning | Patient-facing display | Can accept bookings? |
|---|---|---|---|
| Registered / Pending Approval | Doctor submitted registration; admin review pending | Not listed publicly (or marked pending in the doctor's own dashboard only) | No |
| Approved: Registered Doctor | Admin approved the profile, but agreement and/or verification not complete | Normal "Registered Doctor" label, no verified badge | Only if admin enables booking and all required credential/compliance checks are complete |
| Company-Verified Doctor | Admin approved, required credential checks recorded, doctor signed the company agreement | Distinct "A-CureXpress Verified" badge with a short explanation of what was checked | Yes, subject to profile activation and service configuration |
| Rejected / Suspended / Expired | Application rejected, access suspended, or credential/agreement expired or revoked | Not discoverable or clearly unavailable; never shown as verified | No |

### Required verification workflow
1. Doctor submits registration: qualifications, registration number, council/authority, contact, service mode, supporting documents.
2. System creates a request with status "Pending Admin Approval" and tells the doctor that submission is not approval or verification.
3. Admin reviews, records outcome and notes, and chooses Approve, Reject, or Request More Information.
4. After approval the doctor can be activated as a normal registered doctor if documents and operating rules are satisfied. No verified badge yet.
5. When the agreement is signed and checks are complete, admin explicitly marks "Company Verified". Store agreement version, signing date, status, reviewer, verification date, expiry/revocation info.
6. Any change to critical credentials, expiry, suspension or agreement status triggers a review and automatically removes or disables the badge and booking access when appropriate.

Public badge wording: "Registered Doctor" (only after admin approval). "A-CureXpress Verified" (only after approval, required checks and signed agreement). Explain the scope of verification. Never imply the company guarantees clinical outcomes.

---

## 20. Addendum C: Admin panel controls (Add. §C, p.4)

Doctor approval is controlled through a role-restricted admin panel. Registration alone never publishes a profile or confers verified status.

Admin dashboard requirements:
- Queue and filters: Pending, More Information Required, Approved/Registered, Company-Verified, Rejected, Suspended, Expired.
- Doctor detail view: profile, clinic associations, qualification and registration fields, uploaded documents, agreement status, service mode, availability, review history.
- Actions: Approve, Reject, Request More Information, Activate/Deactivate, Suspend/Restore, Mark Agreement Signed, Mark Company Verified, Revoke Verification. **Reason required** for rejection, suspension, revocation.
- Role-based access: only authorised admin roles approve doctors or change verification. Log every status change with actor, timestamp, previous state, new state, reason.
- Notifications to doctors: submission received, more information required, approved/rejected, agreement completed, verified, suspended, expiry reminders.
- Public search and booking APIs enforce status rules **on the server**. Pending, rejected, suspended and expired profiles cannot accept bookings.
- Approved doctors may associate with a clinic, while the independent-online-doctor path stays. **Clinic membership does not verify a doctor.**

Suggested core fields: `doctor_status`, `admin_approval_status`, `qualification_documents`, `registration_number`, `registration_authority`, `verification_checks`, `company_agreement_status`, `agreement_version`, `agreement_signed_at`, `verified_at`, `verified_by_admin_id`, `rejection_reason`, `suspension_reason`, `credential_expiry_at`, `status_history`, `public_badge_type`.

Minimum acceptance tests:
1. A newly registered doctor is not shown as verified and cannot accept bookings before admin approval.
2. An approved doctor without a signed agreement shows only as "Registered Doctor", no verified badge.
3. Only an approved doctor with completed checks and a recorded signed agreement gets the A-CureXpress Verified badge.
4. Rejecting, suspending, expiring or revoking immediately updates public visibility, badge and booking eligibility.
5. Unauthorised admin users cannot approve doctors or change verification. All changes appear in the audit log.
6. The AI Health Consultant shows disclaimers, handles emergency scenarios safely, and offers a doctor handoff without issuing prescriptions.

Agency deliverables: updated UI/UX, database and API changes, admin workflows, notification templates, automated tests, security review, demonstration of each acceptance test. The final verification checklist, credential validation process, agreement text, AI clinical safety policy and applicable Indian healthcare and privacy requirements must be approved by A-CureXpress before launch.

---

## 21. Brief's own decision table and our answers (Brief §19, p.22)

| Decision | Brief's default | Our answer |
|---|---|---|
| Clinic/doctor relationship | Many doctors per clinic; a doctor may serve several clinics | Yes. Either side requests; the other side and admin approve (D6) |
| Booking modes | Explicit online/offline settings | Yes. Set per doctor; a clinic can switch a mode off; no overlaps (D7) |
| Online-only doctor | No public address required | Yes. Registration checked before listing |
| Payments | Online payment with configurable fees and refunds | HCQ collects and pays out; timing per mode (open points G2, G4) |
| Shop availability | Stock not live unless integrated | Yes. No live stock in Phase 1 (D10) |
| Medical shop role | Local assistance; dispensing only via authorised operations | Yes. Admin checks the shop's government licence at approval (D1) |
| Medicine fulfilment | Eligible products through licensed operations | Orders go to licensed partner pharmacies, delivered by a logistics partner (D1, D11) |
| Mobile scope | Web/PWA first; native itemised | Web and PWA first, native Android next, iOS later (D14) |
| Video consultation | Third-party provider; no recording by default | Yes (D15) |
| Languages | English-first, Hindi recommended | English and Hindi (D16) |
| Budget | Itemised quote | Lean, standard and scale options (D18) |
| Launch geography | Confirmed locations first | One pilot district (D17) |

---

## 22. Decisions and clarifications agreed by the dev team

These came from the discussion with the project lead. They override the original brief where they differ.

**Role and scope**
- D0. Flucks is the development partner. We build the product. Licences, legal approvals and agreements are HCQ Care's responsibility ("launch gate"). We build regulated features behind feature flags and do not block development on them.

**Medicine and shops**
- D1. A pharmacy or medical shop **holds its own government-issued licence**. Shops register themselves; HCQ admin checks the licence **during approval**. The registration form must capture licence fields: licence number, issuing authority, expiry date, and an uploaded scan. Admin verifies and records the outcome. Licence expiry triggers a re-check and a reminder. So we build a **marketplace** that routes orders to licensed partner pharmacies, not a pharmacy operated by HCQ.
- D2. A medical shop (map listing, assistance) and a pharmacy (dispenses medicines) are **two separate approvals**. A business that is both registers once and is verified for both.
- D10. In Phase 1, shops do not manage stock. Availability shows "confirm with shop". Stock is held per licensed pharmacy location, not centrally.
- D11. Delivery is done through a **logistics partner** (integration or a simple rider web portal), with serviceable PIN codes managed in admin.
- D12. Medicine catalogue is imported from a CSV template supplied by HCQ. No third-party drug database in Phase 1.
- D13. Stock handling: stock-in with batch and expiry only. Procurement and accounting happen outside the platform; provide CSV export.
- D9. Shop onboarding uses a configurable document checklist, desk verification with an optional site-visit flag, and renewal reminders. The shop places its map pin and an admin confirms it against the address. The maps provider is chosen on India coverage and cost.

**Booking and clinical**
- D6. Doctor-to-clinic link: either side requests; the other side **and** an admin approve. Ending a link stops new bookings, flags existing bookings for rescheduling, and keeps history.
- D7. Scheduling conflicts: one doctor cannot be booked in two places or modes at the same time. Buffer time between appointments is configurable. Checkout slot hold defaults to 10 minutes and is extended while a payment is pending.
- D8. Health records are visible only to the treating doctor and the patient. Wider sharing needs the patient's recorded consent.

**Verification and admin**
- D5. Verification checklist is configurable (fields can be added later). Doctor registration numbers are verified manually at launch, with fields ready to store ABDM identifiers (ABHA, HPR, HFR) later.

**Data and AI**
- D3. Fees and commissions are configurable rules, never hard-coded. Use placeholder rates in testing.
- D4. Patient data is hosted in India (Supabase Mumbai region). Every third-party processor is listed in a data-flow register for legal review.
- D19. AI Health Consultant chats: login required, stored encrypted, deletable by the user, auto-expire on a configurable schedule, admin read access only for logged safety audits.

**Platform defaults (no further client input needed)**
- D14. Mobile: responsive web and installable PWA first; native Android (React Native / Expo) next; iOS later; partner portals on the web.
- D15. Video consultation uses a third-party SDK. No recording. Usage cost is listed in recurring costs.
- D16. Languages: English and Hindi interface. Provider-entered content is shown as entered. AI languages are listed only after testing.
- D17. Launch: a single-district pilot. Phasing as in section 17.
- D18. Budget: present lean, standard and scale options with itemised recurring costs.
- D20. Scale: build for 100,000 users using the working assumptions in section 0.

---

## 23. Open points waiting for the client (with the working default)

Sent to HCQ Care as a gap document (20 points). Until answered, implement the default as **configuration**. Priority in brackets.

| ID | Brief ref | Topic | Working default |
|---|---|---|---|
| G1 (Critical) | p.7 §05; p.9 §07 | What a doctor may prescribe by consultation type; where prescriptions are written | Doctors write and sign prescriptions in the platform. Allowed medicine types per consultation type are a setting set by HCQ's advisers |
| G2 (Critical) | p.12 §10; p.22 §19 | Who receives the patient's money | HCQ collects via the gateway (split settlement), then pays clinics, doctors and shops on the agreed cycle |
| G3 (High) | p.12 §10; p.10 §08 | Shop commission formula and what counts as a shop referral | Linked by shop code or a recorded assistance request |
| G4 (High) | p.8 §06; p.22 §19 | When payment is taken | Online consults prepaid. Clinic visits prepaid or pay-at-clinic, set per clinic |
| G5 (High) | p.6 §04; p.4 §02 | Fixed slots or walk-in token queue | Fixed slots at launch; token queue later |
| G6 (High) | p.5 §03; p.6 §04 | Who books at the clinic front desk | Add a "Clinic Staff" role: creates bookings, marks arrival, sees only that clinic's bookings |
| G7 (High) | p.4 §02; p.8 §06 | Cancellation, refund, reschedule, no-show rules | HCQ basic rule that clinics and doctors can adjust. Doctor cancels: full refund and a rebooking offer |
| G8 (High) | p.5 §03 | Family members and children | Patient can add family members and book for them. A child needs a guardian account. No shared logins |
| G9 (Medium) | p.7 §05; p.22 §19 | Chat consultation details | Video and audio first. Chat only inside a consultation. No recording |
| G10 (Medium) | p.7 §05 | Who sets consultation fees | Doctor sets the fee within HCQ-chosen limits. Platform charge is a separate line at checkout |
| G11 (Medium) | p.8 §06; p.15 §12; p.7 §05 | Search ranking, reviews | Order by best match, then soonest slot, then nearest. No paid placement. Feedback goes to HCQ only until a review policy exists |
| G12 (High) | p.5 §03; p.4 §02; p.10 §08 | Shop versus pharmacy | Two separate approvals; register once if both (see D1, D2) |
| G13 (High) | p.10 §08 | What a shop "assistance request" is | Three types: booking help, order help, call back. Shop sees basic contact details only with patient consent |
| G14 (High) | p.9 §07 | Prescription validity, repeat orders, excluded medicine types | Validity is a setting. Strictly controlled medicines are not sold at launch |
| G15 (High) | Add. p.3 §B; p.6 §04; p.10 §08 | Registered/Verified labels for clinics and shops | Same two levels as doctors, with an agreement record and expiry date |
| G16 (High) | Add. p.3 §B | How doctors sign the agreement | Upload signed PDF, admin confirms. E-signature later |
| G17 (High) | Add. p.3 §B; Add. p.4 §C | What happens to confirmed bookings when a doctor is suspended or expires | Admin alerted per booking. Patient offered another doctor or a full refund. Nothing cancelled silently |
| G18 (Medium) | p.11 §09; Add. p.4 §C | Admin roles, two-person approval, support tooling | Five admin roles (verification, finance, support, content, super admin). Two people approve payouts and Verified removal. Simple built-in tickets |
| G19 (High) | Add. p.2 §A | Which AI provider, and cost limit | Provider with no training on chats and short retention. Share its data agreement for HCQ's legal check |
| G20 (Critical) | Add. p.2 §A | Who writes and approves the AI emergency/safety content | We build the safety layer and test set. HCQ's doctor supplies and approves the emergency symptom list and wording |

---

## 24. Technical decisions

### Why Next.js and Supabase instead of the brief's NestJS/Django (justification)
- PostgreSQL is the brief's own choice. Supabase is managed Postgres.
- The brief asks for row-level controls. Postgres RLS gives that natively, close to the data.
- Private storage with time-limited access, phone OTP auth, realtime and scheduled jobs are built in.
- One codebase for the website, patient app, partner portals and admin.
- Risk to manage: Supabase is not a classic API server. So business logic (booking, stock, ledger) goes into **Postgres functions**, and a thin Next.js API layer handles webhooks and integrations. Document every API (OpenAPI for custom routes; generated types for tables).

### Stack

| Layer | Choice |
|---|---|
| Web | Next.js (App Router), TypeScript strict, Tailwind CSS, shadcn/ui components. Public pages use ISR and CDN caching so most traffic does not hit the database |
| Database | Supabase Postgres, Mumbai region. Extensions: `btree_gist` (no-overlap constraints), `postgis` (shop distance), `pg_trgm` and full-text search (search), `pgcrypto` |
| Auth | Supabase Auth, phone OTP for patients (custom SMS provider hook for India DLT rules), email plus TOTP MFA for staff and admins |
| Files | Supabase Storage private buckets, signed URLs, upload scanning (ClamAV service or API) |
| Background work | `pg_cron`, Supabase Queues (pgmq) or a job runner for notifications, reminders, settlements |
| Payments | Razorpay (with Route for split settlements) or Cashfree. Signed webhooks, idempotency |
| Video | Third-party SDK (100ms, Daily or Agora). No recording |
| Messaging | SMS: MSG91 or Gupshup (DLT registered). WhatsApp Business. Email: Resend or SES. Push: FCM and web push |
| Maps | Google Maps, Mappls or Ola Maps (choose on India coverage and cost). Address-search fallback |
| AI consultant | LLM API called server-side behind a safety layer (emergency check before the model, rate limits, consent log) |
| Rate limiting | Upstash Redis |
| Observability | Sentry, uptime checks, Supabase PITR backups |
| CMS | Payload or Sanity, or a simple built-in editor |
| Mobile | PWA first, then React Native (Expo) using the same Supabase backend |
| i18n | `next-intl`, English and Hindi |

All third-party accounts are opened in HCQ Care's name, with Flucks as administrator.

### Architecture rules (for every change)
1. **Business logic in the database for anything that must be atomic**: booking creation, slot hold and release, stock reservation, ledger entries. Expose as `SECURITY DEFINER` functions with explicit checks.
2. **No double booking by design**: an exclusion constraint on a doctor's time range (`tstzrange`) per doctor, with a partial condition for active bookings. Slot holds expire.
3. **RLS on every table with patient or partner data.** Default deny. Write policies and tests together.
4. **Status rules on the server**: doctor status and badge logic live in database views or functions that public search and booking use. Never in UI code alone.
5. **Audit log is append-only**: no UPDATE or DELETE granted to application roles. Triggers write entries for sensitive actions with actor, time, old state, new state, reason.
6. **Ledger, not totals**: money moves as double-entry ledger rows. Dashboards read from the ledger.
7. **Idempotency** on payment webhooks and order creation.
8. **Feature flags** for medicine sale, online prescribing, AI consultant, native-app features.
9. **Time**: store `timestamptz` in UTC; display in IST.
10. **Privacy**: no health data in logs, analytics events or notification text. Minimal data to third parties.
11. **Config over code** for fees, commissions, cancellation rules, buffer times, hold duration, document checklists.
12. **Scale**: connection pooling (Supavisor), indexed search, read replica for admin reports when needed, partition large append-only tables (audit, notifications, ledger) by time, cache public pages.
13. Types are generated from the database. No `any`.
14. Every module has tests for its rules (see section 16 scenarios).

### Suggested repo layout
```
docs/                      this file, design exports, ADRs
src/app/(public)/          visitor pages (home, search, clinic, doctor, shop, medicines)
src/app/(patient)/         signed-in patient area
src/app/(partner)/         clinic, doctor, shop portals
src/app/(admin)/           admin panel
src/features/<module>/     module code (booking, doctors, clinics, shops, pharmacy, payments, ai, ...)
src/lib/supabase/          browser, server and middleware clients
src/components/ui/         design system components
src/config/                feature flags, constants
supabase/migrations/       SQL migrations
supabase/seed.sql          sample data
supabase/tests/            database tests (RLS, constraints)
```

---

## 25. UI and design direction

### Reference
Existing site https://a-curexpress.com/ is a medicine store with doctor banner: header (logo, Home, Medicines, Doctors, medicine search, cart, Login, Prescription upload), blue hero "Your Health, Our Priority", two CTAs ("Free AI Consultation", "Book Appointment"), trust strip (free delivery over Rs 499, 24/7 support, authentic products, price match), 18 categories (homeopathy, ayurveda, baby care, unani, nutrition, sexual wellness, multivitamins, sugar substitutes, hair care, health food and drinks, skin care, essential oils, yoga accessories, herbal teas, health devices, support and splints, men's grooming, elderly care), promo banners. Do not copy claims such as "100% guaranteed" or "99.999% germ protection". Do not show fake doctors, counts or reviews.

### Direction (v3): marketplace feel, healthcare calm
A Flipkart-style structure: grey page background, white panels, category strip under the header, banner carousel, dense product rows. Colours come from the logo (blue and green) plus amber for deals. No purple, no rainbow pastel tiles.

### Tokens
```
--brand-blue:    #155DFC   primary buttons, links
--deep-blue:     #0A2E9E   hero start, footer
--teal:          #0EA5A4   gradient end (banners only)
--brand-green:   #15803D   solid Add / Book buttons (white text)
--green-accent:  #22C55E   icons, small accents only
--amber:         #FFB703   deal tags, highlight buttons (dark text #1A1A1A)
--ink:           #0F1B33   headings
--body:          #475569   body text
--muted:         #64748B   secondary text
--mrp:           #6B7280   struck-through MRP
--page-bg:       #F1F5F9
--panel:         #FFFFFF   12px radius, light shadow
--tint-blue:     #EAF1FF
--tint-green:    #E7F6EC
--tint-cream:    #FFF6E0
--error:         #E7000B
--warning:       #B45309 on #FFF7E6
--star:          #F5B301
```
Gradients only inside banners (deep blue to brand blue to teal, plus one amber-to-orange). All text 4.5:1 contrast or better.

Type: Inter (Latin) plus Noto Sans Devanagari (Hindi). Body 14 to 16px, panel titles 20px, banner text up to 40px, price 18px bold. Nothing under 13px. Cards 12px radius. Tap targets 48px or more.

### Status labels (never colour alone)
- **A-CureXpress Verified**: blue shield-check icon, navy text, white pill.
- **Registered Doctor**: plain grey outlined label, no shield.
- **Online**: video icon. **At clinic**: map-pin icon.
- Emergency notice: thin amber top bar, dark text, dismissible: "In an emergency call 112 or go to the nearest hospital. This is not an emergency service."

### Home page for visitors who are not signed in (desktop 1440 and mobile 390)
1. Thin amber emergency bar.
2. Sticky white header: logo, city/PIN chip, wide search with tabs Doctors | Clinics | Medicines | Shops, EN | हिं, Login, cart with count badge, "Become a partner".
3. Category strip: round items (Consult online, Clinic visit, Medicines, Ayurveda, Baby care, Nutrition, Skin care, Health devices, Elderly care, Shops near me).
4. Hero banner carousel, 4 slides: online doctor, first-order medicine offer, AI Health Consultant, find a verified shop.
5. Service tiles: Book a clinic visit, Talk to a doctor online, Order medicines (upload prescription), Find a medical shop near me.
6. Offers this week: 4 image tiles. No countdown timers.
7. Upload prescription strip.
8. Doctors available today: horizontal carousel (portrait, name, speciality, experience, languages, rating, Online/At clinic chips, fee, next slot, Book, verified/registered label).
9. Clinics near you: carousel (photo, Open now, rating, distance, doctors count, Book).
10. Product rows (5): vitamins and supplements, baby and mother care, health devices, ayurveda and wellness, elderly care. Card: photo, brand, name, pack, rating, price, MRP struck, green "% off", Add button that becomes a stepper, "Prescription needed" tag where relevant. Banner between every two rows.
11. Shop by category: 12 square tiles with product photos.
12. Medical shops near you: map plus list (Open now, distance, Call, Directions).
13. AI Health Consultant band with chat mockup, the disclaimer, and "Start free chat".
14. Why trust us: four icon items, "What does Verified mean?" (registration number checked, documents checked, agreement signed), three reviews.
15. Join us: doctor, clinic, medical shop.
16. FAQ, app-install strip, footer (contact, grievance, company details).

Mobile: header with logo, PIN chip, cart, then search below. Round category strip, 16:9 carousel, 2x2 service tiles, horizontal product rows (2.3 cards visible), 2x2 offers, sticky bottom tabs (Home, Doctors, Medicines, Orders, Account), floating cart bar when items exist.

### Home page for signed-in patients (contextual, "what is happening with me now")
1. Header: greeting, saved address chip, search with recent searches, "Booking for: Self" family switcher, cart, bell. Bottom tabs.
2. **Up next** card: next appointment (doctor, time, mode) with one fitting button (Join call, Get directions or Check in) and Reschedule.
3. **Needs your attention**: payment pending with slot-hold timer, prescription needs clarification, order out for delivery.
4. **Order tracker**: Placed, Packed, Out for delivery, Delivered, with ETA.
5. Quick actions: Book visit, Online consult, Reorder, Upload prescription, AI consultant, My records.
6. **Continue where you left off**: cart, recent searches, recently viewed doctors and medicines, unfinished booking.
7. **Buy again**: refill-due products (only for prescriptions still valid).
8. **Your doctors**: Book follow-up.
9. **Near you**: doctors and clinics near the saved address.
10. **For you**: one soft offer card. Personalisation uses only simple signals (recent searches, categories) and the user can clear it.
11. Slim AI consultant card and emergency line.

Privacy rule for personalisation: never show medical condition names or sensitive-category suggestions on home cards. Only doctor speciality.

### Stitch designs
Screens for both home pages were generated with Google Stitch and will be refined in code. Exports live in `docs/design/`. Treat them as **visual reference only**, not as source code to copy.

### Borrow from marketplace apps, and leave out
Borrow: sticky search, icon category rows, product cards, "continue where you left off", order tracker, PIN check, saved addresses. Leave out: countdown timers, fake urgency, pre-ticked add-ons, fake discounts. The tone is calm and honest. Do not promote prescription-only medicines with discounts. Keep offers to non-prescription categories.

---

## 26. Out of scope for now
- Labs and diagnostics (mentioned once in the brief's contract roles, no module).
- Live medicine stock integration with partner shops (Phase 1).
- Native iOS app.
- In-house video infrastructure (we use a third-party SDK).
- Call recording.
- Procurement and accounting inside the platform.
