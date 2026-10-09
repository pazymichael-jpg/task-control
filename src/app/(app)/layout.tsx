import { StoreProvider } from "@/components/store";
import Header from "@/components/Header";
import TaskModal from "@/components/TaskModal";
import SpaceModal from "@/components/SpaceModal";
import ChatWidget from "@/components/ChatWidget";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-32">{children}</main>
      <TaskModal />
      <SpaceModal />
      <ChatWidget />
    </StoreProvider>
  );
}
