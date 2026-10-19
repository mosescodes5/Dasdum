import { AddressManager } from "@/components/account/AddressManager";

export default function AccountAddressesPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-primary-deep">Addresses</h1>
      <p className="mt-2 text-sm text-muted">Manage the addresses saved to your account.</p>
      <AddressManager />
    </div>
  );
}
