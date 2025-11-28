import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TestSubscription() {
  const navigate = useNavigate();

  useEffect(() => {
    // Rediriger vers la première étape
    navigate('/test-subscription/payment', { replace: true });
  }, [navigate]);

  return null;
}
