import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import GalleryPage from './pages/GalleryPage'
import DetailPage from './pages/DetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<GalleryPage />} />
        <Route path="/:slug" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
