import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from "@vercel/analytics/react"
import Header from './components/Header'
import GalleryPage from './pages/GalleryPage'
import DetailPage from './pages/DetailPage'
import { PhotoDataProvider } from './content/PhotoDataProvider'

export default function App() {
  return (
    <PhotoDataProvider>
      <BrowserRouter>
        <Header />
        <Analytics />
        <Routes>
          <Route path="/" element={<GalleryPage />} />
          <Route path="/:slug" element={<DetailPage />} />
        </Routes>
      </BrowserRouter>
    </PhotoDataProvider>
  )
}
