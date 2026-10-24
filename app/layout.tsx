import "./globals.css";

export const metadata = {
  title: "STORM X AI ASSISTANT",
  description: "CODE THE FUTURE. DEBUG THE IMPOSSIBLE. Owned by STORM X"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
