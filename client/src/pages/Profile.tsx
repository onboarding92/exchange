import React from "react";
import { DeviceSessionsSection } from "../components/DeviceSessionsSection";

const Profile: React.FC = () => {
  // TODO: collegare a tRPC per mostrare i dati reali dell utente
  const user = {
    email: "user@example.com",
    kycStatus: "pending",
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>

      <p className="text-sm text-gray-500 mb-4">
        This is a placeholder profile page. It will be connected to the backend
        (tRPC) to show real user data and KYC status.
      </p>

      <div className="space-y-2">
        <div>
          <span className="font-medium">Email:</span>{" "}
          <span>{user.email}</span>
        </div>
        <div>
          <span className="font-medium">KYC status:</span>{" "}
          <span className="uppercase">{user.kycStatus}</span>
        </div>
      </div>
      <DeviceSessionsSection />
  </div>
  );
};

export default Profile;