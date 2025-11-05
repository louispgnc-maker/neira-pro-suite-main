
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-accent/10 to-background">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Neira</h1>
        <p className="text-muted-foreground text-lg">Choisissez votre espace professionnel</p>
      </div>
      <div className="flex gap-8">
  <Button size="lg" className="text-xl px-8 py-6" onClick={() => navigate("/avocats/auth")}>Espace Avocats</Button>
  <Button size="lg" className="text-xl px-8 py-6" variant="secondary" onClick={() => navigate("/notaires/auth")}>Espace Notaires</Button>
      </div>
    </div>
  );
}
