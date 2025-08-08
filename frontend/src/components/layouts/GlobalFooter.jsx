export default function GlobalFooter() {
  return (
    <footer className="text-center text-gray-500 dark:text-gray-400 py-4 bg-white dark:bg-gray-800 text-sm border-t border-gray-200 dark:border-gray-700 w-full">
      © {new Date().getFullYear()} Kibundo LMS. All rights reserved.
    </footer>
  );
}
