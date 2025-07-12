import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// Football game colors
				field: {
					green: 'hsl(var(--field-green))',
					'green-dark': 'hsl(var(--field-green-dark))',
					lines: 'hsl(var(--field-lines))',
					numbers: 'hsl(var(--field-numbers))'
				},
				player: {
					home: 'hsl(var(--player-home))',
					away: 'hsl(var(--player-away))'
				},
				defender: 'hsl(var(--defender-color))',
				stamina: {
					full: 'hsl(var(--stamina-full))',
					low: 'hsl(var(--stamina-low))',
					empty: 'hsl(var(--stamina-empty))'
				},
				lightning: 'hsl(var(--lightning))',
				coin: 'hsl(var(--coin))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'field-scroll': {
					'0%': { transform: 'translateY(0)' },
					'100%': { transform: 'translateY(100px)' }
				},
				'player-glow': {
					'0%, 100%': { boxShadow: '0 4px 20px hsl(var(--player-home) / 0.4)' },
					'50%': { boxShadow: '0 6px 30px hsl(var(--player-home) / 0.8)' }
				},
				'coin-collect': {
					'0%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
					'100%': { transform: 'scale(1.5) rotate(360deg)', opacity: '0' }
				},
				'lightning-flash': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
				'celebration': {
					'0%': { transform: 'scale(1)', opacity: '1' },
					'50%': { transform: 'scale(1.2)', opacity: '0.8' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'field-scroll': 'field-scroll 2s linear infinite',
				'player-glow': 'player-glow 2s ease-in-out infinite',
				'coin-collect': 'coin-collect 0.5s ease-out',
				'lightning-flash': 'lightning-flash 1s ease-in-out infinite',
				'celebration': 'celebration 0.8s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
