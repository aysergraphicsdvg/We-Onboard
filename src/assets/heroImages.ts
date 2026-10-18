// High-fidelity default transparent hero graphics for We Onboard banners
// Each is rendered as a clean, transparent vector graphic that aligns to the bottom of the hero stage.

export const defaultHeroImages: Record<string, string> = {
  rider: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 580" fill="none">
      <defs>
        <linearGradient id="gradSky" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFD014" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#FFA800" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="gradNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#02167F"/>
          <stop offset="100%" stop-color="#0528B5"/>
        </linearGradient>
        <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#D49466"/>
          <stop offset="100%" stop-color="#BA7749"/>
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>

      <!-- Ambient Glow Behind Character -->
      <ellipse cx="270" cy="460" rx="230" ry="80" fill="#FFD014" fill-opacity="0.2" filter="blur(30px)"/>

      <g filter="url(#shadow)">
        <!-- Motorcycle Front Handlebars & Fairing -->
        <path d="M120 480 C150 430, 390 430, 420 480 L440 580 L100 580 Z" fill="#0A0F2D"/>
        <!-- Headlight and accents -->
        <ellipse cx="270" cy="485" rx="55" ry="30" fill="#FFFFFF" fill-opacity="0.95"/>
        <ellipse cx="270" cy="485" rx="42" ry="20" fill="#FFD014" fill-opacity="0.8"/>
        <!-- Windscreen & Handle grips -->
        <path d="M160 440 L80 430 L95 405 L175 425 Z" fill="#1E293B"/>
        <path d="M380 440 L460 430 L445 405 L365 425 Z" fill="#1E293B"/>

        <!-- Delivery Backpack (Behind Shoulders) -->
        <rect x="180" y="240" width="180" height="200" rx="28" fill="#FFD014"/>
        <rect x="200" y="260" width="140" height="160" rx="16" fill="#E5B50A"/>
        <text x="270" y="345" font-family="Inter, sans-serif" font-weight="900" font-size="28" fill="#02167F" text-anchor="middle">weonboard</text>

        <!-- Torso & Branded Delivery Uniform Jacket -->
        <path d="M160 350 C180 280, 230 260, 270 260 C310 260, 360 280, 380 350 L400 500 C370 515, 170 515, 140 500 Z" fill="url(#gradNavy)"/>
        <!-- High-vis reflective neon stripes -->
        <path d="M185 350 L195 470" stroke="#FFD014" stroke-width="12" stroke-linecap="round"/>
        <path d="M355 350 L345 470" stroke="#FFD014" stroke-width="12" stroke-linecap="round"/>
        <!-- Brand Badge on Chest -->
        <rect x="235" y="330" width="70" height="28" rx="8" fill="#FFD014"/>
        <text x="270" y="349" font-family="Inter, sans-serif" font-weight="800" font-size="12" fill="#02167F" text-anchor="middle">VERIFIED</text>

        <!-- Neck -->
        <rect x="245" y="210" width="50" height="55" rx="10" fill="url(#skinGrad)"/>

        <!-- Face / Smiling Rider -->
        <path d="M225 150 C225 110, 315 110, 315 150 C315 205, 225 205, 225 150 Z" fill="url(#skinGrad)"/>
        <!-- Friendly Smile & Eyes -->
        <path d="M245 175 Q270 195 295 175" stroke="#4A2E18" stroke-width="5" stroke-linecap="round" fill="#FFFFFF"/>
        <ellipse cx="250" cy="148" rx="5" ry="6" fill="#2B1808"/>
        <ellipse cx="290" cy="148" rx="5" ry="6" fill="#2B1808"/>
        <path d="M242 138 Q252 133 262 137" stroke="#2B1808" stroke-width="3" stroke-linecap="round"/>
        <path d="M278 137 Q288 133 298 138" stroke="#2B1808" stroke-width="3" stroke-linecap="round"/>

        <!-- Premium Safety Helmet (Navy + Golden Yellow Visor) -->
        <path d="M205 140 C205 60, 335 60, 335 140 C335 160, 330 180, 315 190 L225 190 C210 180, 205 160, 205 140 Z" fill="#02167F"/>
        <!-- Golden Yellow Racing Stripe -->
        <path d="M255 65 C265 60, 275 60, 285 65 L285 130 L255 130 Z" fill="#FFD014"/>
        <!-- Clear / Tinted Visor Open -->
        <path d="M215 110 C215 95, 325 95, 325 110 L320 145 C300 155, 240 155, 220 145 Z" fill="#0F172A" fill-opacity="0.85"/>
        <path d="M225 115 Q270 125 315 115" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" fill="none"/>
      </g>
    </svg>
  `)}`,

  merchant: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 580" fill="none">
      <defs>
        <linearGradient id="mNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#02167F"/>
          <stop offset="100%" stop-color="#0B2FA6"/>
        </linearGradient>
        <filter id="mShadow">
          <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      <ellipse cx="270" cy="480" rx="220" ry="70" fill="#FFD014" fill-opacity="0.25" filter="blur(25px)"/>
      <g filter="url(#mShadow)">
        <!-- Store Counter / POS Desk at Bottom -->
        <rect x="90" y="440" width="360" height="140" rx="18" fill="#0F172A"/>
        <rect x="110" y="460" width="90" height="60" rx="10" fill="#1E293B"/>
        <!-- Digital POS Terminal with QR code -->
        <rect x="310" y="420" width="90" height="85" rx="10" fill="#FFFFFF"/>
        <rect x="325" y="435" width="60" height="40" rx="4" fill="#02167F"/>
        <text x="355" y="460" font-family="Inter, sans-serif" font-weight="900" font-size="11" fill="#FFD014" text-anchor="middle">₹ PAID</text>

        <!-- Merchant Torso (Apron & Shirt) -->
        <path d="M170 340 C190 270, 240 250, 270 250 C300 250, 350 270, 370 340 L385 460 L155 460 Z" fill="#2563EB"/>
        <path d="M210 320 L330 320 L320 460 L220 460 Z" fill="#FFD014"/>
        <text x="270" y="380" font-family="Inter, sans-serif" font-weight="900" font-size="16" fill="#02167F" text-anchor="middle">weonboard</text>
        <text x="270" y="400" font-family="Inter, sans-serif" font-weight="700" font-size="10" fill="#02167F" text-anchor="middle">PARTNER STORE</text>

        <!-- Merchant Head & Friendly Expression -->
        <rect x="250" y="195" width="40" height="55" rx="8" fill="#C9865B"/>
        <ellipse cx="270" cy="155" rx="55" ry="60" fill="#C9865B"/>
        <!-- Hair -->
        <path d="M215 145 C215 90, 325 90, 325 145 C325 155, 310 135, 270 135 C230 135, 215 155, 215 145 Z" fill="#1E1B18"/>
        <!-- Moustache & Warm Smile -->
        <path d="M245 180 Q270 195 295 180" stroke="#1E1B18" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M250 172 Q270 166 290 172" stroke="#1E1B18" stroke-width="5" stroke-linecap="round"/>
        <ellipse cx="250" cy="148" rx="4" ry="5" fill="#1E1B18"/>
        <ellipse cx="290" cy="148" rx="4" ry="5" fill="#1E1B18"/>
      </g>
    </svg>
  `)}`,

  audit: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 580" fill="none">
      <defs>
        <linearGradient id="aGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#02167F"/>
          <stop offset="100%" stop-color="#0D36B8"/>
        </linearGradient>
      </defs>
      <ellipse cx="270" cy="480" rx="210" ry="70" fill="#38BDF8" fill-opacity="0.2" filter="blur(25px)"/>
      <!-- Professional Field Inspector with Digital Inspection Tablet -->
      <path d="M165 340 C185 270, 240 250, 270 250 C300 250, 355 270, 375 340 L395 560 L145 560 Z" fill="url(#aGrad)"/>
      <!-- ID Lanyard -->
      <path d="M245 250 L260 360 L280 360 L295 250" stroke="#FFD014" stroke-width="5" fill="none"/>
      <rect x="252" y="360" width="36" height="50" rx="6" fill="#FFFFFF"/>
      <rect x="257" y="375" width="26" height="18" rx="3" fill="#02167F"/>

      <!-- Digital Audit Tablet held in hands -->
      <rect x="180" y="390" width="180" height="150" rx="14" fill="#0F172A" stroke="#334155" stroke-width="4"/>
      <rect x="195" y="405" width="150" height="110" rx="8" fill="#1E293B"/>
      <!-- Checklist items on screen -->
      <rect x="210" y="420" width="16" height="16" rx="4" fill="#10B981"/>
      <rect x="235" y="424" width="85" height="8" rx="3" fill="#94A3B8"/>
      <rect x="210" y="445" width="16" height="16" rx="4" fill="#10B981"/>
      <rect x="235" y="449" width="70" height="8" rx="3" fill="#94A3B8"/>
      <rect x="210" y="470" width="16" height="16" rx="4" fill="#FFD014"/>
      <rect x="235" y="474" width="60" height="8" rx="3" fill="#94A3B8"/>

      <!-- Head / Face -->
      <rect x="250" y="195" width="40" height="55" rx="8" fill="#DE9B72"/>
      <ellipse cx="270" cy="155" rx="55" ry="60" fill="#DE9B72"/>
      <path d="M215 140 C215 85, 325 85, 325 140 C325 150, 310 120, 270 120 C230 120, 215 150, 215 140 Z" fill="#1E293B"/>
      <ellipse cx="250" cy="150" rx="4" ry="5" fill="#1E293B"/>
      <ellipse cx="290" cy="150" rx="4" ry="5" fill="#1E293B"/>
      <path d="M250 178 Q270 190 290 178" stroke="#1E293B" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    </svg>
  `)}`,

  msme: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 580" fill="none">
      <defs>
        <linearGradient id="msmeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4F46E5"/>
          <stop offset="100%" stop-color="#02167F"/>
        </linearGradient>
      </defs>
      <ellipse cx="270" cy="480" rx="210" ry="70" fill="#818CF8" fill-opacity="0.2" filter="blur(25px)"/>
      <!-- Female Entrepreneur with Business Certificate -->
      <path d="M170 340 C190 270, 240 250, 270 250 C300 250, 350 270, 370 340 L390 560 L150 560 Z" fill="url(#msmeGrad)"/>
      <path d="M230 255 L270 330 L310 255" fill="#FFD014"/>

      <!-- Certificate Board -->
      <rect x="180" y="380" width="180" height="150" rx="14" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4"/>
      <rect x="200" y="400" width="140" height="30" rx="6" fill="#02167F"/>
      <text x="270" y="420" font-family="Inter, sans-serif" font-weight="900" font-size="12" fill="#FFD014" text-anchor="middle">UDYAM / MSME</text>
      <!-- Green Approved Stamp -->
      <circle cx="270" cy="470" r="24" fill="#10B981" fill-opacity="0.15" stroke="#10B981" stroke-width="3"/>
      <path d="M260 470 L267 477 L282 462" stroke="#10B981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Head & Face -->
      <rect x="250" y="195" width="40" height="55" rx="8" fill="#D29062"/>
      <ellipse cx="270" cy="155" rx="52" ry="58" fill="#D29062"/>
      <!-- Hair -->
      <path d="M210 160 C205 90, 335 90, 330 160 C335 220, 320 270, 310 280 C290 260, 290 220, 290 200 L250 200 C250 220, 250 260, 230 280 C220 270, 205 220, 210 160 Z" fill="#1E1B18"/>
      <ellipse cx="250" cy="150" rx="4" ry="5" fill="#1E1B18"/>
      <ellipse cx="290" cy="150" rx="4" ry="5" fill="#1E1B18"/>
      <path d="M250 178 Q270 190 290 178" stroke="#9A3412" stroke-width="3" stroke-linecap="round" fill="none"/>
    </svg>
  `)}`,

  franchise: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 580" fill="none">
      <defs>
        <linearGradient id="fNavy" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#02167F"/>
          <stop offset="100%" stop-color="#0B2FA6"/>
        </linearGradient>
      </defs>
      <ellipse cx="270" cy="480" rx="220" ry="70" fill="#FFD014" fill-opacity="0.2" filter="blur(25px)"/>
      <!-- Executive Business Partner -->
      <path d="M165 330 C185 260, 240 240, 270 240 C300 240, 355 260, 375 330 L395 560 L145 560 Z" fill="url(#fNavy)"/>
      <path d="M245 240 L270 350 L295 240" fill="#FFFFFF"/>
      <path d="M265 250 L275 250 L272 360 L268 360 Z" fill="#FFD014"/>
      
      <!-- Head -->
      <rect x="250" y="190" width="40" height="55" rx="8" fill="#C9865B"/>
      <ellipse cx="270" cy="150" rx="52" ry="56" fill="#C9865B"/>
      <path d="M218 135 C218 80, 322 80, 322 135 C322 145, 305 115, 270 115 C235 115, 218 145, 218 135 Z" fill="#0F172A"/>
      <ellipse cx="250" cy="148" rx="4" ry="5" fill="#0F172A"/>
      <ellipse cx="290" cy="148" rx="4" ry="5" fill="#0F172A"/>
      <path d="M250 174 Q270 186 290 174" stroke="#0F172A" stroke-width="3" stroke-linecap="round" fill="none"/>
    </svg>
  `)}`
};

export function getHeroBannerImage(visualType: string, customUrl?: string): string {
  if (customUrl && customUrl.trim()) {
    return customUrl;
  }
  if (visualType === 'rider-2' || visualType === 'rider') {
    return defaultHeroImages.rider;
  }
  if (visualType === 'merchant') {
    return defaultHeroImages.merchant;
  }
  if (visualType === 'audit') {
    return defaultHeroImages.audit;
  }
  if (visualType === 'msme') {
    return defaultHeroImages.msme;
  }
  return defaultHeroImages.rider;
}
