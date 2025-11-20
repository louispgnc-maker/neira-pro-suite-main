import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100"
      style={{
        paddingLeft: '1cm',
        paddingRight: '1cm',
        backgroundImage: 'url(https://elysrdqujzlbvnjfilvh.supabase.co/storage/v1/object/public/neira/Design%20sans%20titre-4.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <PublicHeader />

      <div className="flex-1 flex items-center justify-center pt-24">
        <div className="text-center bg-white/80 backdrop-blur p-12 rounded-2xl shadow-xl">
          <h1 className="mb-4 text-6xl font-bold text-gray-900">404</h1>
          <p className="mb-6 text-2xl text-gray-600">Oops! Page not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
