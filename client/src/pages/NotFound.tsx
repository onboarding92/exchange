import React from "react";
import { Link } from "wouter";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <h2 className="text-xl font-semibold mb-3">Page not found</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        The page you are looking for does not exist or may have been moved.
      </p>
      <Link href="/">
        <a className="inline-flex items-center px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
          Go back to dashboard
        </a>
      </Link>
    </div>
  );
};

export default NotFound;
