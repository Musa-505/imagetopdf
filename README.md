# Image to PDF Converter

A React application that converts multiple images into a single PDF file and saves it locally.

## Features

- Upload multiple images at once
- Preview uploaded images
- Remove individual images before conversion
- Convert all images to a single PDF
- Automatically save PDF to your local downloads folder
- Modern, responsive UI

## Installation

1. Install dependencies:
```bash
npm install
```

## Usage

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

3. Click "Choose Images" to upload one or more image files

4. Preview your images and remove any you don't want

5. Click "Convert to PDF" to generate and download the PDF file

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deploy to Netlify

### Option 1: Deploy via Netlify Dashboard

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)

2. Go to [Netlify](https://www.netlify.com/) and sign in

3. Click "Add new site" → "Import an existing project"

4. Connect your Git repository

5. Netlify will automatically detect the build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

6. Click "Deploy site"

### Option 2: Deploy via Netlify CLI

1. Install Netlify CLI globally:
```bash
npm install -g netlify-cli
```

2. Build your project:
```bash
npm run build
```

3. Deploy:
```bash
netlify deploy --prod
```

4. Follow the prompts to link your site or create a new one

The `netlify.toml` file is already configured with the correct build settings.

## Technologies Used

- React 18
- Vite
- jsPDF

