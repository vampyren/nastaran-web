import { redirect } from "next/navigation";

// In MS1 the /berattelser route does not exist yet; redirect to home for now.
// Retargeted to /berattelser when MS1.2 PR4 ships.
export default function TestimonialsRedirect() {
  redirect("/");
}
