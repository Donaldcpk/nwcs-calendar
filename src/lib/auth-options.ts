import { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;
  return parseAdminEmails().includes(normalizedEmail);
}

function getAdminCredentialConfig() {
  const username = (process.env.ADMIN_USERNAME ?? "").trim();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!username || !password) return null;
  return {
    username,
    password,
  };
}

function isInternalAdminToken(token: JWT | null | undefined): boolean {
  return Boolean(token?.isAdminCredentialLogin);
}

type AuthAuditStatus = "ALLOW" | "DENY" | "SIGN_IN" | "SIGN_OUT";

function logAuthAudit(status: AuthAuditStatus, email: string, reason?: string) {
  const payload = {
    at: new Date().toISOString(),
    status,
    email: email.trim().toLowerCase(),
    reason: reason ?? "",
  };
  console.info("[AUTH_AUDIT]", JSON.stringify(payload));
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    ...(getAdminCredentialConfig()
      ? [
          CredentialsProvider({
            id: "admin-credentials",
            name: "Administrator",
            credentials: {
              username: { label: "Username", type: "text" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const usernameInput = String(credentials?.username ?? "").trim();
              const passwordInput = String(credentials?.password ?? "");
              const config = getAdminCredentialConfig();
              if (!config) {
                logAuthAudit("DENY", usernameInput || "unknown", "Admin credentials are disabled");
                return null;
              }
              const isValid = usernameInput === config.username && passwordInput === config.password;
              if (!isValid) {
                logAuthAudit("DENY", usernameInput || "unknown", "Invalid administrator credentials");
                return null;
              }

              logAuthAudit("ALLOW", usernameInput, "Administrator credentials login");
              return {
                id: "admin-credentials-user",
                name: "Administrator",
                email: config.username,
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ profile, account, user }) {
      if (account?.provider === "admin-credentials") {
        const username = String(user?.email ?? user?.name ?? "").trim().toLowerCase();
        logAuthAudit("ALLOW", username || "admin-credentials-user", "Credentials signIn callback");
        return true;
      }

      const email = String(profile?.email ?? "")
        .trim()
        .toLowerCase();
      const isVerifiedEmail = Boolean((profile as { email_verified?: boolean } | null)?.email_verified);

      if (!isVerifiedEmail) {
        logAuthAudit("DENY", email, "Google email not verified");
        return "/login?error=AccessDenied";
      }

      if (!isAdminEmail(email)) {
        logAuthAudit("DENY", email, "Email not in ADMIN_EMAILS whitelist");
        return "/login?error=AccessDenied";
      }

      logAuthAudit("ALLOW", email, "Whitelist matched in signIn callback");
      return true;
    },
    async jwt({ token, account }) {
      if (account?.provider === "admin-credentials") {
        token.isAdminCredentialLogin = true;
      }
      return token;
    },
    async session({ session, token }) {
      const config = getAdminCredentialConfig();
      if (isInternalAdminToken(token) && session.user && config) {
        session.user.email = config.username;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const email = String(user.email ?? "").trim().toLowerCase();
      if (email) logAuthAudit("SIGN_IN", email, "Google OAuth sign-in success");
    },
    async signOut({ token, session }) {
      const email = String(session?.user?.email ?? token?.email ?? "")
        .trim()
        .toLowerCase();
      if (email) logAuthAudit("SIGN_OUT", email, "User signed out");
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
