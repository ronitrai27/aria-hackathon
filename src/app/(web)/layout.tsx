import LenisProvider from "@/provider/LenisProvider";

export default function WebLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LenisProvider>{children}</LenisProvider>;
}
