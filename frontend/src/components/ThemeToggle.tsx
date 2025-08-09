import React from 'react';

// Simple theme toggle with localStorage persistence and prefers-color-scheme fallback
export const ThemeToggle: React.FC = () => {
	const [dark, setDark] = React.useState<boolean>(() => {
		if (typeof window === 'undefined') return false;
		const saved = localStorage.getItem('theme');
		if (saved === 'dark') return true;
		if (saved === 'light') return false;
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
	});

	React.useEffect(() => {
		if (typeof document === 'undefined') return;
		const root = document.documentElement;
		if (dark) {
			root.classList.add('dark');
			localStorage.setItem('theme', 'dark');
		} else {
			root.classList.remove('dark');
			localStorage.setItem('theme', 'light');
		}
	}, [dark]);

	return (
		<button
			type="button"
			className="btn-ghost"
			aria-pressed={dark}
			onClick={() => setDark((v) => !v)}
			title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
		>
			{dark ? '🌙' : '☀️'}
		</button>
	);
};

export default ThemeToggle;

