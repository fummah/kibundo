import dino from "@/assets/kibundo-dino.jpg"; // ← put your image at src/assets/kibundo-dino.jpg

export default function Mascot({ className = "h-64 w-64" }) {
  return <img src={dino} alt="Kibundo Mascot" className={`${className} mx-auto object-contain`} />;
}
