# Study Abroad Platform

A comprehensive web application designed to help international students plan their study abroad journey. Discover universities, find advisors, understand visa requirements, and analyze research papers—all in one place.

## 🌍 Features

- **University Search & Directory** - Browse and compare universities worldwide with detailed information
- **Visa Guide** - Country-specific visa requirements and immigration guidance
- **Professor Finder** - Search and connect with professors aligned to your research interests
- **Saved Professors** - Bookmark and organize professors for future reference
- **Paper Analysis** - Upload and analyze academic papers for insights
- **Personalized Dashboard** - Track your study abroad journey with saved preferences
- **User Authentication** - Secure login with Supabase integration
- **Dark Mode Support** - Comfortable viewing in any lighting condition

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Shadcn UI, Radix UI |
| **Backend** | Supabase (Database & Auth) |
| **State Management** | React Query (TanStack Query) |
| **Routing** | React Router v6 |
| **Forms** | React Hook Form, Zod Validation |
| **UI Components** | Shadcn UI, Lucide Icons |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Testing** | Vitest |
| **Build Tool** | Vite |

## 📋 Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Home page & evaluation tool |
| `/auth` | User authentication & registration |
| `/visa` | Visa requirements by country |
| `/country-guide` | Comprehensive country guides |
| `/professors` | Professor search and discovery |
| `/saved-professors` | Bookmarked professors management |
| `/paper-analysis` | Academic paper analysis tool |

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/hesney-hasin/Study-Abroad.git
cd Study-Abroad

# Install dependencies
npm install
# or
bun install

# Create .env file with Supabase credentials
cp .env.example .env.local
```

### Configuration

Add your Supabase credentials to `.env.local`:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Development

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Run tests
npm run test

# Watch mode for tests
npm run test:watch
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
src/
├── pages/              # Page components
│   ├── Index.tsx       # Home page
│   ├── Auth.tsx        # Authentication
│   ├── VisaGuide.tsx   # Visa information
│   ├── CountryGuide.tsx# Country details
│   ├── ProfessorFinder.tsx
│   ├── SavedProfessors.tsx
│   ├── PaperAnalysis.tsx
│   └── ...
├── components/         # Reusable UI components
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
├── types/             # TypeScript type definitions
├── data/              # Static data & constants
├── integrations/      # External service integrations
├── engines/           # Business logic engines
└── utils/             # Helper utilities
```

## 🔐 Authentication

The application uses Supabase for user authentication with support for:
- Email/password authentication
- OAuth integrations
- Session management
- Protected routes

## 🎨 UI/UX Highlights

- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Accessible Components** - Built with Radix UI for accessibility
- **Smooth Animations** - Framer Motion for polished interactions
- **Theme Support** - Light and dark mode options
- **Modern Forms** - React Hook Form with Zod validation

## 📊 Data Visualization

- Interactive charts using Recharts
- Data tables with sorting and filtering
- University comparison tools
- Research metrics display

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch
```

## 📝 Code Quality

- ESLint configuration for consistent code style
- TypeScript strict mode enabled
- Vite build optimization

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**Hasnay Hasin**
- GitHub: [@hesney-hasin](https://github.com/hesney-hasin)
- LinkedIn: [Hesney Hasin Maliha](https://www.linkedin.com/in/hesney-hasin-maliha/)

## 🔗 Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn UI Components](https://ui.shadcn.com)

## 📞 Support

For support, questions, or feedback, please create an issue on the GitHub repository.

---

⭐ If you find this project helpful, please star the repository!
