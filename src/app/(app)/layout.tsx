import { StoreProvider } from "@/components/store";
import Header from "@/components/Header";
import SpaceModal from "@/components/SpaceModal";
import Toast from "@/components/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Header />
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-24">{children}</main>
      <SpaceModal />
      <Toast />
    </StoreProvider>
  );
}
