import type { ProfileContent } from '../types/portfolio'

type HeaderSectionProps = {
  profile: ProfileContent
}

export function HeaderSection({ profile }: HeaderSectionProps) {
  return (
    <header className="header-section" aria-label="Profile and contact links">
      <nav className="social-nav" aria-label="Social and contact links">
        {profile.socialLinks.map((socialLink) => (
          <a
            key={socialLink.label}
            href={socialLink.href}
            target={socialLink.href.startsWith('http') ? '_blank' : undefined}
            rel={socialLink.href.startsWith('http') ? 'noreferrer' : undefined}
          >
            {socialLink.label}
          </a>
        ))}
      </nav>

      <div className="intro-layout">
        <div className="intro-copy">
          <p className="kicker">Portfolio</p>
          <h1>{profile.name}</h1>
          <p className="role">{profile.role}</p>
          <p className="bio">{profile.bio}</p>
        </div>
        <div className="profile-photo-wrap">
          <img
            className="profile-photo"
            src="/myface.png"
            alt={profile.imageAlt}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </header>
  )
}
