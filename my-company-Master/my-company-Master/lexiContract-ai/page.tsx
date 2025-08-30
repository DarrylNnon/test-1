import DraftingClient from '@/components/DraftingClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Draft a Contract - LexiContract AI',
};

export default function DraftingPage() {
  return <DraftingClient />;
}