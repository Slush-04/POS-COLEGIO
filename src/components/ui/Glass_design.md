# Glass_design.md — ADN DE ESTILO COMPLETO

## SUPERFICIE Y MATERIAL

**Definiendo — Paneles translúcidos esmerilados**
Las superficies son semitransparentes con un fuerte desenfoque de fondo: el contenido detrás es visible, pero suavizado, como el vidrio esmerilado.

**Evitar — Paneles opacos o sin enfoque**
Las tarjetas sólidas (o transparencia sin desenfoque) pierden la lectura helada: la transparencia por sí sola es solo poca opacidad, no vidrio.

The defining signals of glassmorphism: semi-transparent panels with a strong backdrop blur; a vivid gradient or photographic backdrop whose color bleeds through every panel.

## COLOR Y CONTRASTE

**Definiendo — Fondo vívido que se muestra a través de**
Un colorido degradado, foto o aurora se encuentra detrás del cristal; su color sangra a través de cada panel y ES la mayor parte de la paleta.

Keep the backdrop's specific colors and imagery flexible. Preserve readable text over every region the backdrop can produce — add a contrast scrim (e.g. an extra semi-opaque layer between backdrop and content) if needed. Ensure visible controls and focus states.

## GEOMETRÍA Y BORDES

**Definiendo — Borde de luz delgado**
Un borde blanco semitransparente de 1px (a menudo más brillante en la parte superior) atrapa el borde de cada panel, separando el vidrio del vidrio.

A thin 1px semi-transparent white border on each panel edge.

## PROFUNDIDAD Y LUZ

**Definiendo — Profundidad flotante en capas**
Los paneles flotan sobre el telón de fondo y uno encima del otro con sombras suaves y amplias: la pila de sábanas es parte del aspecto.

Layered floating depth with soft wide shadows.

## TIPOGRAFÍA

**Apoyando — Tinta ligera en el vidrio**
El texto y los iconos suelen ser blancos o casi blancos con ligeros pasos de transparencia para la jerarquía.

## IMÁGENES Y ADORNOS

**Variable — ¿Cuál es el telón de fondo?**
Malla degradada, aurora, fotografía o campo de color de marca: cualquier fondo vivo y suave funciona; la receta de vidrio sigue siendo la misma.

## LÍMITES Y DIRECCIÓN

Do not drift into Apple's Liquid Glass. The decisive difference: glassmorphism is a decorative skin for any surface including content cards, while Liquid Glass reserves glass for the floating control layer above content.

Provide `reduced-motion` / `reduced-transparency` fallbacks for accessibility.

## EN CÓDIGO — PUNTOS DE PARTIDA OPCIONALES

El resumen anterior es neutral en cuanto al marco; estas son asas concretas si tu pila coincide.

### Tailwind CSS (variante oscura usada en el proyecto)

```tsx
className="bg-white/[0.045] backdrop-blur-xl border border-white/12 shadow-[0_16px_45px_rgba(0,0,0,0.22)]"
```

### CSS nativo

| Ámbito | Código | Notas |
|---|---|---|
| CSS | `background: rgba(255,255,255,.12); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,.25); border-radius: 16px;` | La receta del panel de vidrio central |
| CSS | `@supports not (backdrop-filter: blur(1px)) { background: rgba(30,30,40,.85); }` | Fallback: sin soporte de desenfoque, vaya casi opaco |
| UI rápida | `.background(.ultraThinMaterial)` | Material del sistema ≈ panel esmerilado (ver también vidrio líquido) |
