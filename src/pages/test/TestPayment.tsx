import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TestPayment() {
  const navigate = useNavigate();

  // Rediriger immédiatement vers la sélection de profession
  useEffect(() => {
    navigate('/select-profession', { replace: true });
  }, [navigate]);

  return null;
}
