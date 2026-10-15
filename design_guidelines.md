# PayPilot Design Guidelines

## Design Approach
**Reference-Based: Duolingo-Inspired Financial Gamification**

Drawing from Duolingo's playful, encouraging approach to make financial management feel approachable and motivating rather than intimidating.

## Core Design Principles

### Visual Identity
- **Primary Colors:**
  - Orange: `#FF8C42` (Primary actions, highlights, progress)
  - Green: `#2E8B57` (Success states, completed tasks, positive indicators)
  - White: `#FFFFFF` (Backgrounds, cards)
- **Supporting Palette:**
  - Light Orange: `#FFB380` (Subtle backgrounds, hover states)
  - Light Green: `#52C78A` (Secondary success indicators)
  - Gray: `#F7F7F7` (Card backgrounds, subtle separators)
  - Dark Gray: `#2C3E50` (Text, headings)
  - Alert Red: `#E74C3C` (Debts, warnings)

### Typography
- **Font Families:**
  - Headings: `'Nunito', 'Poppins', sans-serif` (rounded, friendly)
  - Body: `'Inter', 'Roboto', sans-serif` (clean, readable)
- **Scale:**
  - Hero/Mascot text: `text-4xl` to `text-5xl`, `font-extrabold`
  - Section headers: `text-2xl` to `text-3xl`, `font-bold`
  - Card titles: `text-lg` to `text-xl`, `font-semibold`
  - Body text: `text-base`, `font-normal`
  - Labels/metadata: `text-sm`, `font-medium`

### Layout System
- **Mobile-First Spacing:** Use `4, 6, 8, 12, 16, 20` for consistent rhythm
- **Container:** `max-w-lg mx-auto px-4` for mobile-optimized single column
- **Card Spacing:** `p-6` for generous breathing room
- **Section Gaps:** `space-y-6` to `space-y-8` between major sections

### Component Library

**Login Screen:**
- Centered layout with mascot logo prominently displayed at top (`w-32 h-32` to `w-40 h-40`)
- Large, friendly welcome message below logo
- Input fields with rounded corners (`rounded-xl`), thick borders (`border-2`), generous padding (`px-4 py-3`)
- Primary orange button for login (full-width, `rounded-xl`, `py-4`, bold text)
- Google login button with white background, subtle border, Google logo icon
- "Create Account" link in green below buttons
- Playful micro-copy like "Let's get your finances on track! 🚀"

**Cards & Containers:**
- Heavy rounded corners (`rounded-2xl` to `rounded-3xl`)
- Generous padding (`p-6`)
- Subtle shadows (`shadow-lg`)
- White backgrounds with colored accent borders (`border-l-4`) in orange or green
- Debt cards: Red accent for urgency
- Payment method cards: Green or orange accents

**Buttons:**
- Primary (Orange): `bg-orange-500 hover:bg-orange-600`, white text, `rounded-xl`, `px-6 py-3`, `font-bold`
- Secondary (Green): `bg-green-600 hover:bg-green-700`, white text
- Tertiary: White background with colored border, colored text
- Generous touch targets (minimum `h-12`)

**Progress Indicators:**
- Thick, rounded progress bars (`rounded-full`, `h-3` to `h-4`)
- Orange fill for progress, light gray background
- Percentage displayed prominently

**Navigation:**
- Bottom tab bar for mobile with large icons
- Orange highlight for active tab
- Icons from Heroicons (outline style for inactive, solid for active)

**Dashboard Elements:**
- Summary cards with large numbers and friendly labels
- Debt overview with visual hierarchy (largest debts most prominent)
- Quick action buttons (floating action button in orange for adding items)
- Celebration animations for completed payments (confetti, checkmarks)

**AI Strategy Display:**
- Timeline/stepper component showing payment sequence
- Numbered circles connected by lines
- Each step in a card explaining the action
- Green checkmarks for completed steps, orange for current, gray for future

### Character & Personality

**Tone:**
- Encouraging and positive (never judgmental about debt)
- Celebrate small wins with animations and positive messaging
- Use friendly emoji sparingly (✨, 🎯, 💪, 🚀)

**Illustrations:**
- Squirrel mascot appears on empty states, success screens
- Simple line illustrations for concepts (debt-free, strategy, savings)
- Warm, hand-drawn aesthetic

**Micro-interactions:**
- Subtle bounce on button press
- Smooth transitions between screens (`transition-all duration-300`)
- Success animations (scale-up effect, gentle fade-ins)
- Loading states with friendly messages

### Accessibility
- High contrast text (`text-gray-800` on white, white on orange/green)
- Touch targets minimum `44px × 44px`
- Clear focus states with visible outlines
- Form labels always visible (not placeholders only)

### Mobile-First Specifics
- Single column layouts throughout
- Sticky header with logo when scrolling
- Bottom navigation for primary sections
- Swipeable cards where appropriate
- Pull-to-refresh on main screens

This design creates a friendly, game-like experience that makes financial management feel achievable and even fun, reducing anxiety around debt while maintaining professional credibility.