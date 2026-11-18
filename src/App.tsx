import GlobalNav from './sections/GlobalNav'
import StickyNav from './sections/StickyNav'
import Hero from './sections/Hero'
import SeasonPreview from './sections/SeasonPreview'
import MagicWords from './sections/MagicWords'
import SortingHouses from './sections/SortingHouses'
import ProductCarousel from './sections/ProductCarousel'
import { useRevealOnScroll } from './components/useInView'

export default function App() {
  useRevealOnScroll()
  return (
    <>
      <GlobalNav />
      <StickyNav />
      <main>
        <Hero />
        <SeasonPreview />
        <MagicWords />
        <SortingHouses />
        <ProductCarousel />
      </main>
    </>
  )
}
