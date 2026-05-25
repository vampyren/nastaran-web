/**
 * Inline script that runs in <head> before React hydrates. Reads the saved
 * theme from localStorage and applies it via `data-theme` on the <html>
 * element. Keeping it tiny + dependency-free so it executes early.
 */
const SCRIPT = `try{var t=localStorage.getItem('nastaran-theme');if(t&&['ornament','elementen','bage'].indexOf(t)!==-1)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function ThemeBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
