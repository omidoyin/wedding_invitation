# FULL PRODUCT SPECIFICATION — AALOVESTORY2026 Wedding Invitation Platform

## PROJECT NAME

AALOVESTORY2026

## EVENT DATE

October 10, 2026

## WEDDING COLORS

* Wine
* Beige
* Emerald Green

## TAGLINE

AALOVESTORY2026

## LOVE STORY

“We met in university and became friends.”

---

# PROJECT OVERVIEW

Build a premium digital wedding invitation and guest management platform.

The platform should:

* Deliver personalized invitation links
* Allow RSVP management
* Generate secure entry serial numbers and QR codes
* Verify guests at the wedding venue
* Capture attendance photos
* Allow guests upload wedding pictures
* Accept financial support through Paystack
* Provide admin dashboards for guest management

Tech stack:

* React.js
* Express.js
* MongoDB
* Cloudinary
* Framer Motion
* Tailwind CSS

---

# TECH STACK

## FRONTEND

* React.js (Vite preferred)
* React Router
* Tailwind CSS
* Framer Motion
* Axios
* React QR Code
* React Hook Form

## BACKEND

* Express.js
* PostgreSQL
* Prisma ORM
* JWT Authentication
* Multer
* Cloudinary SDK
* QRCode package
* ExcelJS
* Helmet
* Rate Limiting
* bcrypt

## STORAGE

* Cloudinary for image uploads

## PAYMENT

* Paystack Integration

## DEPLOYMENT

Frontend:

* Vercel or Netlify

Backend:

* Render / Railway / VPS

Database:

* PostgreSQL

---

# APP MODULES

1. Public Wedding Invitation Website
2. Personalized Guest Invitation System
3. RSVP System
4. QR/Serial Number Generator
5. Guest Verification Dashboard
6. Attendance Capture System
7. Wedding Photo Upload Gallery
8. Wedding Support/Donation System
9. Admin Dashboard
10. Export & Reporting System

---

# UI/UX DESIGN SYSTEM

## THEME STYLE

Luxury African wedding aesthetic.

## COLORS

### Primary

* Wine: #722F37
* Beige: #F5F5DC
* Emerald Green: #046307

### Accent

* Gold: #D4AF37

## TYPOGRAPHY

Headings:

* Playfair Display

Body:

* Poppins

## ANIMATION STYLE

Use Framer Motion extensively:

* Envelope opening animation
* Fade transitions
* Scroll reveals
* Hero animations
* Smooth section transitions

---

# WEBSITE FLOW

## ENTRY PAGE

Each guest receives a unique URL:

```text
/invite/:token
```

Example:

```text
/invite/adebayo-family-ax72s
```

When page loads:

* Elegant background music optional
* Animated envelope centered
* Wedding colors throughout
* Floating particles/light effects

### Envelope Interaction

When clicked:

* Envelope opens using Framer Motion
* Invitation card slides upward
* Personalized text displayed

Example:

```text
“The Adebayo Family is warmly invited to celebrate the wedding of...”
```

Button:

```text
SEE MORE
```

---

# MAIN INVITATION PAGE

After clicking SEE MORE, navigate to full wedding page.

---

# PAGE SECTIONS

## 1. HERO SECTION

Contents:

* Couple names
* Wedding date
* Tagline:
  “AALOVESTORY2026”
* Countdown timer
* Hero background image/video
* CTA buttons:

  * RSVP
  * Upload Photos
  * Support Wedding

Animation:

* Smooth fade-in
* Floating typography
* Background parallax

---

## 2. LOVE STORY SECTION

Heading:

```text
Our Love Story
```

Story:

```text
We met in university and became friends.
```

Add:

* Timeline UI
* University-themed visuals
* Animated transitions

---

## 3. EVENT DETAILS SECTION

Include:

* Wedding date
* Time
* Venue
* Google Maps embed
* Dress code

---

## 4. COLOR THEME SECTION

Display:

* Wine
* Beige
* Emerald Green

Add:

* Color palette cards
* Aso ebi inspiration gallery
* Men and women outfit inspiration

---

## 5. RSVP SECTION

This is critical.

## RSVP FLOW

Guest selects:

```text
Number of attendees
```

Rules:

* Friends max = 2
* Family max = 3

The backend controls max attendance per invite.

---

## DYNAMIC ATTENDEE FORM

If guest selects 3 attendees:
Show 3 input sections.

Example:

```text
Attendee 1 Name
Attendee 2 Name
Attendee 3 Name
```

Each attendee should have:

* Full name
* Optional phone number

Validation:

* Cannot exceed allowed attendance
* Names required

---

# RSVP SUBMISSION LOGIC

When RSVP submitted:

Generate:

* Unique serial number
* QR code

Example:

```text
AAL-28472
```

Store:

* Guest family name
* Attendee names
* Allowed attendance
* QR code
* RSVP status

Return:

* Confirmation screen
* QR code download
* Serial number display

Optional:

* Send via email/WhatsApp later

---

# DATABASE MIGRATION UPDATE — USE SQL INSTEAD OF MONGODB

Update the entire application architecture to use SQL instead of MongoDB.

Recommended database:

* PostgreSQL (preferred)
  OR
* MySQL

Preferred ORM:

* Prisma ORM

Reason:

* Better relational structure for guests, RSVPs, check-ins, and attendance tracking
* Easier reporting and admin querying
* Better data consistency
* Stronger transactional support

---

# UPDATED TECH STACK

## FRONTEND

* React.js (Vite)
* React Router
* Tailwind CSS
* Framer Motion
* Axios
* React Hook Form

## BACKEND

* Express.js
* PostgreSQL
* Prisma ORM
* JWT Authentication
* Multer
* Cloudinary SDK
* QRCode package
* ExcelJS
* Helmet
* bcrypt
* Express Rate Limit

## STORAGE

* Cloudinary

## PAYMENT

* Paystack

---

# DATABASE DESIGN (SQL)

Use Prisma ORM.

---

# PRISMA MODELS

## INVITE MODEL

```prisma id="o8tb3v"
model Invite {
  id                Int       @id @default(autoincrement())
  familyName        String
  inviteToken       String    @unique
  category          String
  maxGuests         Int
  invitationOpened  Boolean   @default(false)
  rsvpSubmitted     Boolean   @default(false)

  createdAt         DateTime  @default(now())

  rsvp              RSVP?
}
```

---

# RSVP MODEL

```prisma id="vqscsx"
model RSVP {
  id                Int       @id @default(autoincrement())

  inviteId          Int       @unique
  attendanceCount   Int

  serialNumber      String    @unique
  qrCode            String

  checkedIn         Boolean   @default(false)
  checkedInAt       DateTime?

  checkInPhoto      String?

  createdAt         DateTime  @default(now())

  invite            Invite    @relation(fields: [inviteId], references: [id])

  attendees         Attendee[]
}
```

---

# ATTENDEE MODEL

This replaces storing names in arrays.

```prisma id="r4vwnq"
model Attendee {
  id            Int      @id @default(autoincrement())

  rsvpId        Int

  fullName      String
  phoneNumber   String?

  createdAt     DateTime @default(now())

  rsvp          RSVP     @relation(fields: [rsvpId], references: [id])
}
```

---

# GALLERY MODEL

```prisma id="skxzt2"
model GalleryPhoto {
  id              Int       @id @default(autoincrement())

  uploadedBy      String?
  imageUrl        String
  cloudinaryId    String

  approved        Boolean   @default(false)

  createdAt       DateTime  @default(now())
}
```

---

# DONATION MODEL

```prisma id="hq7g6m"
model Donation {
  id              Int       @id @default(autoincrement())

  donorName       String?
  amount          Float

  reference       String    @unique
  status          String

  createdAt       DateTime  @default(now())
}
```

---

# ADMIN MODEL

```prisma id="6yzaf6"
model Admin {
  id              Int       @id @default(autoincrement())

  username        String    @unique
  password        String

  role            String

  createdAt       DateTime  @default(now())
}
```

---

# WHY SQL IS BETTER FOR THIS PROJECT

SQL fits this project better because:

## RELATIONAL DATA

You have:

* One invite
* Many attendees
* One RSVP
* Many uploads
* Check-in relationships

SQL handles this naturally.

---

# REPORTING

You can easily query:

* Total invited guests
* Total checked in
* Families that haven’t RSVP’d
* Attendance statistics
* Donations totals

---

# SECURITY & CONSISTENCY

PostgreSQL ensures:

* No duplicate serial numbers
* Referential integrity
* Better transactional control

---

# UPDATED BACKEND ARCHITECTURE

```text id="cl5ozh"
server/
  prisma/
    schema.prisma

  src/
    controllers/
    routes/
    middleware/
    services/
    utils/
    config/
```

---

# REQUIRED PRISMA COMMANDS

Initialize Prisma:

```bash id="3g29ic"
npm install prisma @prisma/client
```

Initialize Prisma:

```bash id="9l3x4e"
npx prisma init
```

Run migration:

```bash id="lqjyd5"
npx prisma migrate dev --name init
```

Generate client:

```bash id="cwxmhq"
npx prisma generate
```

---

# RSVP FLOW WITH SQL

## Example Logic

1. Guest opens invite
2. Selects number attending
3. Inputs names for each attendee
4. Backend:

   * Creates RSVP record
   * Creates Attendee records
   * Generates serial number
   * Generates QR code
5. Saves everything relationally

---

# CHECK-IN FLOW WITH SQL

When bouncer searches:

Query:

```sql id="9q8q5u"
SELECT *
FROM RSVP
JOIN Invite
JOIN Attendee
WHERE serialNumber = ?
```

Return:

* Family name
* Attendee names
* Guest count
* Check-in status

---

# EXCEL EXPORT SYSTEM

Generate downloadable Excel reports.

Recommended package:

```bash id="1x1o54"
npm install exceljs
```

Reports:

* Full guest list
* RSVP status
* Check-in status
* Donations
* Upload activity

---

# RECOMMENDED HOSTING

## DATABASE

* PostgreSQL on Railway
  OR
* Supabase PostgreSQL
  OR
* Neon PostgreSQL

Best recommendation:

* Neon PostgreSQL

---

# RECOMMENDED AUTH FLOW

## ADMIN LOGIN

JWT-based authentication.

Roles:

* Admin
* Staff/Bouncer

Permissions:

* Staff:

  * Search
  * Check-in only

* Admin:

  * Full access

---

# FINAL DATABASE RECOMMENDATION

Use:

* PostgreSQL
* Prisma ORM

This is the best architecture for:

* Guest management
* Relational attendance data
* Reporting
* Security
* Scalability
* Production reliability

# QR CODE & SERIAL NUMBER SYSTEM

## SERIAL FORMAT

```text
AAL-XXXXXX
```

Example:

```text
AAL-482913
```

Requirements:

* Unique
* Randomized
* Non-guessable

Generate QR code tied to RSVP record.

---

# CHECK-IN / BOUNCER SYSTEM

Create a secure staff dashboard.

Route:

```text
/admin/checkin
```

Authentication required.

---

# CHECK-IN FLOW

Staff asks:

* Name
* Serial Number

Search functionality:

* Search by serial
* Search by name

Display:

* Family name
* Allowed attendees
* Submitted attendee names
* RSVP status
* QR code
* Already checked in or not

If valid:

```text
APPROVE ENTRY
```

Then:

* Open camera
* Capture attendee image
* Upload to Cloudinary
* Save URL to database

Update:

```javascript
checkedIn = true
```

---

# CHECK-IN RESTRICTIONS

Prevent:

* Duplicate entry
* Fake serials
* Exceeding guest count

---

# STAFF DASHBOARD FEATURES

Staff must NOT edit data.

Allowed actions:

* Search only
* Check-in
* Capture photo

Not allowed:

* Delete
* Modify
* Create invites

---

# ADMIN DASHBOARD

Route:

```text
/admin
```

Features:

* Create invitation links
* Manage invites
* View RSVPs
* Export guest list
* View uploads
* Moderate uploaded photos
* View donations
* Analytics dashboard

---

# INVITE CREATION SYSTEM

Admin enters:

* Family name
* Category
* Max attendance

System generates:

* Unique invitation link

Example:

```text
https://aalovestory2026.com/invite/adebayo-family-a82x
```

---

# PHOTO UPLOAD SYSTEM

Public route:

```text
/gallery/upload
```

Guests can:

* Upload wedding photos
* Add optional caption

Requirements:

* Compress images
* Upload to Cloudinary
* Store URLs in MongoDB

Admin moderation:

* Approve/reject uploads

Public gallery:

* Masonry grid layout
* Infinite scroll

---

# PAYSTACK INTEGRATION

Add section:

```text
Support Our Wedding
```

Features:

* Preset amounts
* Custom amount
* Anonymous option

Workflow:

1. User clicks support
2. Redirect to Paystack
3. Verify payment on backend
4. Save donation record

---

# API ENDPOINTS

## INVITATION

```text
GET /api/invite/:token
```

## RSVP

```text
POST /api/rsvp
```

## CHECK-IN

```text
POST /api/checkin
```

## PHOTO UPLOAD

```text
POST /api/gallery/upload
```

## PAYMENTS

```text
POST /api/paystack/initialize
POST /api/paystack/verify
```

## ADMIN

```text
POST /api/admin/login
GET /api/admin/rsvps
GET /api/admin/invites
```

---

# SECURITY REQUIREMENTS

## MUST IMPLEMENT

### Rate Limiting

Prevent spam.

### Helmet

Secure headers.

### JWT Authentication

Admin/staff login.

### Input Validation

Validate all forms.

### Secure Tokens

Invitation tokens must be random.

### Cloudinary Restrictions

Limit file size and formats.

### QR Validation

Prevent duplicate scans.

---

# RESPONSIVE DESIGN

Must work perfectly on:

* Mobile
* Tablet
* Desktop

Priority:
Mobile-first design.

---

# ANIMATION REQUIREMENTS

Use Framer Motion for:

* Envelope opening
* Scroll reveals
* Hover states
* Modal transitions
* Page transitions
* Countdown animations

---

# PERFORMANCE REQUIREMENTS

Optimize:

* Lazy image loading
* Cloudinary transformations
* Code splitting
* Compression
* MongoDB indexing

---

# FOLDER STRUCTURE

## FRONTEND

```text
src/
  components/
  pages/
  layouts/
  animations/
  hooks/
  services/
  context/
  utils/
  assets/
```

## BACKEND

```text
server/
  controllers/
  routes/
  models/
  middleware/
  services/
  utils/
  config/
```

---

# REQUIRED PAGES

## PUBLIC

* Home
* Invitation
* RSVP
* Gallery
* Support
* Event Details

## PRIVATE

* Admin Dashboard
* Check-in Dashboard
* Analytics
* Guest Management

---

# OPTIONAL PREMIUM FEATURES

## WhatsApp RSVP Reminder

Send reminders automatically.

## QR Scanner

Scan QR directly at venue.

## Live Wedding Stream

Embedded livestream.

## Thank You Page

Post-wedding appreciation page.

## Guestbook

Guests leave messages.

---

# FINAL EXPERIENCE GOAL

The app should feel:

* Elegant
* Premium
* Emotional
* African luxury wedding themed
* Cinematic
* Highly interactive

The experience should make guests feel personally invited and emotionally connected to the wedding before the actual event.

The application must be production-ready, scalable, secure, and optimized for mobile devices.
