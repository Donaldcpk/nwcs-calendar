import { withAuth } from "next-auth/middleware";

function parseAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token }) => {
      if (token?.isAdminCredentialLogin === true) return true;
      if (!token?.email) return false;
      const email = String(token.email).trim().toLowerCase();
      return parseAdminEmails().includes(email);
    },
  },
});

export const config = {
  matcher: ["/((?!api/auth|login|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
