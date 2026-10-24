export default {
	content: ['./index.html', './src/**/*.{js,jsx}'],
	theme: {
		extend: {
			colors: { forest: '#123d32', mint: '#dff3e7', sand: '#f7f5ef', coral: '#f28b67' },
			boxShadow: { soft: '0 18px 60px rgba(18,61,50,.09)' },
			fontSize: {
				xs: ['0.8125rem', { lineHeight: '1.45' }],
				sm: ['0.9375rem', { lineHeight: '1.55' }],
				base: ['1.0625rem', { lineHeight: '1.65' }],
				lg: ['1.1875rem', { lineHeight: '1.6' }],
			},
		},
	},
	plugins: [],
};