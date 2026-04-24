import { HeaderSection } from './components/HeaderSection'
import { TimelinePage } from './components/TimelinePage'
import { profileContent } from './content/profile'
import { KeyboardNavProvider } from './features/keyboard/KeyboardNavProvider'

function App() {
  return (
    <KeyboardNavProvider>
      <div className="app-shell">
        <span className="fat-cursor" aria-hidden="true" />
        <HeaderSection profile={profileContent} />
        <TimelinePage />
      </div>
    </KeyboardNavProvider>
  )
}

export default App
