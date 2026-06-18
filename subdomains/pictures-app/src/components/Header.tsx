import { FaInstagram, FaLinkedin } from 'react-icons/fa'

export default function Header() {
  return (
    <header>
      <a
        href="https://benwilcox.dev"
        target="_blank"
        rel="noopener noreferrer"
        className="header-name"
      >
        {'> '}benjamin wilcox
      </a>
      <div className="header-icons">
        <a
          href="https://www.instagram.com/ben_the_user/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <FaInstagram />
        </a>
        <a
          href="https://www.linkedin.com/in/benwilcox2005/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <FaLinkedin />
        </a>
      </div>
    </header>
  )
}
