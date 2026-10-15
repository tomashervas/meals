# 🥗 NutriPlan AI

> **Planificador de comidas, cálculo de macros y balance calórico inteligente impulsado por IA.**

NutriPlan AI es una aplicación web moderna diseñada para la planificación nutricional personalizada y el seguimiento de macronutrientes. Combina la fórmula metabólica científica de **Mifflin-St Jeor** con el poder de **Google Gemini AI** y la base de datos de productos de **OpenFoodFacts**, adaptando raciones y menús según los objetivos del usuario (especialmente optimizado para recomposición corporal).

---

## 🌟 Características Principales

- **🎯 Balance Calórico Diario en Tiempo Real**: Anillo interactivo con seguimiento calórico, margen disponible o exceso calórico, y cálculo de tasa metabólica basal (BMR) y gasto energético total (TDEE).
- **💪 Desglose Científico de Macronutrientes**:
  - Seguimiento en gramos y porcentaje de Proteínas, Carbohidratos y Grasas.
  - Indicador de ingesta de proteína por peso corporal (`g/kg`).
  - Métodos de reparto configurables: **Científico (g/kg)** o **Porcentajes (%)**.
- **⚡ 4 Modos de Objetivos Físicos**:
  - **Recomposición Corporal**: Déficit controlado del 8% con alta proteína (~2.2g/kg) para quemar grasa y construir músculo simultáneamente.
  - **Perder Grasa**: Déficit calórico del 20%.
  - **Mantener Peso**: Calorías de mantenimiento al 100% del TDEE.
  - **Ganar Músculo**: Superávit calórico controlado del 12%.
- **👨‍🍳 Agente IA de Platos Caseros**:
  - Escribe en lenguaje natural lo que sueles comer o cenar (ej. _"Lentejas estofadas, tortilla de atún, arroz al horno"_).
  - La IA calcula sus valores nutricionales por cada 100g, indica la **ración exacta en gramos** para tu objetivo y sugiere trucos de optimización.
  - Se guardan de forma permanente en tu catálogo personal.
- **📅 Menú Semanal & Alternativas Económicas**:
  - Generación de comidas y cenas para los 7 días de la semana (Lunes a Domingo) adaptadas a tus platos habituales.
  - **Modo Ahorro / Cesta de la Compra**: Solicita a la IA alternativas de bajo coste en supermercados españoles manteniendo exactamente las mismas calorías y proteínas.
  - Posibilidad de enviar cualquier plato semanal directamente al registro del día con un solo clic.
- **🔍 Buscador Multicapa de Alimentos**:
  - Catálogo local mediterráneo (BEDCA) con más de 30 alimentos base.
  - Conexión con **OpenFoodFacts** para productos y marcas de supermercado.
  - Respaldo de IA para calcular macros de cualquier alimento o marca al instante.
- **🔒 Privacidad & Persistencia Local**: Todos los datos (perfil, comidas registradas, platos IA y menú semanal) se guardan automáticamente en tu navegador a través de `localStorage`.

---

## 🛠️ Stack Tecnológico

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Empaquetador**: [Vite 8](https://vite.dev/)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com/) con `@tailwindcss/vite`
- **Iconografía**: [Lucide React](https://lucide.dev/)
- **Inteligencia Artificial**: [Google Gemini API](https://ai.google.dev/) (`gemini-3.5-flash-lite`) con generación estructurada en JSON (`responseSchema`)
- **Datos Nutricionales**: [OpenFoodFacts API](https://world.openfoodfacts.org/)

---

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos

- [Node.js](https://nodejs.org/) (versión 18 o superior)
- [pnpm](https://pnpm.io/) (o npm / yarn)
- Una clave de API gratuita de [Google AI Studio](https://aistudio.google.com/)

### 1. Clonar el repositorio y entrar en el directorio

```bash
cd meals-app
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` como `.env`:

```bash
cp .env.example .env
```

Edita el archivo `.env` e introduce tu clave de Google Gemini:

```env
VITE_GEMINI_API_KEY=tu_clave_de_gemini_aqui
GEMINI_API_KEY=tu_clave_de_gemini_aqui
```

### 4. Iniciar el servidor de desarrollo

```bash
pnpm dev
```

Abre tu navegador en [http://localhost:5173/](http://localhost:5173/).

---

## 📋 Scripts Disponibles

- `pnpm dev`: Inicia el servidor de desarrollo de Vite con HMR.
- `pnpm build`: Comprueba los tipos con TypeScript (`tsc -b`) y compila para producción.
- `pnpm preview`: Previsualiza la versión compilada de producción en local.
- `pnpm lint`: Ejecuta el análisis estático de código con ESLint.

---

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT.
