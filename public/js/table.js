const FEMALE_NAMES = new Set([
  'zeynep', 'ayse', 'fatma', 'elif', 'merve', 'ece', 'selin', 'gizem', 'busra',
  'derya', 'seda', 'ceren', 'irem', 'ebru', 'gamze', 'melis', 'pinar',
  'tugba', 'hande', 'asli', 'burcu', 'damla', 'sinem', 'yasemin',
  'berna', 'kubra', 'hilal', 'melike', 'filiz', 'hulya', 'sevgi', 'songul',
  'ayşe', 'büşra', 'pınar', 'tuğba', 'aslı', 'kübra', 'hülya'
]);

const femaleAvatars = ["\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg0\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#4a154b\"/><stop offset=\"100%\" stop-color=\"#150517\"/></radialGradient>\n        <linearGradient id=\"fskin0\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffdfcc\"/><stop offset=\"100%\" stop-color=\"#f5be9e\"/></linearGradient>\n        <linearGradient id=\"fhair0\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#3d2116\"/><stop offset=\"100%\" stop-color=\"#1c0d07\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg0)\"/>\n      <path d=\"M 24 50 Q 20 85 28 100 L 72 100 Q 80 85 76 50 Z\" fill=\"url(#fhair0)\"/>\n      <path d=\"M 18 100 Q 50 82 82 100 Z\" fill=\"#9f1239\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin0)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"19\" ry=\"21\" fill=\"url(#fskin0)\"/>\n      <path d=\"M 28 44 C 28 20, 72 20, 72 44 C 72 50, 68 54, 68 44 C 65 30, 35 30, 32 44 C 32 54, 28 50, 28 44 Z\" fill=\"url(#fhair0)\"/>\n      <circle cx=\"50\" cy=\"24\" r=\"9\" fill=\"url(#fhair0)\"/>\n      <ellipse cx=\"42\" cy=\"51\" rx=\"3.5\" ry=\"2.2\" fill=\"#1e293b\"/>\n      <circle cx=\"43\" cy=\"50.2\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"51\" rx=\"3.5\" ry=\"2.2\" fill=\"#1e293b\"/>\n      <circle cx=\"59\" cy=\"50.2\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 45 Q 42 42 47 45\" stroke=\"#2c1810\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 45 Q 58 42 63 45\" stroke=\"#2c1810\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#e09e7a\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 43 64 Q 50 62 57 64 Q 50 70 43 64 Z\" fill=\"#e11d48\"/>\n      <circle cx=\"28\" cy=\"56\" r=\"3.5\" fill=\"none\" stroke=\"#fbbf24\" stroke-width=\"1.6\"/>\n      <circle cx=\"72\" cy=\"56\" r=\"3.5\" fill=\"none\" stroke=\"#fbbf24\" stroke-width=\"1.6\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg1\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#064e3b\"/><stop offset=\"100%\" stop-color=\"#021c14\"/></radialGradient>\n        <linearGradient id=\"fskin1\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fef3c7\"/><stop offset=\"100%\" stop-color=\"#fde68a\"/></linearGradient>\n        <linearGradient id=\"fhair1\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fef08a\"/><stop offset=\"100%\" stop-color=\"#ca8a04\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg1)\"/>\n      <path d=\"M 22 45 Q 16 90 28 100 L 72 100 Q 84 90 78 45 Z\" fill=\"url(#fhair1)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#047857\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin1)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin1)\"/>\n      <path d=\"M 28 40 C 28 18, 72 18, 72 40 Q 50 28 28 40 Z\" fill=\"url(#fhair1)\"/>\n      <ellipse cx=\"43\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#0284c7\"/>\n      <circle cx=\"44\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"57\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#0284c7\"/>\n      <circle cx=\"58\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 39 44 Q 43 42 47 44\" stroke=\"#a16207\" stroke-width=\"1.6\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 44 Q 57 42 61 44\" stroke=\"#a16207\" stroke-width=\"1.6\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 51 L 49 56 Q 50 58 52 56\" stroke=\"#d97706\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 61 56 64 Q 50 69 44 64 Z\" fill=\"#f43f5e\"/>\n      <circle cx=\"30\" cy=\"56\" r=\"2.5\" fill=\"#38bdf8\"/>\n      <circle cx=\"70\" cy=\"56\" r=\"2.5\" fill=\"#38bdf8\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg2\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#1e1b4b\"/><stop offset=\"100%\" stop-color=\"#0b0a1a\"/></radialGradient>\n        <linearGradient id=\"fskin2\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffedd5\"/><stop offset=\"100%\" stop-color=\"#fed7aa\"/></linearGradient>\n        <linearGradient id=\"fhair2\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#c2410c\"/><stop offset=\"100%\" stop-color=\"#7c2d12\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg2)\"/>\n      <path d=\"M 22 45 Q 18 90 28 100 L 72 100 Q 82 90 78 45 Z\" fill=\"url(#fhair2)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#6366f1\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin2)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin2)\"/>\n      <path d=\"M 28 40 C 28 18, 72 18, 72 40 Q 50 28 28 40 Z\" fill=\"url(#fhair2)\"/>\n      <rect x=\"35\" y=\"46\" width=\"13\" height=\"9\" rx=\"3\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"1.6\"/>\n      <rect x=\"52\" y=\"46\" width=\"13\" height=\"9\" rx=\"3\" fill=\"none\" stroke=\"#f59e0b\" stroke-width=\"1.6\"/>\n      <line x1=\"48\" y1=\"50\" x2=\"52\" y2=\"50\" stroke=\"#f59e0b\" stroke-width=\"1.6\"/>\n      <ellipse cx=\"41.5\" cy=\"50.5\" rx=\"2.5\" ry=\"1.8\" fill=\"#15803d\"/>\n      <ellipse cx=\"58.5\" cy=\"50.5\" rx=\"2.5\" ry=\"1.8\" fill=\"#15803d\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#c2410c\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 62 56 64 Q 50 68 44 64 Z\" fill=\"#be123c\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg3\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#3b0764\"/><stop offset=\"100%\" stop-color=\"#140224\"/></radialGradient>\n        <linearGradient id=\"fskin3\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffe4e6\"/><stop offset=\"100%\" stop-color=\"#fecdd3\"/></linearGradient>\n        <linearGradient id=\"fhair3\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#27272a\"/><stop offset=\"100%\" stop-color=\"#09090b\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg3)\"/>\n      <circle cx=\"32\" cy=\"28\" r=\"8\" fill=\"url(#fhair3)\"/>\n      <circle cx=\"68\" cy=\"28\" r=\"8\" fill=\"url(#fhair3)\"/>\n      <path d=\"M 22 45 Q 18 90 28 100 L 72 100 Q 82 90 78 45 Z\" fill=\"url(#fhair3)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#ec4899\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin3)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin3)\"/>\n      <path d=\"M 28 38 C 28 18, 72 18, 72 38 Q 50 26 28 38 Z\" fill=\"url(#fhair3)\"/>\n      <ellipse cx=\"42\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#7c2d12\"/>\n      <circle cx=\"43\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#7c2d12\"/>\n      <circle cx=\"59\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 38 45 Q 42 43 46 45\" stroke=\"#18181b\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 54 45 Q 58 43 62 45\" stroke=\"#18181b\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#e11d48\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 43 64 Q 50 62 57 64 Q 50 69 43 64 Z\" fill=\"#db2777\"/>\n      <circle cx=\"28\" cy=\"56\" r=\"3\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.5\"/>\n      <circle cx=\"72\" cy=\"56\" r=\"3\" fill=\"none\" stroke=\"#fff\" stroke-width=\"1.5\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg4\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#1e3a8a\"/><stop offset=\"100%\" stop-color=\"#081433\"/></radialGradient>\n        <linearGradient id=\"fskin4\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fed7aa\"/><stop offset=\"100%\" stop-color=\"#fba86b\"/></linearGradient>\n        <linearGradient id=\"fhair4\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#eab308\"/><stop offset=\"100%\" stop-color=\"#854d0e\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg4)\"/>\n      <path d=\"M 20 42 Q 14 90 28 100 L 72 100 Q 86 90 80 42 Z\" fill=\"url(#fhair4)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#2563eb\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin4)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin4)\"/>\n      <path d=\"M 28 38 C 28 18, 72 18, 72 38 Q 50 28 28 38 Z\" fill=\"url(#fhair4)\"/>\n      <ellipse cx=\"43\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#047857\"/>\n      <circle cx=\"44\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"57\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#047857\"/>\n      <circle cx=\"58\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 38 44 Q 43 42 47 44\" stroke=\"#854d0e\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 44 Q 57 42 62 44\" stroke=\"#854d0e\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#b45309\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 62 56 64 Q 50 69 44 64 Z\" fill=\"#e11d48\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg5\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#4c1d95\"/><stop offset=\"100%\" stop-color=\"#1e0a40\"/></radialGradient>\n        <linearGradient id=\"fskin5\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffedd5\"/><stop offset=\"100%\" stop-color=\"#fed7aa\"/></linearGradient>\n        <linearGradient id=\"fhair5\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#27272a\"/><stop offset=\"100%\" stop-color=\"#0f0f12\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg5)\"/>\n      <path d=\"M 22 45 Q 16 90 28 100 L 72 100 Q 84 90 78 45 Z\" fill=\"url(#fhair5)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#831843\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin5)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin5)\"/>\n      <path d=\"M 28 38 C 28 18, 72 18, 72 38 Q 50 28 28 38 Z\" fill=\"url(#fhair5)\"/>\n      <ellipse cx=\"42\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#1e293b\"/>\n      <circle cx=\"43\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#1e293b\"/>\n      <circle cx=\"59\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 38 44 Q 42 42 46 44\" stroke=\"#18181b\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 54 44 Q 58 42 62 44\" stroke=\"#18181b\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#d97706\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 62 56 64 Q 50 69 44 64 Z\" fill=\"#be123c\"/>\n      <circle cx=\"28\" cy=\"56\" r=\"3\" fill=\"none\" stroke=\"#fbbf24\" stroke-width=\"1.6\"/>\n      <circle cx=\"72\" cy=\"56\" r=\"3\" fill=\"none\" stroke=\"#fbbf24\" stroke-width=\"1.6\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg6\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#0f766e\"/><stop offset=\"100%\" stop-color=\"#042f2e\"/></radialGradient>\n        <linearGradient id=\"fskin6\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffdfcc\"/><stop offset=\"100%\" stop-color=\"#f5be9e\"/></linearGradient>\n        <linearGradient id=\"fhair6\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#1e1b4b\"/><stop offset=\"100%\" stop-color=\"#090817\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg6)\"/>\n      <circle cx=\"50\" cy=\"22\" r=\"10\" fill=\"url(#fhair6)\"/>\n      <path d=\"M 22 45 Q 18 90 28 100 L 72 100 Q 82 90 78 45 Z\" fill=\"url(#fhair6)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#0d9488\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin6)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin6)\"/>\n      <path d=\"M 28 38 C 28 18, 72 18, 72 38 Q 50 26 28 38 Z\" fill=\"url(#fhair6)\"/>\n      <ellipse cx=\"42\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#0284c7\"/>\n      <circle cx=\"43\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#0284c7\"/>\n      <circle cx=\"59\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 38 45 Q 42 43 46 45\" stroke=\"#18181b\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 54 45 Q 58 43 62 45\" stroke=\"#18181b\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#e09e7a\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 62 56 64 Q 50 69 44 64 Z\" fill=\"#f43f5e\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"fbg7\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#831843\"/><stop offset=\"100%\" stop-color=\"#36081a\"/></radialGradient>\n        <linearGradient id=\"fskin7\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffedd5\"/><stop offset=\"100%\" stop-color=\"#fed7aa\"/></linearGradient>\n        <linearGradient id=\"fhair7\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#451a03\"/><stop offset=\"100%\" stop-color=\"#1f0901\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#fbg7)\"/>\n      <path d=\"M 22 45 Q 18 90 28 100 L 72 100 Q 82 90 78 45 Z\" fill=\"url(#fhair7)\"/>\n      <path d=\"M 18 100 Q 50 80 82 100 Z\" fill=\"#d97706\"/>\n      <rect x=\"44\" y=\"68\" width=\"12\" height=\"14\" rx=\"3\" fill=\"url(#fskin7)\"/>\n      <ellipse cx=\"50\" cy=\"52\" rx=\"18\" ry=\"21\" fill=\"url(#fskin7)\"/>\n      <path d=\"M 28 38 C 28 18, 72 18, 72 38 Q 50 28 28 38 Z\" fill=\"url(#fhair7)\"/>\n      <ellipse cx=\"42\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#15803d\"/>\n      <circle cx=\"43\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"50\" rx=\"3.3\" ry=\"2.1\" fill=\"#15803d\"/>\n      <circle cx=\"59\" cy=\"49.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 38 44 Q 42 42 46 44\" stroke=\"#451a03\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 54 44 Q 58 42 62 44\" stroke=\"#451a03\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 52 L 49 57 Q 50 59 52 57\" stroke=\"#b45309\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 62 56 64 Q 50 69 44 64 Z\" fill=\"#e11d48\"/>\n      <circle cx=\"28\" cy=\"56\" r=\"3\" fill=\"none\" stroke=\"#fbbf24\" stroke-width=\"1.6\"/>\n      <circle cx=\"72\" cy=\"56\" r=\"3\" fill=\"none\" stroke=\"#fbbf24\" stroke-width=\"1.6\"/>\n    </svg>"];
const maleAvatars = ["\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg0\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#1e293b\"/><stop offset=\"100%\" stop-color=\"#020617\"/></radialGradient>\n        <linearGradient id=\"mskin0\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fed7aa\"/><stop offset=\"100%\" stop-color=\"#fba86b\"/></linearGradient>\n        <linearGradient id=\"mhair0\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#27272a\"/><stop offset=\"100%\" stop-color=\"#09090b\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg0)\"/>\n      <path d=\"M 16 100 L 34 82 L 66 82 L 84 100 Z\" fill=\"#1e293b\"/>\n      <path d=\"M 42 82 L 50 96 L 58 82 Z\" fill=\"#fff\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"19\" rx=\"3\" fill=\"url(#mskin0)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"20\" ry=\"24\" fill=\"url(#mskin0)\"/>\n      <path d=\"M 28 40 C 28 16, 72 16, 72 40 Q 50 28 28 40 Z\" fill=\"url(#mhair0)\"/>\n      <path d=\"M 32 26 C 45 12, 65 14, 68 26 Z\" fill=\"#3f3f46\"/>\n      <path d=\"M 32 54 C 32 75, 68 75, 68 54 Q 68 71 50 73 Q 32 71 32 54 Z\" fill=\"url(#mhair0)\"/>\n      <ellipse cx=\"41\" cy=\"48\" rx=\"3.5\" ry=\"2.2\" fill=\"#1e293b\"/>\n      <circle cx=\"42\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"59\" cy=\"48\" rx=\"3.5\" ry=\"2.2\" fill=\"#1e293b\"/>\n      <circle cx=\"60\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 35 43 Q 41 40 47 43\" stroke=\"#18181b\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 59 40 65 43\" stroke=\"#18181b\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#ea580c\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 64 Q 50 68 56 64\" stroke=\"#713f12\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg1\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#064e3b\"/><stop offset=\"100%\" stop-color=\"#021f17\"/></radialGradient>\n        <linearGradient id=\"mskin1\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fed7aa\"/><stop offset=\"100%\" stop-color=\"#fba86b\"/></linearGradient>\n        <linearGradient id=\"mhair1\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#451a03\"/><stop offset=\"100%\" stop-color=\"#1f0901\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg1)\"/>\n      <path d=\"M 16 100 Q 50 78 84 100 Z\" fill=\"#047857\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin1)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin1)\"/>\n      <circle cx=\"34\" cy=\"30\" r=\"7\" fill=\"url(#mhair1)\"/>\n      <circle cx=\"44\" cy=\"24\" r=\"8\" fill=\"url(#mhair1)\"/>\n      <circle cx=\"56\" cy=\"24\" r=\"8\" fill=\"url(#mhair1)\"/>\n      <circle cx=\"66\" cy=\"30\" r=\"7\" fill=\"url(#mhair1)\"/>\n      <ellipse cx=\"50\" cy=\"32\" rx=\"18\" ry=\"8\" fill=\"url(#mhair1)\"/>\n      <ellipse cx=\"42\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#15803d\"/>\n      <circle cx=\"43\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#15803d\"/>\n      <circle cx=\"59\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 43 Q 42 40 47 43\" stroke=\"#451a03\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 58 40 63 43\" stroke=\"#451a03\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#b45309\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#7c2d12\" stroke-width=\"2\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg2\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#1e3a8a\"/><stop offset=\"100%\" stop-color=\"#091329\"/></radialGradient>\n        <linearGradient id=\"mskin2\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffedd5\"/><stop offset=\"100%\" stop-color=\"#fed7aa\"/></linearGradient>\n        <linearGradient id=\"mhair2\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#eab308\"/><stop offset=\"100%\" stop-color=\"#a16207\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg2)\"/>\n      <path d=\"M 16 100 L 32 80 L 68 80 L 84 100 Z\" fill=\"#1e293b\"/>\n      <path d=\"M 40 80 L 50 94 L 60 80 Z\" fill=\"#3b82f6\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin2)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin2)\"/>\n      <path d=\"M 29 38 C 29 16, 71 16, 71 38 Q 50 26 29 38 Z\" fill=\"url(#mhair2)\"/>\n      <ellipse cx=\"42\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#0284c7\"/>\n      <circle cx=\"43\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#0284c7\"/>\n      <circle cx=\"59\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 43 Q 42 40 47 43\" stroke=\"#a16207\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 58 40 63 43\" stroke=\"#a16207\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#d97706\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#9a3412\" stroke-width=\"2\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg3\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#991b1b\"/><stop offset=\"100%\" stop-color=\"#3b0808\"/></radialGradient>\n        <linearGradient id=\"mskin3\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fed7aa\"/><stop offset=\"100%\" stop-color=\"#fba86b\"/></linearGradient>\n        <linearGradient id=\"mhair3\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#18181b\"/><stop offset=\"100%\" stop-color=\"#09090b\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg3)\"/>\n      <path d=\"M 16 100 L 32 80 L 68 80 L 84 100 Z\" fill=\"#7f1d1d\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin3)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin3)\"/>\n      <path d=\"M 29 36 C 29 16, 71 16, 71 36 Q 50 24 29 36 Z\" fill=\"url(#mhair3)\"/>\n      <path d=\"M 31 52 C 31 77, 69 77, 69 52 Q 69 72 50 74 Q 31 72 31 52 Z\" fill=\"url(#mhair3)\"/>\n      <ellipse cx=\"42\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#18181b\"/>\n      <circle cx=\"43\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#18181b\"/>\n      <circle cx=\"59\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 43 Q 42 40 47 43\" stroke=\"#18181b\" stroke-width=\"2.4\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 58 40 63 43\" stroke=\"#18181b\" stroke-width=\"2.4\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#ea580c\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#713f12\" stroke-width=\"1.8\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg4\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#581c87\"/><stop offset=\"100%\" stop-color=\"#1f0733\"/></radialGradient>\n        <linearGradient id=\"mskin4\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffedd5\"/><stop offset=\"100%\" stop-color=\"#fed7aa\"/></linearGradient>\n        <linearGradient id=\"mhair4\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#29180f\"/><stop offset=\"100%\" stop-color=\"#0f0703\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg4)\"/>\n      <path d=\"M 16 100 Q 50 78 84 100 Z\" fill=\"#d97706\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin4)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin4)\"/>\n      <circle cx=\"34\" cy=\"28\" r=\"7\" fill=\"url(#mhair4)\"/>\n      <circle cx=\"44\" cy=\"22\" r=\"8\" fill=\"url(#mhair4)\"/>\n      <circle cx=\"56\" cy=\"22\" r=\"8\" fill=\"url(#mhair4)\"/>\n      <circle cx=\"66\" cy=\"28\" r=\"7\" fill=\"url(#mhair4)\"/>\n      <ellipse cx=\"50\" cy=\"30\" rx=\"18\" ry=\"8\" fill=\"url(#mhair4)\"/>\n      <rect x=\"34\" y=\"44\" width=\"14\" height=\"10\" rx=\"3\" fill=\"none\" stroke=\"#18181b\" stroke-width=\"1.8\"/>\n      <rect x=\"52\" y=\"44\" width=\"14\" height=\"10\" rx=\"3\" fill=\"none\" stroke=\"#18181b\" stroke-width=\"1.8\"/>\n      <line x1=\"48\" y1=\"48\" x2=\"52\" y2=\"48\" stroke=\"#18181b\" stroke-width=\"1.8\"/>\n      <ellipse cx=\"41\" cy=\"49\" rx=\"2.5\" ry=\"1.8\" fill=\"#451a03\"/>\n      <ellipse cx=\"59\" cy=\"49\" rx=\"2.5\" ry=\"1.8\" fill=\"#451a03\"/>\n      <path d=\"M 50 51 L 49 56 Q 50 58 52 56\" stroke=\"#b45309\" stroke-width=\"1.2\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#7c2d12\" stroke-width=\"2\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg5\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#0f766e\"/><stop offset=\"100%\" stop-color=\"#042724\"/></radialGradient>\n        <linearGradient id=\"mskin5\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fbd2a4\"/><stop offset=\"100%\" stop-color=\"#f5b376\"/></linearGradient>\n        <linearGradient id=\"mhair5\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#18181b\"/><stop offset=\"100%\" stop-color=\"#09090b\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg5)\"/>\n      <path d=\"M 16 100 Q 50 78 84 100 Z\" fill=\"#0284c7\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin5)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin5)\"/>\n      <path d=\"M 29 38 C 29 16, 71 16, 71 38 Q 50 26 29 38 Z\" fill=\"url(#mhair5)\"/>\n      <polygon points=\"36,24 42,14 48,22\" fill=\"url(#mhair5)\"/>\n      <polygon points=\"46,22 52,12 58,22\" fill=\"url(#mhair5)\"/>\n      <polygon points=\"56,22 62,16 66,26\" fill=\"url(#mhair5)\"/>\n      <ellipse cx=\"42\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#0f172a\"/>\n      <circle cx=\"43\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#0f172a\"/>\n      <circle cx=\"59\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 43 Q 42 40 47 43\" stroke=\"#18181b\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 58 40 63 43\" stroke=\"#18181b\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#ea580c\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#9a3412\" stroke-width=\"2\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg6\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#1e1b4b\"/><stop offset=\"100%\" stop-color=\"#0b0a1a\"/></radialGradient>\n        <linearGradient id=\"mskin6\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#ffedd5\"/><stop offset=\"100%\" stop-color=\"#fed7aa\"/></linearGradient>\n        <linearGradient id=\"mhair6\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#c2410c\"/><stop offset=\"100%\" stop-color=\"#7c2d12\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg6)\"/>\n      <path d=\"M 16 100 Q 50 78 84 100 Z\" fill=\"#4338ca\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin6)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin6)\"/>\n      <path d=\"M 28 38 C 28 16, 72 16, 72 38 Q 50 26 28 38 Z\" fill=\"url(#mhair6)\"/>\n      <ellipse cx=\"42\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#15803d\"/>\n      <circle cx=\"43\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#15803d\"/>\n      <circle cx=\"59\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 43 Q 42 40 47 43\" stroke=\"#7c2d12\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 58 40 63 43\" stroke=\"#7c2d12\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#ea580c\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#9a3412\" stroke-width=\"2\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>","\n    <svg viewBox=\"0 0 100 100\" width=\"100%\" height=\"100%\">\n      <defs>\n        <radialGradient id=\"mbg7\" cx=\"50%\" cy=\"40%\" r=\"60%\"><stop offset=\"0%\" stop-color=\"#312e81\"/><stop offset=\"100%\" stop-color=\"#111033\"/></radialGradient>\n        <linearGradient id=\"mskin7\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#fbd2a4\"/><stop offset=\"100%\" stop-color=\"#f5b376\"/></linearGradient>\n        <linearGradient id=\"mhair7\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0%\" stop-color=\"#18181b\"/><stop offset=\"100%\" stop-color=\"#09090b\"/></linearGradient>\n      </defs>\n      <rect width=\"100\" height=\"100\" fill=\"url(#mbg7)\"/>\n      <path d=\"M 16 100 Q 50 78 84 100 Z\" fill=\"#18181b\"/>\n      <path d=\"M 42 78 Q 50 86 58 78\" stroke=\"#fbbf24\" stroke-width=\"2.2\" fill=\"none\"/>\n      <rect x=\"42\" y=\"65\" width=\"16\" height=\"18\" rx=\"3\" fill=\"url(#mskin7)\"/>\n      <ellipse cx=\"50\" cy=\"50\" rx=\"19\" ry=\"23\" fill=\"url(#mskin7)\"/>\n      <path d=\"M 28 38 C 28 16, 72 16, 72 38 C 72 48, 66 52, 66 44 C 64 30, 36 30, 34 44 C 34 52, 28 48, 28 38 Z\" fill=\"url(#mhair7)\"/>\n      <ellipse cx=\"42\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#0f172a\"/>\n      <circle cx=\"43\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <ellipse cx=\"58\" cy=\"48\" rx=\"3.3\" ry=\"2.1\" fill=\"#0f172a\"/>\n      <circle cx=\"59\" cy=\"47.3\" r=\"1.1\" fill=\"#fff\"/>\n      <path d=\"M 37 43 Q 42 40 47 43\" stroke=\"#18181b\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 53 43 Q 58 40 63 43\" stroke=\"#18181b\" stroke-width=\"2.2\" stroke-linecap=\"round\" fill=\"none\"/>\n      <path d=\"M 50 50 L 49 55 Q 50 57 52 55\" stroke=\"#ea580c\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\"/>\n      <path d=\"M 44 65 Q 50 69 56 65\" stroke=\"#7c2d12\" stroke-width=\"2\" stroke-linecap=\"round\" fill=\"none\"/>\n    </svg>"];

function getPlayerAvatarHTML(name, gender = null, avatarIndex = null) {
  const clean = (name || '').trim().toLowerCase().split(' ')[0];
  const isFemale = (gender === 'female') || FEMALE_NAMES.has(clean);
  const list = isFemale ? femaleAvatars : maleAvatars;

  if (avatarIndex !== null && avatarIndex !== undefined && avatarIndex >= 0 && avatarIndex < list.length) {
    return list[avatarIndex];
  }

  const charCodeSum = (name || 'user').split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const idx = charCodeSum % list.length;
  return list[idx] || list[0];
}

function getPlayerAvatarSVG(name, gender = null, avatarIndex = null) {
  return getPlayerAvatarHTML(name, gender, avatarIndex);
}

window.femaleAvatars = femaleAvatars;
window.maleAvatars = maleAvatars;
window.getPlayerAvatarHTML = getPlayerAvatarHTML;
window.getPlayerAvatarSVG = getPlayerAvatarSVG;

class TableManager {
  constructor(options = {}) {
    this.onDrawDeck = options.onDrawDeck;
    this.onDrawDiscard = options.onDrawDiscard;
    this.onDiscard = options.onDiscard;
    this.onProcessTile = options.onProcessTile;
    this.onProcessTileDragDrop = options.onProcessTileDragDrop;

    this.viewerSeatIndex = 0;
    this.gameState = null;
  }

  setViewerSeatIndex(seatIndex) {
    this.viewerSeatIndex = seatIndex;
  }

  getRelativePosition(seatIndex) {
    const diff = (seatIndex - this.viewerSeatIndex + 4) % 4;
    switch (diff) {
      case 0: return 'bottom';
      case 1: return 'right';
      case 2: return 'top';
      case 3: return 'left';
    }
  }

  update(gameState) {
    this.gameState = gameState;
    this.renderSeats();
    this.renderCenterDeck();
    this.renderDiscards();
    this.renderTableMelds();
  }

  renderSeats() {
    if (!this.gameState || !this.gameState.players) return;

    const positions = ['bottom', 'right', 'top', 'left'];
    const isMyTurn = this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.state === 'PLAYING';

    const istakaBoardEl = document.querySelector('.plus-istaka-board');
    if (istakaBoardEl) {
      istakaBoardEl.classList.toggle('your-turn-active', isMyTurn);
    }
    const istakaEl = document.getElementById('player-istaka-container');
    if (istakaEl) {
      istakaEl.classList.toggle('your-turn-active', isMyTurn);
    }
    const turnBadge = document.getElementById('turn-indicator-badge');
    if (turnBadge) {
      turnBadge.classList.toggle('hidden', !isMyTurn);
    }

    positions.forEach((pos) => {
      const seatEl = document.getElementById('seat-' + pos);
      if (!seatEl) return;

      // Find player mapped to this relative position
      const player = this.gameState.players.find(p => this.getRelativePosition(p.seatIndex) === pos);

      if (player) {
        seatEl.classList.remove('seat-empty');
        const isCurrentTurn = this.gameState.currentTurn === player.seatIndex && this.gameState.state === 'PLAYING';
        seatEl.classList.toggle('active-turn', isCurrentTurn);

        const nameEl = seatEl.querySelector('.player-name');
        if (nameEl) {
          const displayName = (player.isBot && !player.name.includes('(Bot)')) ? `${player.name} (Bot)` : player.name;
          nameEl.textContent = displayName;
        }

        const avatarEl = seatEl.querySelector('.pod-avatar');
        if (avatarEl) {
          avatarEl.innerHTML = getPlayerAvatarHTML(player.name, player.gender);
        }

        const scoreEl = seatEl.querySelector('.player-score');
        if (scoreEl) scoreEl.textContent = '';

        const statusEl = seatEl.querySelector('.player-open-status');
        if (statusEl) {
          if (this.gameState.state === 'WAITING') {
            statusEl.className = 'player-open-status';
            statusEl.textContent = 'Hazır';
          } else if (player.opened) {
            statusEl.className = 'player-open-status opened';
            if (player.openType === 'pairs') {
              statusEl.textContent = (player.openedMeldsCount || 5) + ' Çift Açtı';
            } else {
              statusEl.textContent = player.openedScore ? (player.openedScore + ' Puanla Açtı') : 'Açtı';
            }
          } else {
            statusEl.className = 'player-open-status not-opened';
            statusEl.textContent = 'Açmadı';
          }
        }
      } else {
        // Empty seat waiting for player
        seatEl.classList.add('seat-empty');
        seatEl.classList.remove('active-turn');

        const nameEl = seatEl.querySelector('.player-name');
        if (nameEl) nameEl.textContent = 'Oyuncu Bekleniyor...';

        const avatarEl = seatEl.querySelector('.pod-avatar');
        if (avatarEl) {
          avatarEl.innerHTML = `
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="48" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4 4" stroke-width="2"/>
              <circle cx="50" cy="40" r="16" fill="rgba(255,255,255,0.2)"/>
              <path d="M 24 82 Q 50 64 76 82 Z" fill="rgba(255,255,255,0.2)"/>
            </svg>
          `;
        }

        const statusEl = seatEl.querySelector('.player-open-status');
        if (statusEl) {
          statusEl.className = 'player-open-status';
          statusEl.textContent = 'Boş Koltuk';
        }
      }
    });
  }

  renderCenterDeck() {
    if (!this.gameState) return;

    const deckCountEl = document.getElementById('deck-count');
    if (deckCountEl) {
      deckCountEl.textContent = this.gameState.remainingDeckCount + ' Taş';
    }

    const centerDeckEl = document.getElementById('center-deck-pile');
    const isViewerTurnToDraw = (this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.turnState === 'DRAW');
    if (centerDeckEl) {
      centerDeckEl.draggable = isViewerTurnToDraw;
      centerDeckEl.ondragstart = (e) => {
        e.dataTransfer.setData('text/plain', 'ACTION:DRAW_DECK');
        e.dataTransfer.effectAllowed = 'copyMove';
      };
    }

    const indicatorSlot = document.getElementById('indicator-tile-slot');
    if (indicatorSlot && this.gameState.indicator) {
      indicatorSlot.innerHTML = '';
      const indTile = this.gameState.indicator;
      const tileEl = this.createTileDOM(indTile, true);
      indicatorSlot.appendChild(tileEl);
    }
  }

  renderDiscards() {
    if (!this.gameState || !this.gameState.discards) return;

    for (let i = 0; i < 4; i++) {
      const pos = this.getRelativePosition(i);
      const discardSlot = document.getElementById('discard-pile-' + pos);
      if (!discardSlot) continue;

      discardSlot.innerHTML = '';
      const pile = this.gameState.discards[i];

      if (pile && pile.length > 0) {
        const topTile = pile[pile.length - 1];
        const tileEl = this.createTileDOM(topTile, false);
        discardSlot.appendChild(tileEl);
      }

      const leftPlayerSeat = (this.viewerSeatIndex + 3) % 4;
      const isLeftPlayerDiscard = (i === leftPlayerSeat);
      const isViewerTurnToDraw = (this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.turnState === 'DRAW');

      if (isLeftPlayerDiscard && isViewerTurnToDraw && pile && pile.length > 0) {
        discardSlot.classList.add('can-draw-pulse');
        discardSlot.title = 'Yandan Taş Al (Tıkla veya Istakaya Sürükle)';
        discardSlot.draggable = true;
        discardSlot.ondragstart = (e) => {
          e.dataTransfer.setData('text/plain', 'ACTION:DRAW_DISCARD');
          e.dataTransfer.effectAllowed = 'copyMove';
        };
      } else {
        discardSlot.classList.remove('can-draw-pulse');
        discardSlot.title = '';
        discardSlot.draggable = false;
        discardSlot.ondragstart = null;
      }
    }
  }

  renderTableMelds() {
    const seri1RowsEl = document.getElementById('seri-1-rows');
    const seri2RowsEl = document.getElementById('seri-2-rows');
    const pairs1RowsEl = document.getElementById('pairs-1-rows') || document.getElementById('pairs-rows');
    const pairs2RowsEl = document.getElementById('pairs-2-rows');
    if (!seri1RowsEl || !seri2RowsEl || !pairs1RowsEl || !this.gameState) return;

    seri1RowsEl.innerHTML = '';
    seri2RowsEl.innerHTML = '';
    pairs1RowsEl.innerHTML = '';
    if (pairs2RowsEl) pairs2RowsEl.innerHTML = '';

    const melds = this.gameState.tableMelds || [];
    const seriMelds = melds.filter(m => m.type === 'run' || m.type === 'group');
    const pairMelds = melds.filter(m => m.type === 'pairs');

    const isViewerTurn = (this.gameState.currentTurn === this.viewerSeatIndex && this.gameState.turnState === 'DISCARD');
    const viewerPlayer = this.gameState.players[this.viewerSeatIndex];
    const viewerOpened = viewerPlayer && viewerPlayer.opened;

    // 1. Render Seri Melds: Fill Left 13x13 Panel first, overflow into Right 13x13 Panel
    const MAX_ROWS_PER_PANEL = 13;
    seriMelds.forEach((meld, idx) => {
      const targetContainer = (idx < MAX_ROWS_PER_PANEL) ? seri1RowsEl : seri2RowsEl;

      const meldRow = document.createElement('div');
      meldRow.className = 'table-grid-row meld-row meld-type-' + meld.type;
      meldRow.dataset.meldId = meld.id;

      if (isViewerTurn && viewerOpened) {
        meldRow.title = 'İşlemek istediğiniz taşı bu pere sürükleyip bırakabilirsiniz';
        meldRow.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          meldRow.classList.add('meld-drag-hover');
        });

        meldRow.addEventListener('dragleave', (e) => {
          if (!meldRow.contains(e.relatedTarget)) {
            meldRow.classList.remove('meld-drag-hover');
          }
        });

        meldRow.addEventListener('drop', (e) => {
          e.preventDefault();
          meldRow.classList.remove('meld-drag-hover');
          const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
          if (tileId && !tileId.startsWith('ACTION:')) {
            if (this.onProcessTileDragDrop) {
              this.onProcessTileDragDrop(tileId, meld.id);
            }
          }
        });
      }

      meldRow.addEventListener('click', () => {
        if (isViewerTurn && viewerOpened && this.onProcessTile) {
          this.onProcessTile(meld.id);
        }
      });

      const slotElements = [];
      for (let col = 1; col <= 13; col++) {
        const slot = document.createElement('div');
        slot.className = 'grid-cell-slot col-' + col;
        slot.dataset.col = col;

        if (isViewerTurn && viewerOpened) {
          slot.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            meldRow.classList.add('meld-drag-hover');
          });
          slot.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            meldRow.classList.remove('meld-drag-hover');
            const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
            if (tileId && !tileId.startsWith('ACTION:')) {
              if (this.onProcessTileDragDrop) {
                this.onProcessTileDragDrop(tileId, meld.id);
              }
            }
          });
        }

        slotElements[col] = slot;
        meldRow.appendChild(slot);
      }

      if (meld.type === 'run') {
        const runTiles = [...meld.tiles];
        let startCol = 1;
        const firstNonOkeyIdx = runTiles.findIndex(t => !t.isOkey);
        if (firstNonOkeyIdx !== -1) {
          const firstNonOkeyTile = runTiles[firstNonOkeyIdx];
          const val = firstNonOkeyTile.effectiveValue !== undefined ? firstNonOkeyTile.effectiveValue : firstNonOkeyTile.number;
          startCol = val - firstNonOkeyIdx;
        }
        startCol = Math.max(1, Math.min(13 - runTiles.length + 1, startCol));

        runTiles.forEach((t, i) => {
          const colIndex = startCol + i;
          if (slotElements[colIndex]) {
            slotElements[colIndex].classList.add('has-tile');
            const tileEl = this.createTileDOM(t, false, true);
            slotElements[colIndex].appendChild(tileEl);
          }
        });

      } else if (meld.type === 'group') {
        const firstNonOkeyTile = meld.tiles.find(t => !t.isOkey) || meld.tiles[0];
        const groupNum = firstNonOkeyTile ? (firstNonOkeyTile.effectiveValue !== undefined ? firstNonOkeyTile.effectiveValue : firstNonOkeyTile.number) : 1;
        const startCol = Math.max(1, Math.min(13 - meld.tiles.length + 1, groupNum));

        meld.tiles.forEach((t, i) => {
          const colIndex = startCol + i;
          if (slotElements[colIndex]) {
            slotElements[colIndex].classList.add('has-tile');
            const tileEl = this.createTileDOM(t, false, true);
            slotElements[colIndex].appendChild(tileEl);
          }
        });
      }

      if (meld.tiles && meld.tiles.some(t => t.isOkey)) {
        meldRow.classList.add('contains-okey-stealable');
      }

      targetContainer.appendChild(meldRow);
    });

    // 2. Render Pair Melds on Dual 2x13 Pairs Panels (Sol ve Sağ Çift Bölmeleri)
    const MAX_PAIRS_PER_PANEL = 13;
    pairMelds.forEach((meld, idx) => {
      const targetContainer = (idx < MAX_PAIRS_PER_PANEL || !pairs2RowsEl) ? pairs1RowsEl : pairs2RowsEl;

      const pairBox = document.createElement('div');
      pairBox.className = 'table-pairs-box';
      pairBox.dataset.meldId = meld.id;

      const hasOkey = meld.tiles && meld.tiles.some(t => t.isOkey);
      if (hasOkey) {
        pairBox.classList.add('contains-okey-stealable');
      }

      const tilesRow = document.createElement('div');
      tilesRow.className = 'pairs-tiles-row';

      meld.tiles.forEach((t) => {
        const tileEl = this.createTileDOM(t, false, true);
        tilesRow.appendChild(tileEl);
      });

      pairBox.appendChild(tilesRow);

      if (isViewerTurn && viewerOpened && hasOkey) {
        pairBox.title = 'Aynı taşa sahipseniz Okeyi almak için taşınızı bu çifte sürükleyin';
        pairBox.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          pairBox.classList.add('meld-drag-hover');
        });

        pairBox.addEventListener('dragleave', (e) => {
          if (!pairBox.contains(e.relatedTarget)) {
            pairBox.classList.remove('meld-drag-hover');
          }
        });

        pairBox.addEventListener('drop', (e) => {
          e.preventDefault();
          pairBox.classList.remove('meld-drag-hover');
          const tileId = e.dataTransfer.getData('text/plain') || window.draggedTileId;
          if (tileId && !tileId.startsWith('ACTION:')) {
            if (this.onProcessTileDragDrop) {
              this.onProcessTileDragDrop(tileId, meld.id);
            }
          }
        });

        pairBox.addEventListener('click', () => {
          if (this.onProcessTile) {
            this.onProcessTile(meld.id);
          }
        });
      }

      targetContainer.appendChild(pairBox);
    });
  }

  createTileDOM(tile, isIndicator = false, isSmall = false) {
    const el = document.createElement('div');
    el.className = 'okey-tile color-' + (tile.effectiveColor || tile.color) + (isSmall ? ' tile-small' : '');
    el.dataset.id = tile.id;

    if (tile.isOkey && !isIndicator) el.classList.add('is-okey-joker');
    if (tile.isFake) el.classList.add('is-fake-okey');

    if (tile.isOkey && !isIndicator) {
      // Okey
    } else if (tile.isFake) {
      const numDisplay = document.createElement('span');
      numDisplay.className = 'tile-number';
      numDisplay.innerHTML = '<div class="fake-okey-emblem" title="Sahte Okey"><svg viewBox="0 0 40 40" class="fake-okey-svg"><circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.5" /><circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" stroke-width="1.8" /><polygon points="20,7 23.8,14.7 32.3,15.9 26.2,21.9 27.6,30.3 20,26.3 12.4,30.3 13.8,21.9 7.7,15.9 16.2,14.7" fill="currentColor" /></svg></div>';
      el.appendChild(numDisplay);
    } else {
      const numDisplay = document.createElement('span');
      numDisplay.className = 'tile-number';
      numDisplay.textContent = tile.effectiveValue !== undefined ? tile.effectiveValue : tile.number;

      const dot = document.createElement('span');
      dot.className = 'tile-dot';

      el.appendChild(numDisplay);
      el.appendChild(dot);
    }

    return el;
  }
}

window.TableManager = TableManager;
