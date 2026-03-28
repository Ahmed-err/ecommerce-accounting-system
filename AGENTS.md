# AGENTS.md - Agent Coding Guidelines

This document provides guidelines for AI agents working in this codebase.

## Project Overview

This is an **Electrical Supplies E-Commerce Store with ERP** built with:
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Base UI
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js v5 (Auth.js)
- **Language**: JavaScript (no TypeScript)
- **Icons**: Lucide React
- **Charts**: Recharts

The app serves an electrical supplies store in Sudan, with Arabic (RTL) and English (LTR) language support.

---

## Build / Lint / Dev Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000

# Production
npm run build        # Build for production
npm start            # Start production server

# Linting
npm run lint         # Run ESLint (uses eslint-config-next/core-web-vitals)

# Database
npx prisma db push   # Push schema changes to database
npx prisma db seed   # Run seed script
npx prisma studio    # Open Prisma Studio (database GUI)

# Single Component (shadcn/ui)
npx shadcn add <component>  # e.g., npx shadcn add button card table
```

**Note**: No formal test framework (Jest/Playwright) is currently configured.

---

## Code Style Guidelines

### General Rules

1. **No TypeScript** - This is a JavaScript project. Do not add type annotations.
2. **ESLint** - Run `npm run lint` before committing. The project uses `eslint-config-next/core-web-vitals`.
3. **Comments** - Only add comments for complex logic or security-related code. Do not add unnecessary comments.

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Server Actions | `*.js` | `src/app/actions/accounting.js` |
| Client Components | `*.js` with `"use client"` | `src/components/accounting/TransactionForm.js` |
| Pages (App Router) | `page.js` | `src/app/admin/accounting/page.js` |
| Layouts | `layout.js` | `src/app/admin/layout.js` |
| Server Components | `page.js` without `"use client"` | Default in App Router |

### Component Structure

#### Server Components (page.js, layout.js)
```javascript
import { getData } from "@/app/actions/some-action";

export const dynamic = "force-dynamic"; // Add when needed for real-time data

export default async function PageName({ searchParams }) {
  const params = await searchParams; // Await searchParams in Next.js 16
  const data = await getData();
  
  return (
    <div>
      {/* Server-rendered content */}
    </div>
  );
}
```

#### Client Components (*.js with "use client")
```javascript
"use client";
// ☝️ Required for hooks (useState, useEffect, useContext) and event handlers

import { useState, useEffect } from "react";

export default function ComponentName({ prop1, onCallback }) {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Effect logic
    return () => {}; // Cleanup
  }, [dependency]);
  
  const handleAction = () => { /* ... */ };
  
  return (
    <div>
      {/* Client-rendered interactive content */}
    </div>
  );
}
```

### Imports

**Path Alias** - Use `@/` to reference `src/`:
```javascript
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { auth } from "@/auth";
import Component from "@/components/path/Component";
```

**Import Order** (recommended but not strictly enforced):
1. React / Next.js built-ins
2. Third-party libraries (next-auth, lucide-react, recharts)
3. Internal imports (@/lib, @/components, @/context, @/app)
4. Relative imports (./components, ../lib)

```javascript
"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/store/CartProvider";
import ProductCard from "./ProductCard";
```

### Server Actions

All server actions go in `src/app/actions/*.js` and use `"use server"`:
```javascript
"use server";

import { prisma as db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";

async function ensureAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required.");
  }
  return session.user;
}

export async function createItem(data) {
  try {
    await ensureAdmin();
    const item = await db.item.create({ data });
    revalidatePath("/admin/items");
    return { success: true, item };
  } catch (error) {
    console.error("Failed to create item:", error);
    return { success: false, error: error.message };
  }
}
```

### Prisma Patterns

**Prisma Client Usage** - Always use the singleton from `@/lib/prisma`:
```javascript
import { prisma as db } from "@/lib/prisma";
// Use 'db' as the variable name (not 'prisma') to avoid shadowing the import
```

**Query Patterns**:
```javascript
// Get with relations
const data = await db.model.findUnique({
  where: { id },
  include: { relation: true }
});

// Paginated list
const [items, total] = await Promise.all([
  db.model.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
  db.model.count({ where })
]);
```

### Authentication

Use `auth()` from `@/auth` for server-side auth checks:
```javascript
import { auth } from "@/auth";

const session = await auth();
if (!session) return null; // Not authenticated
if (session.user.role !== "ADMIN") throw new Error("Unauthorized");
```

Use `useSession()` from `next-auth/react` for client components:
```javascript
import { useSession, signIn, signOut } from "next-auth/react";

export default function Component() {
  const { data: session, status } = useSession();
  // ...
}
```

### Error Handling

**Server Actions** - Return `{ success: false, error: error.message }` for recoverable errors:
```javascript
export async function action(data) {
  try {
    // ...
    return { success: true, data };
  } catch (error) {
    console.error("Action failed:", error);
    return { success: false, error: error.message };
  }
}
```

**Authorization Errors** - Throw for security-critical failures:
```javascript
if (!session || session.user.role !== "ADMIN") {
  throw new Error("Unauthorized: Admin access required.");
}
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case or PascalCase | `transaction-table.js`, `TransactionTable.js` |
| Functions | camelCase | `getTransactions`, `handleSubmit` |
| Components | PascalCase | `TransactionTable`, `ProductCard` |
| CSS Classes | Tailwind utilities | `className="flex items-center gap-4"` |
| Prisma Models | PascalCase | `User`, `OrderItem`, `Transaction` |
| Enums | SCREAMING_SNAKE_CASE | `ADMIN`, `INCOMING`, `PENDING` |
| Constants | camelCase or SCREAMING_SNAKE_CASE | `PRESET_CATEGORIES`, `MAX_FILE_SIZE` |

### RTL / i18n Support

The app supports Arabic (RTL) and English (LTR). Always include:
```javascript
const { lang, isRTL } = useLanguage(); // Client components
const isRTL = lang === "ar"; // Server components (check cookie)

return (
  <div className={cn(
    "base-class",
    isRTL ? "text-right" : "text-left",
    isRTL ? "flex-row-reverse" : "flex-row"
  )} dir={isRTL ? "rtl" : "ltr"}>
    Content
  </div>
);
```

**Translations** - Use the translation system:
```javascript
import { translations } from "@/lib/translations";

const t = translations[lang]; // lang is "ar" or "en"
const label = t.someKey; // "الوصف" or "Description"
```

### Database Schema Conventions

Models are defined in `prisma/schema.prisma`:
- Use CUID for IDs: `id String @id @default(cuid())`
- Use `@default(now())` for timestamps
- Use enums for fixed sets: `role Role @default(CUSTOMER)`
- Enums defined at schema bottom:
```prisma
enum Role {
  ADMIN
  MANAGER
  CASHIER
  CUSTOMER
}
```

### Component Variants (shadcn/ui)

Use `class-variance-authority` (cva) for component variants:
```javascript
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-classes",
        destructive: "destructive-classes",
      },
      size: {
        default: "size-default",
        sm: "size-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### Utility Functions

**cn()** - Merge Tailwind classes:
```javascript
import { cn } from "@/lib/utils";

className={cn("base-class", condition && "conditional-class", className)}
```

---

## Directory Structure

```
src/
├── app/
│   ├── actions/          # Server actions
│   ├── admin/            # Admin pages (protected)
│   ├── api/              # API routes (if needed)
│   ├── cart/             # Cart page
│   ├── login/            # Auth pages
│   ├── products/         # Product pages
│   └── page.js           # Home page
├── auth.js               # NextAuth configuration
├── auth.config.js        # Auth callbacks
├── components/
│   ├── accounting/       # Accounting module components
│   ├── admin/            # Admin-specific components
│   ├── animations/        # Animation components
│   ├── common/           # Shared components
│   ├── employees/         # Employee module components
│   ├── inventory/         # Inventory module components
│   ├── pos/               # POS terminal components
│   └── store/             # Storefront components
├── context/
│   └── LanguageContext.js # Language/i18n context
└── lib/
    ├── audit.js          # Audit logging utility
    ├── constants.js      # App constants
    ├── prisma.js         # Prisma client singleton
    ├── rate-limit.js     # Rate limiting utility
    ├── translations.js   # i18n translations
    └── utils.js          # Shared utilities (cn, etc.)

prisma/
├── schema.prisma         # Database schema
├── migrations/           # Migration files
└── seed.js               # Database seeder
```

---

## Security Considerations

1. **Always use `auth()`** to check session before sensitive operations
2. **Audit logging** - Use `logAction()` from `@/lib/audit` for important actions
3. **Input validation** - Validate all data in server actions before database operations
4. **Password hashing** - Always use bcrypt for passwords (already configured in `auth.js`)
5. **Rate limiting** - Use `checkRateLimit()` for login attempts
6. **Environment variables** - Never commit secrets; use `.env` with proper variable names

---

## Common Patterns

### Client State Management
```javascript
const [state, setState] = useState(initial);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
```

### Form Handling
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  try {
    // Validation
    if (!data.amount) throw new Error("Amount is required");
    
    // Submit
    const result = await serverAction(data);
    if (result.success) {
      onSuccess();
    } else {
      setError(result.error);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

### Parallel Data Fetching
```javascript
const [summary, listData] = await Promise.all([
  getSummary(),
  getList({ page, search })
]);
```
