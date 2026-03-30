import { prisma as db } from "@/lib/prisma";

function serializeUser(u) {
  if (!u) return null;
  return {
    ...u,
    dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString() : null,
    emailVerified: u.emailVerified ? u.emailVerified.toISOString() : null,
    phoneVerified: u.phoneVerified ? u.phoneVerified.toISOString() : null,
    accountDeletedAt: u.accountDeletedAt ? u.accountDeletedAt.toISOString() : null,
    createdAt: u.createdAt?.toISOString?.() ?? null,
    updatedAt: u.updatedAt?.toISOString?.() ?? null,
  };
}

export async function getAccountSettingsData(userId) {
  const [user, oauthAccount, sessions, addresses] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        phoneVerified: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        gender: true,
        dateOfBirth: true,
        prefLanguage: true,
        prefTheme: true,
        prefCurrency: true,
        newsletterSubscribed: true,
        notifyOrderStatusEmail: true,
        notifyPromoEmail: true,
        notifyNewArrivalsEmail: true,
        notifyWhatsapp: true,
        marketingUnsubscribed: true,
        password: true,
        accountDeletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.account.findFirst({
      where: { userId, provider: { in: ["google"] } },
      select: { provider: true },
    }),
    db.session.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { sessionToken: true, expires: true, createdAt: true, updatedAt: true },
    }),
    db.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  const safeUser = user
    ? {
        ...serializeUser(user),
        hasPassword: !!user.password,
        password: undefined,
      }
    : null;

  return {
    user: safeUser,
    hasOAuth: !!oauthAccount,
    addresses,
    sessions: sessions.map((s) => ({
      sessionToken: s.sessionToken,
      expires: s.expires.toISOString(),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  };
}
